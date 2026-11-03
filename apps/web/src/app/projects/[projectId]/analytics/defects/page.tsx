'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import {
  Bug,
  Calendar,
  CheckCircle2,
  Clock,
  RotateCcw,
  Link2,
  RefreshCw,
  Download,
  AlertTriangle,
  Layers,
  Server,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { ExportModal } from '../export-modal';

export default function DefectAnalyticsPage() {
  const params = useParams();
  const projectId = (params?.projectId as string) || '';

  const [dateRange, setDateRange] = useState<'7d' | '14d' | '30d' | '90d'>('30d');
  const [isExportOpen, setIsExportOpen] = useState(false);

  const { startDate, endDate } = React.useMemo(() => {
    const end = new Date();
    const start = new Date();
    const days = dateRange === '7d' ? 7 : dateRange === '14d' ? 14 : dateRange === '30d' ? 30 : 90;
    start.setDate(end.getDate() - days);
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }, [dateRange]);

  const {
    data: defects,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['defect-analytics', projectId, startDate, endDate],
    queryFn: () =>
      defaultApiClient.getDetailedDefectAnalytics(projectId, {
        startDate,
        endDate,
      }),
    enabled: !!projectId,
  });

  const agingData = React.useMemo(() => {
    if (!defects?.defectAging) return [];
    return defects.defectAging.map((bucket) => ({
      range: bucket.ageBucket,
      count: bucket.count,
    }));
  }, [defects]);

  const severityData = React.useMemo(() => {
    if (!defects?.severityDistribution) return [];
    const colors: Record<string, string> = {
      CRITICAL: '#DC2626',
      HIGH: '#EA580C',
      MEDIUM: '#FBBF24',
      LOW: '#3B82F6',
    };
    return defects.severityDistribution
      .filter((d) => d.count > 0)
      .map((d) => ({
        name: d.severity,
        value: d.count,
        color: colors[d.severity] || '#6B7280',
      }));
  }, [defects]);

  const priorityData = React.useMemo(() => {
    if (!defects?.priorityDistribution) return [];
    const colors: Record<string, string> = {
      P1: '#DC2626',
      P2: '#EA580C',
      P3: '#FBBF24',
      P4: '#10B981',
    };
    return defects.priorityDistribution
      .filter((p) => p.count > 0)
      .map((p) => ({
        name: p.priority,
        value: p.count,
        color: colors[p.priority] || '#6B7280',
      }));
  }, [defects]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 rounded-lg">
              <Bug className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Defect & Bug Analytics
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Aging analysis, resolution speed, reopen frequency, and traceability rates
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1 text-xs font-medium">
            {(['7d', '14d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  dateRange === range
                    ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 font-semibold shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                {range === '7d' ? 'Last 7d' : range === '14d' ? 'Last 14d' : range === '30d' ? 'Last 30d' : 'Last 90d'}
              </button>
            ))}
          </div>

          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors"
          >
            <Download className="h-4 w-4" />
            Export Defect Data
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">Open Defects</span>
          <div className="text-2xl font-bold text-rose-600 mt-1">
            {isLoading ? '...' : defects?.summary?.openCount ?? 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">Total unresolved</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Resolved</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {isLoading ? '...' : defects?.summary?.totalResolved ?? 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">Fixed and closed</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Created</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {isLoading ? '...' : defects?.summary?.totalCreated ?? 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">All reported issues</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Avg Resolution</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {isLoading ? '...' : `${defects?.summary?.avgResolutionHours ?? 0}h`}
          </div>
          <p className="text-xs text-slate-500 mt-1">Mean time to repair</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">Reopen Rate</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">
            {isLoading ? '...' : `${defects?.summary?.reopenRate ?? 0}%`}
          </div>
          <p className="text-xs text-slate-500 mt-1">Reopened tickets</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">Traceability</span>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {isLoading ? '...' : `${defects?.traceability?.testTraceabilityRate ?? 0}%`}
          </div>
          <p className="text-xs text-slate-500 mt-1">Linked to test runs</p>
        </div>
      </div>

      {/* Defect Aging & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aging Analysis Bar Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-amber-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Defect Aging Distribution
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Duration active defects have remained open without resolution
          </p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingData}>
                <XAxis dataKey="range" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#EA580C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Distribution Donut */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Defect Severity Distribution
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Proportion of defects categorized by impact level
          </p>

          {severityData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <CheckCircle2 className="h-8 w-8 mb-2 opacity-50 text-emerald-500" />
              <p className="text-sm">Zero defects recorded</p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Component & Environment Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Component Breakdown */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Defects by Component
            </h3>
          </div>

          {!defects?.defectsByComponent || defects.defectsByComponent.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No component data recorded</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase">
                    <th className="py-2.5">Component</th>
                    <th className="py-2.5 text-center">Open</th>
                    <th className="py-2.5 text-center">Closed</th>
                    <th className="py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {defects.defectsByComponent.map((c) => (
                    <tr key={c.component} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-2.5 font-medium text-slate-900 dark:text-white">{c.component}</td>
                      <td className="py-2.5 text-center font-semibold text-rose-600">{c.open}</td>
                      <td className="py-2.5 text-center font-semibold text-emerald-600">{c.closed}</td>
                      <td className="py-2.5 text-right font-bold text-slate-900 dark:text-white">{c.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Environment Breakdown */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Server className="h-5 w-5 text-cyan-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Defects by Environment
            </h3>
          </div>

          {!defects?.defectsByEnvironment || defects.defectsByEnvironment.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No environment data recorded</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase">
                    <th className="py-2.5">Environment</th>
                    <th className="py-2.5 text-center">Open</th>
                    <th className="py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {defects.defectsByEnvironment.map((e) => (
                    <tr key={e.environmentName} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-2.5 font-medium text-slate-900 dark:text-white">{e.environmentName}</td>
                      <td className="py-2.5 text-center font-semibold text-rose-600">{e.open}</td>
                      <td className="py-2.5 text-right font-bold text-slate-900 dark:text-white">{e.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        projectId={projectId}
        defaultReportType="DEFECT_SUMMARY"
      />
    </div>
  );
}
