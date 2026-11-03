'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Coins,
  ThumbsUp,
  ThumbsDown,
  Star,
  RefreshCw,
  Download,
  Server,
  Layers,
  Cpu,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';
import { ExportModal } from '../export-modal';

export default function AIAnalyticsPage() {
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
    data: ai,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['ai-analytics', projectId, startDate, endDate],
    queryFn: () =>
      defaultApiClient.getAIAnalytics(projectId, {
        startDate,
        endDate,
      }),
    enabled: !!projectId,
  });

  const reviewStatusData = React.useMemo(() => {
    if (!ai?.summary) return [];
    return [
      { name: 'Accepted', value: ai.summary.acceptedCases, color: '#10B981' },
      { name: 'Rejected', value: ai.summary.rejectedCases, color: '#EF4444' },
      {
        name: 'Pending Review',
        value: Math.max(
          0,
          ai.summary.totalProposedCases -
            (ai.summary.acceptedCases + ai.summary.rejectedCases)
        ),
        color: '#F59E0B',
      },
    ].filter((item) => item.value > 0);
  }, [ai]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded-lg">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                AI Intelligence & Efficiency Analytics
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                AI generation volume, human acceptance rates, token consumption, and cost telemetry
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
                    ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 font-semibold shadow-sm'
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
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors"
          >
            <Download className="h-4 w-4" />
            Export AI Telemetry
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-600">Generations</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {isLoading ? '...' : ai?.summary?.totalGenerations ?? 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">AI operations invoked</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Acceptance Rate</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {isLoading ? '...' : `${ai?.summary?.humanAcceptanceRate ?? 0}%`}
          </div>
          <p className="text-xs text-slate-500 mt-1">{ai?.summary?.acceptedCases ?? 0} accepted by QA</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">Tokens Used</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {isLoading ? '...' : (ai?.summary?.totalTokensConsumed ?? 0).toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-1">Prompt & completion</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Estimated Cost</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            ${isLoading ? '...' : (ai?.summary?.estimatedTotalCost ?? 0).toFixed(4)}
          </div>
          <p className="text-xs text-slate-500 mt-1">USD billed model usage</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">Satisfaction Rate</span>
          <div className="text-2xl font-bold text-amber-600 mt-1 flex items-center gap-1">
            <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
            {isLoading ? '...' : `${ai?.userFeedbackSummary?.satisfactionRate ?? 0}%`}
          </div>
          <p className="text-xs text-slate-500 mt-1">{ai?.userFeedbackSummary?.totalRatings ?? 0} reviews received</p>
        </div>
      </div>

      {/* Review Status Donut & User Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Review Status Donut */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Human Review & Acceptance
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Validation distribution of AI-proposed artifacts
          </p>

          {reviewStatusData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <Sparkles className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No review data in this period</p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reviewStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {reviewStatusData.map((entry, index) => (
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

        {/* User Satisfaction Scorecard */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ThumbsUp className="h-5 w-5 text-purple-600" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                QA Team Feedback & Satisfaction
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Subjective engineer ratings on AI analysis accuracy and utility
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-lg">
                  <ThumbsUp className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    {ai?.userFeedbackSummary?.helpfulCount ?? 0}
                  </div>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
                    Rated Helpful
                  </div>
                </div>
              </div>

              <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-3">
                <div className="p-2.5 bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-lg">
                  <ThumbsDown className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                    {ai?.userFeedbackSummary?.notHelpfulCount ?? 0}
                  </div>
                  <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase">
                    Needs Improvement
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl mt-4 text-xs text-slate-600 dark:text-slate-300">
            High human acceptance demonstrates confidence in AI-generated test scenarios and RCA classifications.
          </div>
        </div>
      </div>

      {/* Task & Provider Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Breakdown */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-5 w-5 text-purple-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              AI Operations by Feature
            </h3>
          </div>

          {!ai?.taskBreakdown || ai.taskBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No AI feature activity recorded</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase">
                    <th className="py-2.5">Feature</th>
                    <th className="py-2.5 text-center">Count</th>
                    <th className="py-2.5 text-center">Tokens</th>
                    <th className="py-2.5 text-right">Cost ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {ai.taskBreakdown.map((task: any) => (
                    <tr key={task.taskType} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-2.5 font-medium text-slate-900 dark:text-white">{task.taskType}</td>
                      <td className="py-2.5 text-center text-slate-600 dark:text-slate-300">{task.count}</td>
                      <td className="py-2.5 text-center font-mono text-xs">{task.tokens.toLocaleString()}</td>
                      <td className="py-2.5 text-right font-bold text-purple-600">${task.cost.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Provider Breakdown */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Server className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              LLM Provider & Model Telemetry
            </h3>
          </div>

          {!ai?.providerBreakdown || ai.providerBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No provider usage recorded</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase">
                    <th className="py-2.5">Provider / Model</th>
                    <th className="py-2.5 text-center">Calls</th>
                    <th className="py-2.5 text-center">Tokens</th>
                    <th className="py-2.5 text-right">Est. Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {ai.providerBreakdown.map((p: any) => (
                    <tr key={`${p.provider}-${p.model}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-2.5 font-medium text-slate-900 dark:text-white">
                        {p.provider} ({p.model})
                      </td>
                      <td className="py-2.5 text-center text-slate-600 dark:text-slate-300">{p.calls}</td>
                      <td className="py-2.5 text-center font-mono text-xs">{p.tokens.toLocaleString()}</td>
                      <td className="py-2.5 text-right font-bold text-slate-900 dark:text-white">
                        ${p.cost.toFixed(4)}
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
        defaultReportType="AI_USAGE"
      />
    </div>
  );
}
