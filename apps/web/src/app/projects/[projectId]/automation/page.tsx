'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import {
  Cpu,
  Key,
  Link2,
  HelpCircle,
  PlayCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  GitBranch,
  Terminal,
  Clock,
  Layers,
  BookOpen,
  RefreshCw,
} from 'lucide-react';

export default function AutomationOverviewPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const {
    data: overview,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['automation-overview', projectId],
    queryFn: () => defaultApiClient.getAutomationOverview(projectId),
  });

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
                Automation & CI/CD Hub
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Playwright reporter, Newman ingestion, API tokens & automated test mapping
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            href={`/projects/${projectId}/automation/tokens`}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg shadow-sm transition-colors"
          >
            <Key className="h-4 w-4" />
            Manage API Tokens
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Automated Sessions</span>
            <Layers className="h-4 w-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {isLoading ? '...' : overview?.totalSessions ?? 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">Total CI executions processed</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active API Tokens</span>
            <Key className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {isLoading ? '...' : overview?.activeTokens ?? 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">Scoped CI/CD credentials</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Mapped Tests</span>
            <Link2 className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {isLoading ? '...' : overview?.totalMappings ?? 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">Automated to platform test cases</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Unmapped Tests</span>
            <HelpCircle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {isLoading ? '...' : overview?.totalUnmapped ?? 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">Pending review & association</p>
        </div>
      </div>

      {/* Navigation Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          href={`/projects/${projectId}/automation/sessions`}
          className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-cyan-500 hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              <PlayCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Execution Sessions</h3>
              <p className="text-xs text-slate-500">History, logs & retry traces</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-cyan-600 transition-colors" />
        </Link>

        <Link
          href={`/projects/${projectId}/automation/mappings`}
          className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-cyan-500 hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
              <Link2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Test Mappings</h3>
              <p className="text-xs text-slate-500">Link tests to TestCases</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-cyan-600 transition-colors" />
        </Link>

        <Link
          href={`/projects/${projectId}/automation/unmapped`}
          className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-cyan-500 hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Unmapped Tests</h3>
              <p className="text-xs text-slate-500">Review & resolve new tests</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-cyan-600 transition-colors" />
        </Link>

        <Link
          href={`/projects/${projectId}/automation/setup`}
          className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-cyan-500 hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Setup Guides</h3>
              <p className="text-xs text-slate-500">Playwright, Newman & CI</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-cyan-600 transition-colors" />
        </Link>
      </div>

      {/* Recent Sessions Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Automation Sessions</h2>
            <p className="text-xs text-slate-500">Real-time external test executions from CI/CD runners</p>
          </div>
          <Link
            href={`/projects/${projectId}/automation/sessions`}
            className="text-sm font-medium text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading automation telemetry...</div>
        ) : !overview?.recentSessions || overview.recentSessions.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="p-4 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-full w-fit mx-auto">
              <Terminal className="h-8 w-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              No Automated Executions Yet
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Configure the Playwright custom reporter or run Postman/Newman in your CI/CD pipeline to stream test executions into this project.
            </p>
            <Link
              href={`/projects/${projectId}/automation/setup`}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg"
            >
              <BookOpen className="h-4 w-4" />
              View Integration Setup Guide
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs uppercase font-medium">
                <tr>
                  <th className="px-5 py-3">Framework</th>
                  <th className="px-5 py-3">Run Name / Branch</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Results</th>
                  <th className="px-5 py-3">Duration</th>
                  <th className="px-5 py-3">Executed</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {overview.recentSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                        <Terminal className="h-3 w-3" />
                        {session.framework}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {session.testRun?.name || `Session ${session.id.substring(0, 8)}`}
                      </div>
                      {session.gitBranch && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                          <GitBranch className="h-3 w-3" />
                          <span>{session.gitBranch}</span>
                          {session.gitCommitSha && (
                            <span className="font-mono text-slate-400">
                              ({session.gitCommitSha.substring(0, 7)})
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          session.status === 'COMPLETED'
                            ? session.failedTests === 0
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                            : session.status === 'FAILED'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                        }`}
                      >
                        {session.status === 'COMPLETED' ? (
                          session.failedTests === 0 ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )
                        ) : (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        {session.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-emerald-600 font-semibold">{session.passedTests} passed</span>
                        {session.failedTests > 0 && (
                          <span className="text-rose-600 font-semibold">{session.failedTests} failed</span>
                        )}
                        {session.skippedTests > 0 && (
                          <span className="text-slate-400">{session.skippedTests} skipped</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {(session.durationMs / 1000).toFixed(1)}s
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {new Date(session.startedAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {session.testRunId ? (
                        <Link
                          href={`/projects/${projectId}/test-runs/${session.testRunId}`}
                          className="text-xs font-medium text-cyan-600 hover:text-cyan-700 hover:underline"
                        >
                          View TestRun
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400">Processing</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
