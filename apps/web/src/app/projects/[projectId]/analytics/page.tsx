'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  Layers,
  Bug,
  Sparkles,
  ArrowRight,
  Target,
  Minus,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import Link from 'next/link';
import { ExportModal } from './export-modal';

export default function ExecutiveAnalyticsPage() {
  const params = useParams();
  const projectId = (params?.projectId as string) || '';

  const [dateRange, setDateRange] = useState<'7d' | '14d' | '30d' | '90d'>('30d');
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Compute dates based on range
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
    data: metrics,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['executive-analytics', projectId, startDate, endDate],
    queryFn: () =>
      defaultApiClient.getExecutiveAnalytics(projectId, {
        startDate,
        endDate,
      }),
    enabled: !!projectId,
  });

  const executionPieData = React.useMemo(() => {
    if (!metrics) return [];
    return [
      { name: 'Passed', value: metrics.passedTests, color: '#10B981' },
      { name: 'Failed', value: metrics.failedTests, color: '#EF4444' },
      { name: 'Blocked', value: metrics.blockedTests, color: '#F59E0B' },
      { name: 'Skipped', value: metrics.skippedTests, color: '#6B7280' },
    ].filter((item) => item.value > 0);
  }, [metrics]);

  const defectBarData = React.useMemo(() => {
    if (!metrics) return [];
    return [
      {
        severity: 'Critical',
        count: metrics.criticalDefects,
        color: '#DC2626',
      },
      {
        severity: 'High',
        count: metrics.highDefects,
        color: '#EA580C',
      },
      {
        severity: 'Open',
        count: metrics.openDefects,
        color: '#3B82F6',
      },
    ];
  }, [metrics]);

  const getAdvisoryBadge = (status: string) => {
    switch (status) {
      case 'READY':
        return {
          label: 'READY FOR RELEASE',
          icon: ShieldCheck,
          badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
          bgClass: 'from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/10',
          textClass: 'text-emerald-700 dark:text-emerald-400',
        };
      case 'WARNING':
        return {
          label: 'NEEDS REVIEW / WARNING',
          icon: AlertTriangle,
          badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 dark:border-amber-700',
          bgClass: 'from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/10',
          textClass: 'text-amber-700 dark:text-amber-400',
        };
      default:
        return {
          label: 'BLOCKED / NOT READY',
          icon: ShieldAlert,
          badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-300 dark:border-rose-700',
          bgClass: 'from-rose-50 to-rose-100/50 dark:from-rose-950/30 dark:to-rose-900/10',
          textClass: 'text-rose-700 dark:text-rose-400',
        };
    }
  };

  const renderDelta = (delta?: number, isPositiveGood: boolean = true) => {
    if (delta === undefined || delta === null) return null;
    if (delta === 0) {
      return (
        <span className="inline-flex items-center text-xs text-slate-500 ml-2">
          <Minus className="h-3 w-3 mr-0.5" /> 0% vs prev
        </span>
      );
    }
    const isGood = isPositiveGood ? delta > 0 : delta < 0;
    const Icon = delta > 0 ? TrendingUp : TrendingDown;
    return (
      <span
        className={`inline-flex items-center text-xs font-semibold ml-2 ${
          isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
        }`}
      >
        <Icon className="h-3 w-3 mr-0.5" />
        {delta > 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
      </span>
    );
  };

  const advisory = getAdvisoryBadge(metrics?.releaseReadinessStatus || 'NOT_READY');
  const AdvisoryIcon = advisory.icon;

  return (
    <div className="space-y-6">
      {/* Top Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-lg">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Executive QA Dashboard
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Enterprise quality metrics, release health indicators, and historical trends
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date range selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1 text-xs font-medium">
            {(['7d', '14d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  dateRange === range
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-semibold shadow-sm'
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
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Release Readiness Advisory Banner */}
      <div className={`p-6 rounded-xl border bg-gradient-to-r ${advisory.bgClass} border-slate-200 dark:border-slate-700 shadow-sm`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl border ${advisory.badgeClass}`}>
              <AdvisoryIcon className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Release Readiness Advisory
                </h2>
                <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${advisory.badgeClass}`}>
                  {advisory.label}
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
                Evaluates real-time test pass rate, critical blocker defects, execution coverage, and quality gate rules.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                Readiness Score
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                {isLoading ? '...' : `${metrics?.releaseReadinessScore ?? 0}%`}
              </div>
            </div>
            <Link
              href={`/projects/${projectId}/analytics/milestones`}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm transition-colors"
            >
              <Target className="h-4 w-4" />
              View Quality Gates
            </Link>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pass Rate */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Test Pass Rate</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {isLoading ? '...' : `${metrics?.passRate ?? 0}%`}
            </span>
            {renderDelta(metrics?.previousPeriodTrends?.passRateDelta, true)}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex justify-between">
            <span>Passed: {metrics?.passedTests ?? 0}</span>
            <span>Failed: {metrics?.failedTests ?? 0}</span>
          </div>
        </div>

        {/* Test Coverage */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Execution Coverage</span>
            <Layers className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {isLoading ? '...' : `${metrics?.testCoveragePercentage ?? 0}%`}
            </span>
            {renderDelta(metrics?.previousPeriodTrends?.coverageDelta, true)}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex justify-between">
            <span>Executions: {metrics?.totalExecutions ?? 0}</span>
            <span>Active: {metrics?.activeTestCases ?? 0}</span>
          </div>
        </div>

        {/* Open Defects */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Open Defects</span>
            <Bug className="h-4 w-4 text-rose-600" />
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {isLoading ? '...' : metrics?.openDefects ?? 0}
            </span>
            {renderDelta(metrics?.previousPeriodTrends?.defectDelta, false)}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex justify-between">
            <span className="text-rose-600 font-medium">Critical: {metrics?.criticalDefects ?? 0}</span>
            <span className="text-orange-600 font-medium">High: {metrics?.highDefects ?? 0}</span>
          </div>
        </div>

        {/* Defect Resolution */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Defect Resolution Rate</span>
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {isLoading ? '...' : `${metrics?.defectResolutionRate ?? 0}%`}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-2 flex justify-between">
            <span>Automation Pass: {metrics?.automationPassRate ?? 0}%</span>
            <span>Auto Runs: {metrics?.automationExecutions ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Execution Distribution Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Test Execution Distribution
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Breakdown of test run results in selected period
              </p>
            </div>
            <Link
              href={`/projects/${projectId}/analytics/executions`}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Details <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {executionPieData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <Calendar className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No test executions found in this period</p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={executionPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {executionPieData.map((entry, index) => (
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

        {/* Defect Severity Breakdown Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Defect Severity Breakdown
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Active defects categorized by operational impact
              </p>
            </div>
            <Link
              href={`/projects/${projectId}/analytics/defects`}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Details <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {defectBarData.every((d) => d.count === 0) ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <Bug className="h-8 w-8 mb-2 opacity-50 text-emerald-500" />
              <p className="text-sm">Zero open defects recorded!</p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={defectBarData}>
                  <XAxis dataKey="severity" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Secondary Highlights: Automation & AI Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Automation Health Card */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 rounded-lg">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  CI/CD Automation Health
                </h3>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded">
                M08 Integrated
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Automated session runs, Playwright / Newman reporters, and continuous integration outcomes.
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div className="text-xs text-slate-500">Automated Runs</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">
                  {metrics?.automationExecutions ?? 0}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div className="text-xs text-slate-500">Automated Pass Rate</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">
                  {metrics?.automationPassRate ?? 0}%
                </div>
              </div>
            </div>
          </div>
          <Link
            href={`/projects/${projectId}/analytics/automation`}
            className="mt-4 flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 rounded-lg transition-colors"
          >
            Explore Automation Analytics <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* AI QA Intelligence Card */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded-lg">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  AI Intelligence & Efficiency
                </h3>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                M07 Integrated
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              AI-generated test cases, failure root cause analyses, duplicate detections, and model telemetry.
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div className="text-xs text-slate-500">Active Milestones</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">
                  {metrics?.activeMilestones ?? 0}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div className="text-xs text-slate-500">Completed Milestones</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">
                  {metrics?.completedMilestones ?? 0}
                </div>
              </div>
            </div>
          </div>
          <Link
            href={`/projects/${projectId}/analytics/ai`}
            className="mt-4 flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-lg transition-colors"
          >
            Explore AI Intelligence Analytics <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        projectId={projectId}
        defaultReportType="EXECUTIVE_SUMMARY"
      />
    </div>
  );
}
