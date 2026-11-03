'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import {
  PlayCircle,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Download,
  Flame,
  AlertOctagon,
  Users,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ExportModal } from '../export-modal';

export default function ExecutionAnalyticsPage() {
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
    data: analytics,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['execution-analytics', projectId, startDate, endDate],
    queryFn: () =>
      defaultApiClient.getDetailedExecutionAnalytics(projectId, {
        startDate,
        endDate,
      }),
    enabled: !!projectId,
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-lg">
              <PlayCircle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Detailed Test Execution Analytics
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Run outcomes, daily trends, flaky test detection, and tester productivity
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
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-semibold shadow-sm'
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
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
          >
            <Download className="h-4 w-4" />
            Export Execution Data
          </button>
        </div>
      </div>

      {/* Summary Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Executions</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {isLoading ? '...' : analytics?.summary?.totalExecutions ?? 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">Attempt records evaluated</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Pass Rate</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {isLoading ? '...' : `${analytics?.summary?.passRate ?? 0}%`}
          </div>
          <p className="text-xs text-slate-500 mt-1">{analytics?.summary?.passed ?? 0} passed tests</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">Fail Rate</span>
          <div className="text-2xl font-bold text-rose-600 mt-1">
            {isLoading ? '...' : `${analytics?.summary?.failureRate ?? 0}%`}
          </div>
          <p className="text-xs text-slate-500 mt-1">{analytics?.summary?.failed ?? 0} failed tests</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">Blocked</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">
            {isLoading ? '...' : analytics?.summary?.blocked ?? 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">Halted due to dependencies</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Avg Duration</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {isLoading ? '...' : `${((analytics?.summary?.avgDurationMs ?? 0) / 1000).toFixed(1)}s`}
          </div>
          <p className="text-xs text-slate-500 mt-1">Per test execution</p>
        </div>
      </div>

      {/* Daily Trends Chart */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
          Daily Execution Outcomes Trend
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Time-series of passed, failed, and blocked execution attempts
        </p>

        {!analytics?.dailyTrends || analytics.dailyTrends.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            <Calendar className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No execution activity in selected date window</p>
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.dailyTrends}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="passed" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} name="Passed" />
                <Area type="monotone" dataKey="failed" stackId="1" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} name="Failed" />
                <Area type="monotone" dataKey="blocked" stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} name="Blocked" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Flaky Test Detection & Consecutive Failures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Flaky Tests */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded-lg">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Flaky Test Detection
                </h3>
                <p className="text-xs text-slate-500">
                  Detected by outcome flip algorithm across consecutive runs
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded">
              {analytics?.flakyTestCandidates?.length ?? 0} Detected
            </span>
          </div>

          {!analytics?.flakyTestCandidates || analytics.flakyTestCandidates.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-80" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No flaky tests detected!</p>
              <p className="text-xs text-slate-500 mt-1">All executions exhibit deterministic status stability.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase">
                    <th className="py-2.5">Test Case</th>
                    <th className="py-2.5 text-center">Attempts</th>
                    <th className="py-2.5 text-center">Pass / Fail</th>
                    <th className="py-2.5 text-right">Flakiness</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {analytics.flakyTestCandidates.map((test) => (
                    <tr key={test.testCaseId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-2.5 pr-2">
                        <div className="font-medium text-slate-900 dark:text-white truncate max-w-[200px]" title={test.testCaseTitle}>
                          {test.testCaseTitle}
                        </div>
                      </td>
                      <td className="py-2.5 text-center text-slate-600 dark:text-slate-300">
                        {test.totalAttempts}
                      </td>
                      <td className="py-2.5 text-center text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {test.passedAttempts} / {test.failedAttempts}
                      </td>
                      <td className="py-2.5 text-right">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          test.flakinessScore >= 50
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        }`}>
                          {test.flakinessScore}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Repeated Consecutive Failures */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 rounded-lg">
                <AlertOctagon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Persistent Failure Streaks
                </h3>
                <p className="text-xs text-slate-500">
                  Test cases with repeated consecutive failures
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded">
              {analytics?.repeatedFailures?.length ?? 0} Streaks
            </span>
          </div>

          {!analytics?.repeatedFailures || analytics.repeatedFailures.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-80" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No repeated failures found</p>
              <p className="text-xs text-slate-500 mt-1">Tests do not exhibit chronic unbroken failure patterns.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase">
                    <th className="py-2.5">Test Case</th>
                    <th className="py-2.5 text-center">Failure Streak</th>
                    <th className="py-2.5 text-right">Last Failure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {analytics.repeatedFailures.map((test) => (
                    <tr key={test.testCaseId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-2.5 pr-2">
                        <div className="font-medium text-slate-900 dark:text-white truncate max-w-[200px]" title={test.testCaseTitle}>
                          {test.testCaseTitle}
                        </div>
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                          {test.consecutiveFailures} in a row
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-xs text-slate-500">
                        {new Date(test.lastFailedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Test Suite Breakdown & Tester Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Suites */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-5 w-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Suite Performance Breakdown
            </h3>
          </div>

          {!analytics?.testSuitePerformance || analytics.testSuitePerformance.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No suite data available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase">
                    <th className="py-2.5">Suite Name</th>
                    <th className="py-2.5 text-center">Total Cases</th>
                    <th className="py-2.5 text-center">Passed</th>
                    <th className="py-2.5 text-right">Pass Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {analytics.testSuitePerformance.map((s) => (
                    <tr key={s.suiteId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-2.5 font-medium text-slate-900 dark:text-white">{s.suiteName}</td>
                      <td className="py-2.5 text-center text-slate-600 dark:text-slate-300">{s.totalCases}</td>
                      <td className="py-2.5 text-center text-emerald-600 font-medium">{s.passed}</td>
                      <td className="py-2.5 text-right font-bold text-slate-900 dark:text-white">{s.passRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Tester Leaderboard */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Tester Activity & Productivity
            </h3>
          </div>

          {!analytics?.testerWorkload || analytics.testerWorkload.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No tester activity recorded</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase">
                    <th className="py-2.5">QA Engineer</th>
                    <th className="py-2.5 text-center">Runs</th>
                    <th className="py-2.5 text-center">Pass / Fail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {analytics.testerWorkload.map((t) => (
                    <tr key={t.testerId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-2.5 font-medium text-slate-900 dark:text-white">{t.testerName}</td>
                      <td className="py-2.5 text-center text-slate-600 dark:text-slate-300">{t.executionsCount}</td>
                      <td className="py-2.5 text-center text-xs text-slate-500">
                        <span className="text-emerald-600 font-semibold">{t.passedCount}</span> / <span className="text-rose-600 font-semibold">{t.failedCount}</span>
                      </td>
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
        defaultReportType="TEST_EXECUTION"
      />
    </div>
  );
}
