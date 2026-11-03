'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import {
  PlayCircle,
  ArrowLeft,
  GitBranch,
  Terminal,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';

export default function AutomationSessionsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['automation-sessions', projectId, page, statusFilter],
    queryFn: () =>
      defaultApiClient.getAutomationSessions(projectId, {
        page,
        limit: 20,
        status: statusFilter || undefined,
      }),
  });

  const sessions = sessionsData?.sessions || [];
  const meta = sessionsData?.meta;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}/automation`}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PlayCircle className="h-6 w-6 text-cyan-600" />
              Automated Execution Sessions
            </h1>
            <p className="text-sm text-slate-500">
              Complete history of automated test runs, CI triggers, retry attempts and results
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-sm py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
            <option value="INGESTING">Ingesting</option>
            <option value="ABORTED">Aborted</option>
          </select>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading execution sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="p-4 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-full w-fit mx-auto">
              <PlayCircle className="h-8 w-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              No Execution Sessions Found
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Run automated tests with Playwright or Postman to record execution sessions.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs uppercase font-medium">
                <tr>
                  <th className="px-5 py-3">Framework</th>
                  <th className="px-5 py-3">Run Name & CI Context</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Results Breakdown</th>
                  <th className="px-5 py-3">Duration</th>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3 text-right">Linked TestRun</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                        <Terminal className="h-3 w-3" />
                        {s.framework}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {s.testRun?.name || `Session ${s.id.substring(0, 8)}`}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                        {s.ciProvider && (
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {s.ciProvider}
                          </span>
                        )}
                        {s.gitBranch && (
                          <span className="flex items-center gap-1">
                            <GitBranch className="h-3 w-3" />
                            {s.gitBranch}
                          </span>
                        )}
                        {s.gitCommitSha && (
                          <span className="font-mono text-slate-400">
                            #{s.gitCommitSha.substring(0, 7)}
                          </span>
                        )}
                        {s.pullRequestNumber && (
                          <span className="text-cyan-600 font-semibold">PR #{s.pullRequestNumber}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          s.status === 'COMPLETED'
                            ? s.failedTests === 0
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                            : s.status === 'FAILED'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                        }`}
                      >
                        {s.status === 'COMPLETED' ? (
                          s.failedTests === 0 ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )
                        ) : (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        {s.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-emerald-600 font-semibold">{s.passedTests} passed</span>
                        {s.failedTests > 0 && (
                          <span className="text-rose-600 font-semibold">{s.failedTests} failed</span>
                        )}
                        {s.skippedTests > 0 && (
                          <span className="text-slate-400">{s.skippedTests} skipped</span>
                        )}
                      </div>
                      {/* Mini progress bar */}
                      {s.totalTests > 0 && (
                        <div className="w-28 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden flex mt-1.5">
                          <div
                            style={{ width: `${(s.passedTests / s.totalTests) * 100}%` }}
                            className="bg-emerald-500"
                          />
                          <div
                            style={{ width: `${(s.failedTests / s.totalTests) * 100}%` }}
                            className="bg-rose-500"
                          />
                          <div
                            style={{ width: `${(s.skippedTests / s.totalTests) * 100}%` }}
                            className="bg-slate-400"
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {(s.durationMs / 1000).toFixed(1)}s
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {new Date(s.startedAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {s.testRunId ? (
                        <Link
                          href={`/projects/${projectId}/test-runs/${s.testRunId}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 hover:text-cyan-700 hover:underline"
                        >
                          Run #{s.testRun?.runNumber || ''}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs text-slate-500">
            <div>
              Page {meta.page} of {meta.totalPages} ({meta.total} total sessions)
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
