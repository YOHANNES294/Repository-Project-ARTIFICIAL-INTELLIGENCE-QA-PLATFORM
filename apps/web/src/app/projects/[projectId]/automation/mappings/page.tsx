'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import {
  Link2,
  Plus,
  Trash2,
  ArrowLeft,
  Search,
  CheckCircle2,
  Filter,
  ExternalLink,
} from 'lucide-react';
import { AutomationFramework } from '@ai-qa/shared-types';

export default function AutomationMappingsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [frameworkFilter, setFrameworkFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [externalId, setExternalId] = useState('');
  const [externalTitle, setExternalTitle] = useState('');
  const [testCaseId, setTestCaseId] = useState('');
  const [framework, setFramework] = useState<AutomationFramework>('PLAYWRIGHT');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Queries
  const { data: mappingsData, isLoading } = useQuery({
    queryKey: ['automation-mappings', projectId, search, frameworkFilter],
    queryFn: () =>
      defaultApiClient.getAutomationMappings(projectId, {
        search: search || undefined,
        framework: frameworkFilter || undefined,
      }),
  });

  const { data: testCasesData } = useQuery({
    queryKey: ['test-cases', projectId],
    queryFn: () => defaultApiClient.getTestCases(projectId, { limit: 100 }),
    enabled: showCreateModal,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      return defaultApiClient.createAutomationMapping(projectId, {
        testCaseId,
        externalId: externalId.trim(),
        externalTitle: externalTitle.trim() || externalId.trim(),
        framework,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-mappings', projectId] });
      queryClient.invalidateQueries({ queryKey: ['automation-overview', projectId] });
      setShowCreateModal(false);
      setExternalId('');
      setExternalTitle('');
      setTestCaseId('');
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to create test mapping');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (mappingId: string) =>
      defaultApiClient.deleteAutomationMapping(projectId, mappingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-mappings', projectId] });
      queryClient.invalidateQueries({ queryKey: ['automation-overview', projectId] });
    },
  });

  const mappings = mappingsData?.mappings || [];
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
              <Link2 className="h-6 w-6 text-purple-600" />
              Automated Test Mappings
            </h1>
            <p className="text-sm text-slate-500">
              Map external automated tests to platform TestCases for unified execution traceability
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Test Mapping
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search external ID, title, or mapped test case..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm pl-9 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          />
        </div>
        <div className="sm:w-48">
          <select
            value={frameworkFilter}
            onChange={(e) => setFrameworkFilter(e.target.value)}
            className="w-full text-sm py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          >
            <option value="">All Frameworks</option>
            <option value="PLAYWRIGHT">Playwright</option>
            <option value="NEWMAN">Newman / Postman</option>
            <option value="GENERIC">Generic</option>
          </select>
        </div>
      </div>

      {/* Mappings Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading mappings...</div>
        ) : mappings.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="p-4 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-full w-fit mx-auto">
              <Link2 className="h-8 w-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              No Mappings Found
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              You can manually add mappings or link tests from the Unmapped Tests review tab.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg"
            >
              <Plus className="h-4 w-4" />
              Add First Mapping
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs uppercase font-medium">
                <tr>
                  <th className="px-5 py-3">External Test ID / Title</th>
                  <th className="px-5 py-3">Framework</th>
                  <th className="px-5 py-3">Mapped Platform TestCase</th>
                  <th className="px-5 py-3">Confidence</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {mappings.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {m.externalTitle}
                      </div>
                      <div className="font-mono text-xs text-slate-500 mt-0.5">
                        {m.externalId}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                        {m.framework}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {m.testCase ? (
                        <Link
                          href={`/projects/${projectId}/test-cases/${m.testCase.id}`}
                          className="font-medium text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1.5"
                        >
                          <span className="font-bold">{m.testCase.key || `#${m.testCase.caseNumber}`}</span>
                          <span className="text-slate-700 dark:text-slate-300 truncate max-w-xs">
                            {m.testCase.title}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400">Not found</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold text-emerald-600">
                      {Math.round(m.confidence * 100)}%
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => {
                          if (confirm(`Remove mapping for "${m.externalTitle}"?`)) {
                            deleteMutation.mutate(m.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="text-xs text-rose-600 hover:text-rose-700 font-medium hover:underline flex items-center gap-1 ml-auto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Mapping Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Create Test Case Mapping
            </h3>
            <p className="text-xs text-slate-500">
              Bind an external automated test identifier to a canonical repository test case.
            </p>

            {errorMsg && (
              <div className="p-3 text-xs bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 rounded-lg">
                {errorMsg}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Target Platform TestCase
                </label>
                <select
                  value={testCaseId}
                  onChange={(e) => setTestCaseId(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-white"
                >
                  <option value="">Select a test case...</option>
                  {testCases.map((tc) => (
                    <option key={tc.id} value={tc.id}>
                      #{tc.caseNumber} - {tc.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  External Test ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. tests/auth.spec.ts::User should log in"
                  value={externalId}
                  onChange={(e) => setExternalId(e.target.value)}
                  className="w-full text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  External Title / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. User should log in"
                  value={externalTitle}
                  onChange={(e) => setExternalTitle(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Framework
                </label>
                <select
                  value={framework}
                  onChange={(e) => setFramework(e.target.value as AutomationFramework)}
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-white"
                >
                  <option value="PLAYWRIGHT">Playwright</option>
                  <option value="NEWMAN">Newman / Postman</option>
                  <option value="GENERIC">Generic CI</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setErrorMsg(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createMutation.mutate()}
                disabled={!testCaseId || !externalId.trim() || createMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50"
              >
                {createMutation.isPending ? 'Mapping...' : 'Save Mapping'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
