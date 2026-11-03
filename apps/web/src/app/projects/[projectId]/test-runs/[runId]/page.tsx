'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import {
  TestRunStatus,
  ExecutionStatus,
  TestRunCaseDto,
} from '@ai-qa/shared-types';
import {
  PlayCircle,
  ArrowLeft,
  Calendar,
  Layers,
  Server,
  User,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  MinusCircle,
  RotateCcw,
  Clock,
  Search,
  Filter,
  BarChart3,
  CheckSquare,
  Play,
  Check,
  AlertTriangle,
  Trash2,
  Sparkles,
} from 'lucide-react';

export default function TestRunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = params.projectId as string;
  const runId = params.runId as string;

  const [activeTab, setActiveTab] = useState<'cases' | 'analytics'>('cases');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  // Fetch Run Details
  const { data: run, isLoading, error } = useQuery({
    queryKey: ['test-run', projectId, runId],
    queryFn: () => defaultApiClient.getTestRun(projectId, runId),
  });

  // Fetch Analytics
  const { data: analytics } = useQuery({
    queryKey: ['execution-analytics', projectId],
    queryFn: () => defaultApiClient.getExecutionAnalytics(projectId),
    enabled: activeTab === 'analytics',
  });

  // Fetch Project Members (for reassigning cases)
  const { data: members } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => defaultApiClient.getProjectMembers(projectId),
  });

  // Status Transition Mutation
  const transitionMutation = useMutation({
    mutationFn: (newStatus: TestRunStatus) =>
      defaultApiClient.transitionRunStatus(projectId, runId, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-run', projectId, runId] });
      queryClient.invalidateQueries({ queryKey: ['test-runs', projectId] });
    },
  });

  // Assign Case Mutation
  const assignCaseMutation = useMutation({
    mutationFn: ({ caseId, assignedToId }: { caseId: string; assignedToId: string | null }) =>
      defaultApiClient.assignRunCases(projectId, runId, {
        testRunCaseIds: [caseId],
        assignedToId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-run', projectId, runId] });
    },
  });

  // Delete Run Mutation
  const deleteMutation = useMutation({
    mutationFn: () => defaultApiClient.deleteTestRun(projectId, runId),
    onSuccess: () => {
      router.push(`/projects/${projectId}/test-runs`);
    },
    onError: (err: any) => {
      alert(err.message || 'Cannot delete test run');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 animate-spin text-emerald-500" />
          <span>Loading execution workbench...</span>
        </div>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="min-h-screen bg-slate-950 p-10 flex flex-col items-center justify-center text-slate-400 gap-4">
        <AlertTriangle className="w-10 h-10 text-rose-400" />
        <p className="text-white text-lg font-semibold">Test run not found</p>
        <Link
          href={`/projects/${projectId}/test-runs`}
          className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-300 hover:text-white"
        >
          Back to Test Runs
        </Link>
      </div>
    );
  }

  const summary = run.summary || {
    total: 0,
    notRun: 0,
    passed: 0,
    failed: 0,
    blocked: 0,
    skipped: 0,
    passPercentage: 0,
    completionPercentage: 0,
  };

  const cases: TestRunCaseDto[] = run.cases || [];

  const filteredCases = cases.filter((c) => {
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const title = c.testCaseVersion?.title?.toLowerCase() || '';
    const key = (c.testCaseVersion?.testCase?.key || '').toLowerCase();
    const query = search.toLowerCase();
    const matchesSearch = !search || title.includes(query) || key.includes(query);
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: ExecutionStatus) => {
    switch (status) {
      case ExecutionStatus.PASSED:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60"><CheckCircle2 className="w-3 h-3" /> PASSED</span>;
      case ExecutionStatus.FAILED:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/60 text-rose-400 border border-rose-800/60"><XCircle className="w-3 h-3" /> FAILED</span>;
      case ExecutionStatus.BLOCKED:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/60 text-amber-400 border border-amber-800/60"><AlertOctagon className="w-3 h-3" /> BLOCKED</span>;
      case ExecutionStatus.SKIPPED:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-900 text-slate-400 border border-slate-800"><MinusCircle className="w-3 h-3" /> SKIPPED</span>;
      case ExecutionStatus.RETEST:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-950/60 text-purple-400 border border-purple-800/60"><RotateCcw className="w-3 h-3" /> RETEST</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-900 text-slate-400 border border-slate-800">NOT RUN</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/projects/${projectId}/test-runs`}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                <span className="font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                  {run.key || `TR-${run.runNumber}`}
                </span>
                <span>/</span>
                <span className="text-emerald-400">Execution Workbench</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
                {run.name}
              </h1>
            </div>
          </div>

          {/* Action Buttons for Run Status */}
          <div className="flex flex-wrap items-center gap-2.5">
            {run.status === TestRunStatus.NOT_STARTED && (
              <button
                onClick={() => transitionMutation.mutate(TestRunStatus.IN_PROGRESS)}
                disabled={transitionMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-all shadow-lg shadow-emerald-600/20"
              >
                <Play className="w-4 h-4 fill-white" />
                Start Test Run
              </button>
            )}

            {run.status === TestRunStatus.IN_PROGRESS && (
              <button
                onClick={() => transitionMutation.mutate(TestRunStatus.COMPLETED)}
                disabled={transitionMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-lg shadow-blue-600/20"
              >
                <Check className="w-4 h-4" />
                Complete Run
              </button>
            )}

            {run.status !== TestRunStatus.ABORTED && run.status !== TestRunStatus.COMPLETED && (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to abort this test run?')) {
                    transitionMutation.mutate(TestRunStatus.ABORTED);
                  }
                }}
                disabled={transitionMutation.isPending}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-rose-400 hover:text-rose-300 font-medium text-xs transition-colors border border-slate-800"
              >
                Abort
              </button>
            )}

            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this test run? This cannot be undone.')) {
                  deleteMutation.mutate();
                }
              }}
              className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors border border-slate-800"
              title="Delete Test Run"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status & Metadata Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-400 block mb-1">Status</span>
            <span className="font-semibold text-white uppercase">{run.status}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-1">Environment</span>
            <span className="font-semibold text-slate-200">
              {run.environment?.name || 'Unspecified'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-1">Milestone</span>
            <span className="font-semibold text-slate-200">
              {run.milestone?.name || 'None'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-1">Lead Tester</span>
            <span className="font-semibold text-slate-200">
              {run.assignedTo ? `${run.assignedTo.firstName} ${run.assignedTo.lastName}` : 'Unassigned'}
            </span>
          </div>
        </div>

        {/* Progress & Summary Bar */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">Execution Progress</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Pass rate calculated strictly on executed test cases.
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-xs text-slate-400 block">Pass Rate</span>
                <span className="text-xl font-bold text-emerald-400">
                  {summary.passPercentage}%
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Completed</span>
                <span className="text-xl font-bold text-blue-400">
                  {summary.completionPercentage}%
                </span>
              </div>
            </div>
          </div>

          {/* Progress Segment Bar */}
          <div className="w-full h-3 rounded-full bg-slate-950 flex overflow-hidden border border-slate-800">
            {summary.passed > 0 && (
              <div
                style={{ width: `${(summary.passed / summary.total) * 100}%` }}
                className="bg-emerald-500 h-full"
                title={`Passed: ${summary.passed}`}
              />
            )}
            {summary.failed > 0 && (
              <div
                style={{ width: `${(summary.failed / summary.total) * 100}%` }}
                className="bg-rose-500 h-full"
                title={`Failed: ${summary.failed}`}
              />
            )}
            {summary.blocked > 0 && (
              <div
                style={{ width: `${(summary.blocked / summary.total) * 100}%` }}
                className="bg-amber-500 h-full"
                title={`Blocked: ${summary.blocked}`}
              />
            )}
            {summary.skipped > 0 && (
              <div
                style={{ width: `${(summary.skipped / summary.total) * 100}%` }}
                className="bg-slate-500 h-full"
                title={`Skipped: ${summary.skipped}`}
              />
            )}
          </div>

          {/* Counts Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium pt-2">
            <span className="text-slate-400">Total: {summary.total}</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Passed: {summary.passed}
            </span>
            <span className="text-rose-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Failed: {summary.failed}
            </span>
            <span className="text-amber-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Blocked: {summary.blocked}
            </span>
            <span className="text-slate-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-500" /> Skipped: {summary.skipped}
            </span>
            <span className="text-slate-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-700" /> Not Run: {summary.notRun}
            </span>
          </div>
        </div>

        {/* Tab Headers */}
        <div className="flex items-center gap-2 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('cases')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'cases'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            Test Cases ({cases.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'analytics'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Execution Analytics & Breakdown
          </button>
        </div>

        {/* TAB 1: TEST CASES LIST */}
        {activeTab === 'cases' && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search test cases in this run..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                {['ALL', 'NOT_RUN', 'PASSED', 'FAILED', 'BLOCKED', 'SKIPPED', 'RETEST'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      statusFilter === status
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Cases Table */}
            {filteredCases.length === 0 ? (
              <div className="text-center py-12 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-slate-500">
                No test cases match the current filter.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCases.map((runCase) => {
                  const tc = runCase.testCaseVersion?.testCase;
                  const latestResult = runCase.latestResult;

                  return (
                    <div
                      key={runCase.id}
                      className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                            {tc?.key || `TC-${tc?.caseNumber}`}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-800/60 text-slate-400">
                            v{runCase.testCaseVersion?.versionNumber || 1}
                          </span>
                          {getStatusBadge(runCase.status)}
                          {latestResult?.attemptNumber && latestResult.attemptNumber > 1 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-950/60 text-purple-300 border border-purple-800/60">
                              Attempt #{latestResult.attemptNumber}
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-semibold text-white truncate">
                          {runCase.testCaseVersion?.title}
                        </h3>

                        {latestResult?.failureReason && (
                          <p className="text-xs text-rose-400 font-medium line-clamp-1 bg-rose-950/20 px-2.5 py-1 rounded-lg border border-rose-900/30">
                            Reason: {latestResult.failureReason}
                          </p>
                        )}
                      </div>

                      {/* Tester Assignment & Execute CTA */}
                      <div className="flex items-center gap-3 shrink-0">
                        <select
                          value={runCase.assignedToId || ''}
                          onChange={(e) =>
                            assignCaseMutation.mutate({
                              caseId: runCase.id,
                              assignedToId: e.target.value || null,
                            })
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="">Unassigned</option>
                          {members?.map((m: any) => (
                            <option key={m.userId} value={m.userId}>
                              {m.user?.firstName} {m.user?.lastName}
                            </option>
                          ))}
                        </select>

                        <Link
                          href={`/projects/${projectId}/test-runs/${runId}/execute/${runCase.id}`}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-md ${
                            runCase.status === ExecutionStatus.NOT_RUN
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                          }`}
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          {runCase.status === ExecutionStatus.NOT_RUN ? 'Execute' : 'Retest / View'}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ANALYTICS & BREAKDOWNS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Suite Breakdown */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  Suite Breakdown
                </h3>
                {!analytics?.bySuite || analytics.bySuite.length === 0 ? (
                  <p className="text-xs text-slate-500">No suite execution data available.</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.bySuite.map((sb) => {
                      const executed = sb.passed + sb.failed + sb.blocked + sb.skipped;
                      const passRate = executed > 0 ? Math.round((sb.passed / executed) * 100) : 0;
                      return (
                        <div key={sb.suiteId} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-300 font-medium">{sb.suiteName}</span>
                            <span className="text-emerald-400 font-bold">{passRate}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${passRate}%` }}
                              className="bg-emerald-500 h-full"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Environment Breakdown */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-400" />
                  Environment Breakdown
                </h3>
                {!analytics?.byEnvironment || analytics.byEnvironment.length === 0 ? (
                  <p className="text-xs text-slate-500">No environment execution data available.</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.byEnvironment.map((eb) => {
                      const executed = eb.passed + eb.failed;
                      const passRate = executed > 0 ? Math.round((eb.passed / executed) * 100) : 0;
                      return (
                        <div key={eb.environmentId} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-950/60">
                          <span className="text-slate-300 font-medium">{eb.environmentName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">{eb.total} cases</span>
                            <span className="font-bold text-emerald-400">{passRate}% pass</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tester Breakdown */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-400" />
                  Tester Workload
                </h3>
                {!analytics?.byTester || analytics.byTester.length === 0 ? (
                  <p className="text-xs text-slate-500">No tester assignment data available.</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.byTester.map((tb) => (
                      <div key={tb.testerId} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-950/60">
                        <span className="text-slate-300 font-medium">{tb.testerName}</span>
                        <span className="text-slate-400">{tb.assignedCount} cases</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity Feed */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                Recent Execution Activity Feed
              </h3>
              {!analytics?.recentActivity || analytics.recentActivity.length === 0 ? (
                <p className="text-xs text-slate-500">No recent executions recorded.</p>
              ) : (
                <div className="space-y-2">
                  {analytics.recentActivity.map((act) => (
                    <div
                      key={act.id}
                      className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusBadge(act.status)}
                        <span className="font-medium text-slate-200">{act.testCaseTitle}</span>
                        <span className="text-slate-500">in {act.testRunName}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-400">
                        <span>{act.testerName}</span>
                        <span>{new Date(act.executedAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
