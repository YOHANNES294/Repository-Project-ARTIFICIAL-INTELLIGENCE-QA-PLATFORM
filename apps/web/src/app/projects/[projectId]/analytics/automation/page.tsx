'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import {
  Cpu,
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  GitBranch,
  Globe,
  RefreshCw,
  Download,
  Flame,
  Terminal,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { ExportModal } from '../export-modal';

export default function AutomationAnalyticsPage() {
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
    data: automation,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['automation-analytics', projectId, startDate, endDate],
    queryFn: () =>
      defaultApiClient.getAutomationAnalytics(projectId, {
        startDate,
        endDate,
      }),
    enabled: !!projectId,
  });

  const browserData = React.useMemo(() => {
    if (!automation?.browserBreakdown) return [];
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
    return automation.browserBreakdown.map((b, idx) => ({
      name: b.browser || 'Unknown',
      value: b.executions,
      color: colors[idx % colors.length],
    }));
  }, [automation]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 rounded-lg">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                CI/CD Automation Analytics
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Playwright & Newman session ingestion, automated test outcomes, and CI pipelines
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
                    ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 font-semibold shadow-sm'
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
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg shadow-sm transition-colors"
          >
            <Download className="h-4 w-4" />
            Export Automation Data
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sessions</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {isLoading ? '...' : automation?.summary?.totalSessions ?? 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">Total CI runs ingested</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-600">Automated Tests</span>
          <div className="text-2xl font-bold text-cyan-600 mt-1">
            {isLoading ? '...' : automation?.summary?.totalTestsExecuted ?? 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">Individual test cases executed</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Real Pass Rate</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {isLoading ? '...' : `${automation?.summary?.passRate ?? 0}%`}
          </div>
          <p className="text-xs text-slate-500 mt-1">{automation?.summary?.passedTests ?? 0} tests passed</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">Fail Rate</span>
          <div className="text-2xl font-bold text-rose-600 mt-1">
            {isLoading
              ? '...'
              : `${(
                  100 - (automation?.summary?.passRate ?? 100)
                ).toFixed(1)}%`}
          </div>
          <p className="text-xs text-slate-500 mt-1">{automation?.summary?.failedTests ?? 0} tests failed</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Avg Duration</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {isLoading ? '...' : `${((automation?.summary?.avgDurationMs ?? 0) / 1000).toFixed(1)}s`}
          </div>
          <p className="text-xs text-slate-500 mt-1">Session execution time</p>
        </div>
      </div>

      {/* Framework & Browser Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Framework Distribution */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="h-5 w-5 text-cyan-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Automation Framework Distribution
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Test sessions grouped by testing framework
          </p>

          {!automation?.frameworkDistribution || automation.frameworkDistribution.length === 0 ? (
            <p className="text-sm text-slate-400 py-12 text-center">No framework activity recorded</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={automation.frameworkDistribution}>
                  <XAxis dataKey="framework" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="executions" fill="#06B6D4" radius={[4, 4, 0, 0]} name="Executions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Browser Breakdown */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Browser Target Breakdown
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Executed browser matrices across runs
          </p>

          {browserData.length === 0 ? (
            <p className="text-sm text-slate-400 py-12 text-center">No browser data recorded</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={browserData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {browserData.map((entry, index) => (
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

      {/* CI Provider Breakdown */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="h-5 w-5 text-cyan-600" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            CI / CD Provider Integrations
          </h3>
        </div>

        {!automation?.ciProviderBreakdown || automation.ciProviderBreakdown.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">No CI providers recorded</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-2.5">CI Provider</th>
                  <th className="py-2.5 text-center">Total Sessions</th>
                  <th className="py-2.5 text-center">Successful</th>
                  <th className="py-2.5 text-center">Failed</th>
                  <th className="py-2.5 text-right">Pass Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {automation.ciProviderBreakdown.map((ci) => (
                  <tr key={ci.provider} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="py-2.5 font-medium text-slate-900 dark:text-white">{ci.provider}</td>
                    <td className="py-2.5 text-center text-slate-600 dark:text-slate-300">{ci.sessionsCount}</td>
                    <td className="py-2.5 text-center font-medium text-emerald-600">{ci.successfulSessions}</td>
                    <td className="py-2.5 text-center font-medium text-rose-600">{ci.failedSessions}</td>
                    <td className="py-2.5 text-right font-bold text-emerald-600">
                      {ci.sessionsCount > 0 ? ((ci.successfulSessions / ci.sessionsCount) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        projectId={projectId}
        defaultReportType="AUTOMATION_METRICS"
      />
    </div>
  );
}
