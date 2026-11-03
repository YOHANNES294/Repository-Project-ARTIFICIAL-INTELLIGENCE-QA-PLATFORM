'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import {
  HelpCircle,
  Link2,
  Plus,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  Terminal,
  Clock,
  Check,
} from 'lucide-react';
import { AutomationUnmappedTestDto } from '@ai-qa/shared-types';

export default function AutomationUnmappedPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('PENDING');

  // Link Modal State
  const [selectedUnmapped, setSelectedUnmapped] = useState<AutomationUnmappedTestDto | null>(null);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Queries
  const { data: unmappedData, isLoading } = useQuery({
    queryKey: ['automation-unmapped', projectId, statusFilter],
    queryFn: () =>
      defaultApiClient.getAutomationUnmappedTests(projectId, {
        status: statusFilter || undefined,
      }),
  });

  const { data: testCasesData } = useQuery({
    queryKey: ['test-cases', projectId],
    queryFn: () => defaultApiClient.getTestCases(projectId, { limit: 100 }),
    enabled: !!selectedUnmapped,
  });

  // Mutations
  const resolveMutation = useMutation({
    mutationFn: (payload: { unmappedId: string; testCaseId?: string | null; createTestCase?: boolean; status: 'RESOLVED' | 'IGNORED' }) =>
      defaultApiClient.resolveAutomationUnmappedTest(projectId, payload.unmappedId, {
        testCaseId: payload.testCaseId,
        createTestCase: payload.createTestCase,
        status: payload.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-unmapped', projectId] });
      queryClient.invalidateQueries({ queryKey: ['automation-mappings', projectId] });
      queryClient.invalidateQueries({ queryKey: ['automation-overview', projectId] });
      setSelectedUnmapped(null);
      setSelectedTestCaseId('');
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to resolve unmapped test');
    },
  });

  const unmappedList = unmappedData?.unmapped || [];
  const testCases = testCasesData?.testCases || [];

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
              <HelpCircle className="h-6 w-6 text-amber-600" />
              Unmapped Automated Tests
            </h1>
            <p className="text-sm text-slate-500">
              Review and resolve automated tests executed by CI runners that are not yet linked to platform TestCases
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === 'PENDING'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
            }`}
          >
            Pending Review
          </button>
          <button
            onClick={() => setStatusFilter('RESOLVED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === 'RESOLVED'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
            }`}
          >
            Resolved
          </button>
          <button
            onClick={() => setStatusFilter('IGNORED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === 'IGNORED'
                ? 'bg-slate-600 text-white'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
            }`}
          >
            Ignored
          </button>
        </div>
      </div>

      {/* Unmapped Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading unmapped tests...</div>
        ) : unmappedList.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="p-4 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 rounded-full w-fit mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              No Unmapped Tests
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              All automated tests currently executing in your CI/CD runners are mapped to platform TestCases!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs uppercase font-medium">
                <tr>
                  <th className="px-5 py-3">External Test Name / ID</th>
                  <th className="px-5 py-3">Suite</th>
                  <th className="px-5 py-3">Framework</th>
                  <th className="px-5 py-3">Last Seen</th>
                  <th className="px-5 py-3 text-right">Resolve Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {unmappedList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {item.externalTitle}
                      </div>
                      <div className="font-mono text-xs text-slate-500 mt-0.5">
                        {item.externalId}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {item.suiteName || 'Root'}
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                        {item.framework}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {new Date(item.lastSeenAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {item.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedUnmapped(item)}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm flex items-center gap-1"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            Link to TestCase
                          </button>
                          <button
                            onClick={() =>
                              resolveMutation.mutate({
                                unmappedId: item.id,
                                createTestCase: true,
                                status: 'RESOLVED',
                              })
                            }
                            disabled={resolveMutation.isPending}
                            className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 rounded-lg flex items-center gap-1"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Auto-Create Case
                          </button>
                          <button
                            onClick={() =>
                              resolveMutation.mutate({
                                unmappedId: item.id,
                                status: 'IGNORED',
                              })
                            }
                            disabled={resolveMutation.isPending}
                            className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600 rounded-lg"
                            title="Ignore test"
                          >
                            <EyeOff className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-slate-500">
                          Status: {item.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Link to Existing TestCase Modal */}
      {selectedUnmapped && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Link2 className="h-5 w-5 text-purple-600" />
              Link Automated Test to TestCase
            </h3>

            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg text-xs space-y-1">
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                {selectedUnmapped.externalTitle}
              </div>
              <div className="font-mono text-slate-500 truncate">
                {selectedUnmapped.externalId}
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 text-xs bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 rounded-lg">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Select Platform TestCase
              </label>
              <select
                value={selectedTestCaseId}
                onChange={(e) => setSelectedTestCaseId(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-white"
              >
                <option value="">Choose a test case...</option>
                {testCases.map((tc) => (
                  <option key={tc.id} value={tc.id}>
                    #{tc.caseNumber} - {tc.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedUnmapped(null);
                  setErrorMsg(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  resolveMutation.mutate({
                    unmappedId: selectedUnmapped.id,
                    testCaseId: selectedTestCaseId,
                    status: 'RESOLVED',
                  })
                }
                disabled={!selectedTestCaseId || resolveMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50"
              >
                {resolveMutation.isPending ? 'Linking...' : 'Confirm Mapping'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
