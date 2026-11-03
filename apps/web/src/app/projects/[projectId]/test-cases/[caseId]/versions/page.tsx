'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import { TestCaseVersionDto } from '@ai-qa/shared-types';
import {
  History,
  ArrowLeft,
  GitCompare,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  FileText,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function TestCaseVersionsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const caseId = params.caseId as string;

  // Selected comparison versions
  const [selectedV1, setSelectedV1] = useState<number>(1);
  const [selectedV2, setSelectedV2] = useState<number>(1);

  // Queries
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => defaultApiClient.getProject(projectId),
  });

  const { data: testCase } = useQuery({
    queryKey: ['test-case', projectId, caseId],
    queryFn: () => defaultApiClient.getTestCase(projectId, caseId),
  });

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['test-case-versions', projectId, caseId],
    queryFn: async () => {
      const vers = await defaultApiClient.getTestCaseVersions(projectId, caseId);
      if (vers.length >= 2) {
        setSelectedV1(vers[vers.length - 1].versionNumber);
        setSelectedV2(vers[0].versionNumber);
      } else if (vers.length === 1) {
        setSelectedV1(vers[0].versionNumber);
        setSelectedV2(vers[0].versionNumber);
      }
      return vers;
    },
  });

  const { data: diff, isLoading: diffLoading } = useQuery({
    queryKey: ['test-case-diff', projectId, caseId, selectedV1, selectedV2],
    queryFn: () => defaultApiClient.compareTestCaseVersions(projectId, caseId, selectedV1, selectedV2),
    enabled: !!selectedV1 && !!selectedV2,
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <Link href="/projects" className="hover:text-blue-600">Projects</Link>
          <span>/</span>
          <Link href={`/projects/${projectId}`} className="hover:text-blue-600">{project?.name || 'Project'}</Link>
          <span>/</span>
          <Link href={`/projects/${projectId}/test-cases`} className="hover:text-blue-600">Test Cases</Link>
          <span>/</span>
          <Link href={`/projects/${projectId}/test-cases/${caseId}`} className="hover:text-blue-600">
            {testCase?.key || 'Case'}
          </Link>
          <span>/</span>
          <span className="text-slate-800 dark:text-slate-200 font-medium">Version History</span>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <History className="h-6 w-6 text-blue-600" />
              Version History & Historical Audit
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {testCase?.title} ({versions.length} recorded immutable snapshots)
            </p>
          </div>

          <Link
            href={`/projects/${projectId}/test-cases/${caseId}`}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Editor
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-r-transparent mb-2"></div>
          <p className="text-sm text-slate-500">Loading version snapshots...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Versions Timeline */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-700">
              Snapshot Timeline
            </h3>

            <div className="space-y-3">
              {versions.map((ver) => {
                const isCurrent = ver.versionNumber === testCase?.currentVersion;
                return (
                  <div
                    key={ver.id}
                    className={`p-3 rounded-lg border text-sm transition-all ${
                      ver.versionNumber === selectedV2
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        v{ver.versionNumber}
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-medium">
                            Current
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(ver.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 italic mb-2">
                      &quot;{ver.changeSummary || 'Version snapshot created'}&quot;
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span>{ver.steps.length} steps</span>
                      <span>By {ver.createdBy?.firstName || 'System QA'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Side-by-Side Version Comparison */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <GitCompare className="h-5 w-5 text-blue-600" />
                Compare Versions
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">Base:</span>
                  <select
                    value={selectedV1}
                    onChange={(e) => setSelectedV1(parseInt(e.target.value, 10))}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                  >
                    {versions.map((v) => (
                      <option key={v.id} value={v.versionNumber}>
                        Version {v.versionNumber}
                      </option>
                    ))}
                  </select>
                </div>

                <ArrowRight className="h-4 w-4 text-slate-400" />

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">Target:</span>
                  <select
                    value={selectedV2}
                    onChange={(e) => setSelectedV2(parseInt(e.target.value, 10))}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                  >
                    {versions.map((v) => (
                      <option key={v.id} value={v.versionNumber}>
                        Version {v.versionNumber}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {diffLoading ? (
              <div className="py-16 text-center text-slate-400 text-sm">Calculating diffs...</div>
            ) : diff ? (
              <div className="space-y-6">
                {/* Changes Overview Banner */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Differences from v{diff.versionA} to v{diff.versionB}:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {diff.titleChanged && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                        Title Changed
                      </span>
                    )}
                    {diff.priorityChanged && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                        Priority Changed
                      </span>
                    )}
                    {diff.typeChanged && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                        Type Changed
                      </span>
                    )}
                    {diff.statusChanged && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                        Status Changed
                      </span>
                    )}
                    {diff.stepsChanged && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                        Steps Content or Order Changed
                      </span>
                    )}
                    {!diff.titleChanged &&
                      !diff.priorityChanged &&
                      !diff.typeChanged &&
                      !diff.statusChanged &&
                      !diff.stepsChanged && (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                          No structural or content differences
                        </span>
                      )}
                  </div>
                </div>

                {/* Side by side comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Version A Card */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3">
                    <div className="font-bold text-sm text-slate-700 dark:text-slate-300 border-b pb-2 flex justify-between">
                      <span>Version {diff.versionA}</span>
                      <span className="text-xs text-slate-400 font-normal">
                        {new Date(diff.detailsA.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="text-slate-400 uppercase font-semibold">Title</div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {diff.detailsA.title}
                      </div>
                    </div>

                    <div className="flex gap-4 text-xs">
                      <div>
                        <span className="text-slate-400">Priority: </span>
                        <span className="font-semibold">{diff.detailsA.priority}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Type: </span>
                        <span className="font-semibold">{diff.detailsA.type}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Status: </span>
                        <span className="font-semibold">{diff.detailsA.status}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t text-xs space-y-2">
                      <div className="text-slate-400 font-semibold uppercase">
                        Steps ({diff.detailsA.steps.length})
                      </div>
                      <div className="space-y-2">
                        {diff.detailsA.steps.map((s) => (
                          <div key={s.stepNumber} className="p-2 rounded bg-slate-50 dark:bg-slate-800/50 text-[11px]">
                            <div className="font-semibold text-slate-700 dark:text-slate-300">
                              Step {s.stepNumber}: {s.action}
                            </div>
                            <div className="text-slate-500 mt-0.5">
                              Expected: {s.expectedResult}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Version B Card */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3">
                    <div className="font-bold text-sm text-blue-600 dark:text-blue-400 border-b pb-2 flex justify-between">
                      <span>Version {diff.versionB} (Target)</span>
                      <span className="text-xs text-slate-400 font-normal">
                        {new Date(diff.detailsB.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="text-slate-400 uppercase font-semibold">Title</div>
                      <div className={`font-medium ${diff.titleChanged ? 'text-blue-600 font-bold' : 'text-slate-900 dark:text-white'}`}>
                        {diff.detailsB.title}
                      </div>
                    </div>

                    <div className="flex gap-4 text-xs">
                      <div>
                        <span className="text-slate-400">Priority: </span>
                        <span className={`font-semibold ${diff.priorityChanged ? 'text-blue-600 font-bold' : ''}`}>
                          {diff.detailsB.priority}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Type: </span>
                        <span className={`font-semibold ${diff.typeChanged ? 'text-blue-600 font-bold' : ''}`}>
                          {diff.detailsB.type}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Status: </span>
                        <span className={`font-semibold ${diff.statusChanged ? 'text-blue-600 font-bold' : ''}`}>
                          {diff.detailsB.status}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t text-xs space-y-2">
                      <div className="text-slate-400 font-semibold uppercase">
                        Steps ({diff.detailsB.steps.length})
                      </div>
                      <div className="space-y-2">
                        {diff.detailsB.steps.map((s) => (
                          <div key={s.stepNumber} className="p-2 rounded bg-slate-50 dark:bg-slate-800/50 text-[11px]">
                            <div className="font-semibold text-slate-700 dark:text-slate-300">
                              Step {s.stepNumber}: {s.action}
                            </div>
                            <div className="text-slate-500 mt-0.5">
                              Expected: {s.expectedResult}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
