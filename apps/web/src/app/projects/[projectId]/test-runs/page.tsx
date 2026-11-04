'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import { TestRunStatus, TestRunDto } from '@ai-qa/shared-types';
import {
  PlayCircle,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Clock,
  ArrowLeft,
  ChevronRight,
  User,
  Sliders,
  Server,
  Trash2,
} from 'lucide-react';

export default function TestRunsPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const projectId = params.projectId as string;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Fetch Project
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => defaultApiClient.getProject(projectId),
  });

  // Fetch Test Runs
  const { data, isLoading } = useQuery({
    queryKey: ['test-runs', projectId, search, statusFilter],
    queryFn: () =>
      defaultApiClient.getTestRuns(projectId, {
        search: search || undefined,
        status: (statusFilter as TestRunStatus) || undefined,
      }),
  });

  const testRuns: TestRunDto[] = Array.isArray(data) ? data : ((data as any)?.testRuns || []);

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (runId: string) => defaultApiClient.deleteTestRun(projectId, runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-runs', projectId] });
    },
  });

  const getStatusBadge = (status: TestRunStatus) => {
    switch (status) {
      case TestRunStatus.NOT_STARTED:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">NOT STARTED</span>;
      case TestRunStatus.IN_PROGRESS:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-900/40 text-amber-300 border border-amber-700/50 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />IN PROGRESS</span>;
      case TestRunStatus.COMPLETED:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-900/40 text-emerald-300 border border-emerald-700/50">COMPLETED</span>;
      case TestRunStatus.ABORTED:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-900/40 text-rose-300 border border-rose-700/50">ABORTED</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/projects/${projectId}`}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                <span>{project?.name || 'Project'}</span>
                <span>/</span>
                <span className="text-emerald-400">Execution</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
                <PlayCircle className="w-7 h-7 text-emerald-400" />
                Test Runs & Executions
              </h1>
            </div>
          </div>

          <Link
            href={`/projects/${projectId}/test-runs/new`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-all shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            New Test Run
          </Link>
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-sm flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search test runs by name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="">All Statuses</option>
              <option value={TestRunStatus.NOT_STARTED}>Not Started</option>
              <option value={TestRunStatus.IN_PROGRESS}>In Progress</option>
              <option value={TestRunStatus.COMPLETED}>Completed</option>
              <option value={TestRunStatus.ABORTED}>Aborted</option>
            </select>
          </div>
        </div>

        {/* Test Runs List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-32 bg-slate-900/40 rounded-2xl animate-pulse border border-slate-800/60" />
            ))}
          </div>
        ) : testRuns.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800">
            <PlayCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300">No test runs found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
              Create an execution run from your test plans or test cases to execute tests, log actual results, and track software quality.
            </p>
            <Link
              href={`/projects/${projectId}/test-runs/new`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-all shadow-md shadow-emerald-600/20"
            >
              <Plus className="w-4 h-4" />
              Create First Test Run
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {testRuns.map((run) => {
              const summary = run.summary || {
                total: 0,
                passed: 0,
                failed: 0,
                blocked: 0,
                skipped: 0,
                notRun: 0,
                passPercentage: 0,
                completionPercentage: 0,
              };

              return (
                <div
                  key={run.id}
                  className="bg-slate-900/50 rounded-2xl border border-slate-800/80 hover:border-slate-700/80 transition-all p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:shadow-xl hover:shadow-emerald-950/10"
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold tracking-wider text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-800/40">
                        {run.key}
                      </span>
                      {getStatusBadge(run.status)}
                      {run.environment && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Server className="w-3 h-3 text-slate-500" />
                          {run.environment.name}
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/projects/${projectId}/test-runs/${run.id}`}
                      className="block text-lg font-semibold text-white group-hover:text-emerald-300 transition-colors"
                    >
                      {run.name}
                    </Link>

                    {run.description && (
                      <p className="text-xs text-slate-400 line-clamp-1">{run.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      {run.testPlan && (
                        <span>
                          Plan: <span className="text-slate-300">{run.testPlan.name}</span>
                        </span>
                      )}
                      {run.assignedTo && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {run.assignedTo.firstName} {run.assignedTo.lastName}
                        </span>
                      )}
                      <span>
                        Created: {new Date(run.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Progress & Metrics */}
                  <div className="w-full md:w-80 flex flex-col justify-center space-y-2 pt-4 md:pt-0 border-t md:border-t-0 border-slate-800">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Completion:</span>
                      <span className="text-white font-bold">{summary.completionPercentage}%</span>
                    </div>

                    {/* Multi-segment progress bar */}
                    <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                      {summary.total > 0 && (
                        <>
                          <div
                            style={{ width: `${(summary.passed / summary.total) * 100}%` }}
                            className="bg-emerald-500 h-full"
                            title={`Passed: ${summary.passed}`}
                          />
                          <div
                            style={{ width: `${(summary.failed / summary.total) * 100}%` }}
                            className="bg-rose-500 h-full"
                            title={`Failed: ${summary.failed}`}
                          />
                          <div
                            style={{ width: `${(summary.blocked / summary.total) * 100}%` }}
                            className="bg-amber-500 h-full"
                            title={`Blocked: ${summary.blocked}`}
                          />
                          <div
                            style={{ width: `${(summary.skipped / summary.total) * 100}%` }}
                            className="bg-slate-500 h-full"
                            title={`Skipped: ${summary.skipped}`}
                          />
                        </>
                      )}
                    </div>

                    {/* Breakdown Badges */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span className="text-emerald-400 font-semibold">{summary.passed} Passed</span>
                      <span className="text-rose-400 font-semibold">{summary.failed} Failed</span>
                      <span className="text-amber-400 font-semibold">{summary.blocked} Blocked</span>
                      <span className="text-slate-500 font-medium">{summary.notRun} Not Run</span>
                    </div>
                  </div>

                  {/* Action Link */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <Link
                      href={`/projects/${projectId}/test-runs/${run.id}`}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700/60"
                    >
                      <span>Open Run</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
