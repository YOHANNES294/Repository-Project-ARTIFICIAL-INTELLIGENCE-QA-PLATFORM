'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import Link from 'next/link';
import {
  FileText,
  ArrowLeft,
  Play,
  Camera,
  Download,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Code,
} from 'lucide-react';
import { ExportModal } from '../../export-modal';

export default function ViewReportDefinitionPage() {
  const params = useParams();
  const projectId = (params?.projectId as string) || '';
  const reportId = (params?.reportId as string) || '';
  const queryClient = useQueryClient();

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  // Fetch definition
  const { data: reportDef, isLoading: isDefLoading } = useQuery({
    queryKey: ['report-definition', projectId, reportId],
    queryFn: () => defaultApiClient.getReportDefinition(projectId, reportId),
    enabled: !!projectId && !!reportId,
  });

  // Run live report data
  const {
    data: liveReportData,
    isLoading: isRunning,
    refetch: runReportAgain,
    isRefetching,
  } = useQuery({
    queryKey: ['run-report', projectId, reportDef?.type, reportDef?.filters],
    queryFn: () =>
      defaultApiClient.runReport(projectId, {
        reportType: reportDef!.type,
        filters: (reportDef?.filters as Record<string, unknown>) || {},
      }),
    enabled: !!reportDef?.type,
  });

  // Snapshot mutation
  const snapshotMutation = useMutation({
    mutationFn: async () => {
      const snapshotName = `${reportDef?.name} Snapshot (${new Date().toLocaleDateString()})`;
      return defaultApiClient.createReportSnapshot(projectId, {
        reportDefId: reportId,
        name: snapshotName,
        type: reportDef?.type,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-snapshots', projectId] });
      alert('Frozen snapshot created successfully!');
    },
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <Link
            href={`/projects/${projectId}/analytics/reports`}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Reports Hub
          </Link>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-lg">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {isDefLoading ? 'Loading...' : reportDef?.name}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {reportDef?.description || `Live execution of ${reportDef?.type}`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => runReportAgain()}
            disabled={isRefetching || isRunning}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching || isRunning ? 'animate-spin' : ''}`} />
            Run Live Report
          </button>

          <button
            onClick={() => snapshotMutation.mutate()}
            disabled={snapshotMutation.isPending || !liveReportData}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
          >
            <Camera className="h-4 w-4" />
            {snapshotMutation.isPending ? 'Freezing...' : 'Take Snapshot'}
          </button>

          <button
            onClick={() => setIsExportOpen(true)}
            disabled={!liveReportData}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export Live Report
          </button>
        </div>
      </div>

      {/* Report Metadata Info Card */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Report Type</span>
            <div className="font-mono font-medium text-slate-900 dark:text-white mt-0.5">
              {reportDef?.type}
            </div>
          </div>
          <div className="border-l border-slate-200 dark:border-slate-700 pl-4">
            <span className="text-xs font-semibold text-slate-400 uppercase">Metrics Tracked</span>
            <div className="font-medium text-slate-900 dark:text-white mt-0.5">
              {reportDef?.metrics?.length ?? 0} custom metrics
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowRawJson(!showRawJson)}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <Code className="h-4 w-4" />
          {showRawJson ? 'Hide Raw JSON' : 'View Raw JSON Data'}
        </button>
      </div>

      {/* Raw JSON toggle */}
      {showRawJson && (
        <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-96">
          <pre>{JSON.stringify(liveReportData, null, 2)}</pre>
        </div>
      )}

      {/* Live Data Presentation */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Aggregated Live Results
        </h3>

        {isRunning ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="h-8 w-8 mx-auto animate-spin mb-2" />
            <p className="text-sm">Calculating aggregations across database records...</p>
          </div>
        ) : !liveReportData ? (
          <p className="text-sm text-slate-500 py-6 text-center">No live data returned for this query</p>
        ) : (
          <div className="space-y-4">
            {/* Display formatted summary cards depending on data shape */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(liveReportData)
                .filter(([_, val]) => typeof val === 'number' || typeof val === 'string')
                .slice(0, 8)
                .map(([key, val]) => (
                  <div
                    key={key}
                    className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {String(val)}
                    </div>
                  </div>
                ))}
            </div>

            {/* If there are nested objects or arrays */}
            {Object.entries(liveReportData)
              .filter(([_, val]) => Array.isArray(val) && val.length > 0)
              .map(([sectionKey, rows]: [string, any]) => (
                <div key={sectionKey} className="mt-6">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                    {sectionKey.replace(/([A-Z])/g, ' $1')}
                  </h4>
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700">
                          {Object.keys(rows[0] || {}).map((col) => (
                            <th key={col} className="py-2.5 px-3">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {rows.slice(0, 15).map((row: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                            {Object.values(row).map((val: any, cidx: number) => (
                              <td key={cidx} className="py-2.5 px-3 text-xs text-slate-800 dark:text-slate-200">
                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        projectId={projectId}
        defaultReportType={reportDef?.type || 'EXECUTIVE_SUMMARY'}
      />
    </div>
  );
}
