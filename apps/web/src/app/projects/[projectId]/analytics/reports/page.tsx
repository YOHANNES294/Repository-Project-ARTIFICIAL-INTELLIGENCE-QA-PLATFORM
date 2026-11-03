'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Play,
  Camera,
  Calendar,
  Download,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { ExportModal } from '../export-modal';

export default function ReportsHubPage() {
  const params = useParams();
  const projectId = (params?.projectId as string) || '';
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'definitions' | 'snapshots' | 'schedules'>('definitions');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportReportType, setExportReportType] = useState('EXECUTIVE_SUMMARY');

  // Queries
  const { data: reportDefinitions, isLoading: isDefLoading, refetch: refetchDef } = useQuery({
    queryKey: ['report-definitions', projectId],
    queryFn: () => defaultApiClient.getReportDefinitions(projectId),
    enabled: !!projectId,
  });

  const { data: reportSnapshots, isLoading: isSnapLoading, refetch: refetchSnap } = useQuery({
    queryKey: ['report-snapshots', projectId],
    queryFn: () => defaultApiClient.getReportSnapshots(projectId),
    enabled: !!projectId,
  });

  const { data: reportSchedules, isLoading: isSchedLoading, refetch: refetchSched } = useQuery({
    queryKey: ['report-schedules', projectId],
    queryFn: () => defaultApiClient.getReportSchedules(projectId),
    enabled: !!projectId,
  });

  // Delete definition mutation
  const deleteDefMutation = useMutation({
    mutationFn: (reportId: string) => defaultApiClient.deleteReportDefinition(projectId, reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-definitions', projectId] });
    },
  });

  // Trigger schedule mutation
  const triggerSchedMutation = useMutation({
    mutationFn: (scheduleId: string) => defaultApiClient.triggerReportSchedule(projectId, scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-snapshots', projectId] });
      alert('Report schedule triggered! Snapshot generated.');
    },
  });

  // Delete schedule mutation
  const deleteSchedMutation = useMutation({
    mutationFn: (scheduleId: string) => defaultApiClient.deleteReportSchedule(projectId, scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules', projectId] });
    },
  });

  const handleQuickExport = (type: string) => {
    setExportReportType(type);
    setIsExportOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-lg">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Reports & Export Engine
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Custom report builder, immutable historical snapshots, automated schedules, and multi-format exports
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/projects/${projectId}/analytics/reports/new`}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Report Definition
          </Link>
        </div>
      </div>

      {/* Quick Export Cards */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
          Instant Export Toolkit (CSV, Excel, PDF)
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          One-click downloads protected with OWASP formula injection defense (CWE-1236)
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { type: 'EXECUTIVE_SUMMARY', label: 'Executive Summary', icon: FileText, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' },
            { type: 'TEST_EXECUTION', label: 'Test Execution', icon: Play, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
            { type: 'DEFECT_SUMMARY', label: 'Defects & Bugs', icon: AlertCircle, color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/30' },
            { type: 'COVERAGE_MATRIX', label: 'Coverage Matrix', icon: CheckCircle2, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' },
            { type: 'AUTOMATION_METRICS', label: 'Automation CI/CD', icon: FileSpreadsheet, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/30' },
            { type: 'QUALITY_GATE_AUDIT', label: 'Quality Gate Audit', icon: Clock, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.type}
                onClick={() => handleQuickExport(item.type)}
                className="flex flex-col items-center text-center p-3 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl transition-all hover:shadow-sm"
              >
                <div className={`p-2.5 rounded-lg mb-2 ${item.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.label}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-0.5">
                  <Download className="h-2.5 w-2.5" /> Export
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-4">
        <button
          onClick={() => setActiveTab('definitions')}
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 -mb-px ${
            activeTab === 'definitions'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="h-4 w-4" />
          Custom Report Definitions ({reportDefinitions?.length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab('snapshots')}
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 -mb-px ${
            activeTab === 'snapshots'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Camera className="h-4 w-4" />
          Historical Snapshots ({reportSnapshots?.length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab('schedules')}
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 -mb-px ${
            activeTab === 'schedules'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Scheduled Reports ({reportSchedules?.length ?? 0})
        </button>
      </div>

      {/* Tab 1: Definitions */}
      {activeTab === 'definitions' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {!reportDefinitions || reportDefinitions.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                No custom report definitions yet
              </p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Define tailored report templates with specific metrics, filters, and recurring schedules.
              </p>
              <Link
                href={`/projects/${projectId}/analytics/reports/new`}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Create First Report
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/60">
                    <th className="py-3 px-4">Report Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Last Updated</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {reportDefinitions.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-3 px-4">
                        <Link
                          href={`/projects/${projectId}/analytics/reports/${report.id}`}
                          className="font-medium text-blue-600 hover:underline flex items-center gap-1.5"
                        >
                          {report.name}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                        {report.description && (
                          <p className="text-xs text-slate-500 truncate max-w-sm">{report.description}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {report.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {new Date(report.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/projects/${projectId}/analytics/reports/${report.id}`}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                            title="Run Report"
                          >
                            <Play className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => {
                              if (confirm(`Delete report definition "${report.name}"?`)) {
                                deleteDefMutation.mutate(report.id);
                              }
                            }}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-md transition-colors"
                            title="Delete Report"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Snapshots */}
      {activeTab === 'snapshots' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {!reportSnapshots || reportSnapshots.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Camera className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                No frozen snapshots created yet
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Snapshots freeze analytics data at a specific point in time for compliance audits and release sign-offs.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/60">
                    <th className="py-3 px-4">Snapshot Name</th>
                    <th className="py-3 px-4">Report Type</th>
                    <th className="py-3 px-4">Frozen At</th>
                    <th className="py-3 px-4">Summary Metrics</th>
                    <th className="py-3 px-4 text-right">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {reportSnapshots.map((snap) => (
                    <tr key={snap.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                        {snap.name || 'Snapshot'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-xs font-mono bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {snap.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {new Date(snap.generatedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 font-mono">
                        {snap.summary ? JSON.stringify(snap.summary).slice(0, 40) + '...' : 'Snapshot data'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleQuickExport(snap.type)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                        >
                          <Download className="h-3 w-3" />
                          Export
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Schedules */}
      {activeTab === 'schedules' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {!reportSchedules || reportSchedules.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                No active report schedules
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Configure automated recurring report snapshots for your project.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/60">
                    <th className="py-3 px-4">Schedule</th>
                    <th className="py-3 px-4">Frequency</th>
                    <th className="py-3 px-4">Recipients</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {reportSchedules.map((sched) => (
                    <tr key={sched.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                        {sched.name || sched.reportDef?.name || 'Scheduled Report'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                          {sched.frequency}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {sched.recipients.join(', ') || 'Project Members'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          sched.isActive
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700'
                        }`}>
                          {sched.isActive ? 'ACTIVE' : 'PAUSED'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => triggerSchedMutation.mutate(sched.id)}
                            disabled={triggerSchedMutation.isPending}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                            title="Trigger Now"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this report schedule?')) {
                                deleteSchedMutation.mutate(sched.id);
                              }
                            }}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-md transition-colors"
                            title="Delete Schedule"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        projectId={projectId}
        defaultReportType={exportReportType}
      />
    </div>
  );
}
