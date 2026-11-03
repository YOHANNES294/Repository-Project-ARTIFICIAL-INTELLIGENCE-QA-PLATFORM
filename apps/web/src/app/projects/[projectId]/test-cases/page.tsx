'use client';

import React, { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import {
  TestPriority,
  TestType,
  TestCaseStatus,
  TestCaseDto,
  CsvImportPreviewResponse,
} from '@ai-qa/shared-types';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Clock,
  History,
  Archive,
  Trash2,
  Edit,
  Tag as TagIcon,
  Folder,
  Milestone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  FileSpreadsheet,
} from 'lucide-react';

export default function TestCasesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = params.projectId as string;

  // Search & Filters
  const [search, setSearch] = useState('');
  const [suiteFilter, setSuiteFilter] = useState(searchParams.get('suiteId') || '');
  const [milestoneFilter, setMilestoneFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [page, setPage] = useState(1);

  // CSV Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvFileContent, setCsvFileContent] = useState<string>('');
  const [previewData, setPreviewData] = useState<CsvImportPreviewResponse | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Project Info
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => defaultApiClient.getProject(projectId),
  });

  // Suites & Milestones for Filter Dropdowns
  const { data: suites = [] } = useQuery({
    queryKey: ['test-suites', projectId],
    queryFn: () => defaultApiClient.getTestSuites(projectId),
  });

  const { data: milestonesData } = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => defaultApiClient.getMilestones(projectId),
  });

  const { data: tags = [] } = useQuery({
    queryKey: ['tags', projectId],
    queryFn: () => defaultApiClient.getTags(projectId),
  });

  // Test Cases Query
  const { data: casesData, isLoading } = useQuery({
    queryKey: [
      'test-cases',
      projectId,
      search,
      suiteFilter,
      milestoneFilter,
      priorityFilter,
      typeFilter,
      statusFilter,
      tagFilter,
      page,
    ],
    queryFn: () =>
      defaultApiClient.getTestCases(projectId, {
        search: search || undefined,
        suiteId: suiteFilter || undefined,
        milestoneId: milestoneFilter || undefined,
        priority: priorityFilter ? (priorityFilter as TestPriority) : undefined,
        type: typeFilter ? (typeFilter as TestType) : undefined,
        status: statusFilter ? (statusFilter as TestCaseStatus) : undefined,
        tag: tagFilter || undefined,
        page,
        limit: 20,
      }),
  });

  const testCases = casesData?.testCases || [];
  const meta = casesData?.meta;

  // Archive Mutation
  const archiveMutation = useMutation({
    mutationFn: (caseId: string) => defaultApiClient.archiveTestCase(projectId, caseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases', projectId] });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (caseId: string) => defaultApiClient.deleteTestCase(projectId, caseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases', projectId] });
    },
    onError: (err: any) => {
      alert(err.message || 'Cannot delete test case');
    },
  });

  // CSV Preview Mutation
  const previewMutation = useMutation({
    mutationFn: (content: string) => defaultApiClient.previewCsvImport(projectId, content),
    onSuccess: (data) => {
      setPreviewData(data);
      setImportError(null);
    },
    onError: (err: any) => {
      setImportError(err.message || 'Failed to parse CSV preview');
    },
  });

  // CSV Bulk Import Mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!previewData) return;
      const validRows = previewData.preview
        .filter((r) => r.isValid)
        .map((r) => r.data);

      return defaultApiClient.bulkImportCsv(projectId, {
        rows: validRows,
        defaultSuiteId: suiteFilter || undefined,
        defaultMilestoneId: milestoneFilter || undefined,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['test-cases', projectId] });
      queryClient.invalidateQueries({ queryKey: ['test-suites', projectId] });
      setShowImportModal(false);
      setPreviewData(null);
      setCsvFileContent('');
      alert(`Successfully imported ${res?.importedCount || 0} test cases!`);
    },
    onError: (err: any) => {
      setImportError(err.message || 'Import failed');
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setCsvFileContent(content);
      previewMutation.mutate(content);
    };
    reader.readAsText(file);
  };

  const handleExportCsv = () => {
    const url = defaultApiClient.getExportTestCasesCsvUrl(projectId, {
      search,
      suiteId: suiteFilter,
      milestoneId: milestoneFilter,
      priority: priorityFilter,
      type: typeFilter,
      status: statusFilter,
      tag: tagFilter,
    });
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/projects" className="hover:text-blue-600">Projects</Link>
            <span>/</span>
            <Link href={`/projects/${projectId}`} className="hover:text-blue-600">{project?.name || 'Project'}</Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 font-medium">Test Repository</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <CheckSquare className="h-6 w-6 text-blue-600" />
            Test Cases Repository
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            onClick={() => {
              setShowImportModal(true);
              setPreviewData(null);
              setImportError(null);
            }}
            className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Upload className="h-4 w-4" /> Import CSV
          </button>
          <Link
            href={`/projects/${projectId}/test-cases/new`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" /> New Test Case
          </Link>
        </div>
      </div>

      {/* Search & Multi-Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by key (e.g. CORE-1), title, or scenario..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={suiteFilter}
              onChange={(e) => {
                setSuiteFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none"
            >
              <option value="">All Suites</option>
              {suites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none"
            >
              <option value="">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none"
            >
              <option value="">All Types</option>
              <option value="FUNCTIONAL">Functional</option>
              <option value="REGRESSION">Regression</option>
              <option value="SMOKE">Smoke</option>
              <option value="SECURITY">Security</option>
              <option value="PERFORMANCE">Performance</option>
              <option value="INTEGRATION">Integration</option>
              <option value="EXPLORATORY">Exploratory</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="DEPRECATED">Deprecated</option>
            </select>

            {(suiteFilter || priorityFilter || typeFilter || statusFilter || tagFilter || search) && (
              <button
                onClick={() => {
                  setSearch('');
                  setSuiteFilter('');
                  setMilestoneFilter('');
                  setPriorityFilter('');
                  setTypeFilter('');
                  setStatusFilter('');
                  setTagFilter('');
                  setPage(1);
                }}
                className="text-xs text-red-600 hover:underline px-2 py-1 font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Quick Tag Filter Pills */}
        {tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
            <span className="text-slate-400 font-medium">Tags:</span>
            {tags.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTagFilter(tagFilter === t.name ? '' : t.name);
                  setPage(1);
                }}
                className={`px-2 py-0.5 rounded-full font-medium transition-colors ${
                  tagFilter === t.name
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                #{t.name} ({t._count?.testCases || 0})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Test Cases Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-r-transparent mb-2"></div>
            <p className="text-sm">Loading test cases repository...</p>
          </div>
        ) : testCases.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <CheckSquare className="h-12 w-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">No test cases found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              No test cases match your search query or filters. Create your first case or import a CSV suite.
            </p>
            <div className="pt-2">
              <Link
                href={`/projects/${projectId}/test-cases/new`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Create Test Case
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3.5">Key</th>
                  <th className="px-6 py-3.5">Title & Steps</th>
                  <th className="px-6 py-3.5">Suite</th>
                  <th className="px-6 py-3.5">Priority</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Version</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60">
                {testCases.map((tc) => (
                  <tr key={tc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                        {tc.key || `${project?.key}-${tc.caseNumber}`}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <Link
                          href={`/projects/${projectId}/test-cases/${tc.id}`}
                          className="font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {tc.title}
                        </Link>
                        {tc.description && (
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{tc.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {tc.estimatedTimeMin ? `${tc.estimatedTimeMin}m` : 'Unestimated'}
                          </span>
                          {tc.tags.map((t) => (
                            <span
                              key={t.id}
                              className="text-[11px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium"
                            >
                              #{t.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tc.suite ? (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                          <Folder className="h-3.5 w-3.5 text-slate-400" />
                          {tc.suite.name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No suite</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          tc.priority === TestPriority.CRITICAL
                            ? 'bg-rose-100 text-rose-800'
                            : tc.priority === TestPriority.HIGH
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {tc.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-medium">
                        {tc.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          tc.status === TestCaseStatus.ACTIVE
                            ? 'bg-emerald-100 text-emerald-800'
                            : tc.status === TestCaseStatus.DRAFT
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {tc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/projects/${projectId}/test-cases/${tc.id}/versions`}
                        className="text-xs font-mono font-bold text-blue-600 hover:underline flex items-center gap-1"
                        title="View Version History"
                      >
                        <History className="h-3.5 w-3.5" />
                        v{tc.currentVersion}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/projects/${projectId}/test-cases/${tc.id}`}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded"
                          title="Edit Test Case"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => {
                            if (confirm(`Archive test case "${tc.title}"?`)) {
                              archiveMutation.mutate(tc.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded"
                          title="Archive"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Permanently delete test case "${tc.title}"?`)) {
                              deleteMutation.mutate(tc.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-slate-500">
              Showing page {meta.page} of {meta.totalPages} ({meta.total} cases total)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CSV IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                Import Test Cases from CSV
              </h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {importError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {/* Step 1: Upload */}
            {!previewData && (
              <div className="space-y-4 py-4">
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center space-y-3">
                  <Upload className="h-10 w-10 text-slate-400 mx-auto" />
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Upload your RFC 4180 CSV file
                  </div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    CSV should contain columns: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">Title</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">Action</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">ExpectedResult</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">Priority</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">Type</code>.
                  </p>
                  <div>
                    <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium inline-block transition-colors">
                      Choose CSV File
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Preview & Validation Table */}
            {previewData && (
              <div className="space-y-4 overflow-hidden flex flex-col flex-1">
                <div className="flex items-center justify-between text-xs p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <div className="flex gap-4">
                    <span>Total Rows: <strong>{previewData.totalRows}</strong></span>
                    <span className="text-emerald-600">Valid: <strong>{previewData.validRows}</strong></span>
                    <span className={previewData.invalidRows > 0 ? 'text-red-600 font-bold' : 'text-slate-500'}>
                      Invalid: <strong>{previewData.invalidRows}</strong>
                    </span>
                  </div>
                  <label className="cursor-pointer text-blue-600 hover:underline font-medium">
                    Upload different file
                    <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>

                <div className="overflow-y-auto max-h-72 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 font-semibold text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="px-3 py-2">Row</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Title</th>
                        <th className="px-3 py-2">Priority</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Validation Errors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {previewData.preview.map((row) => (
                        <tr
                          key={row.rowNumber}
                          className={row.isValid ? '' : 'bg-red-50/50 dark:bg-red-950/20'}
                        >
                          <td className="px-3 py-2 font-mono">{row.rowNumber}</td>
                          <td className="px-3 py-2">
                            {row.isValid ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                          </td>
                          <td className="px-3 py-2 font-medium max-w-[200px] truncate">{row.data.title}</td>
                          <td className="px-3 py-2">{row.data.priority}</td>
                          <td className="px-3 py-2">{row.data.type}</td>
                          <td className="px-3 py-2 text-red-600 dark:text-red-400">
                            {row.errors.join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => setPreviewData(null)}
                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => importMutation.mutate()}
                    disabled={importMutation.isPending || previewData.validRows === 0}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    {importMutation.isPending
                      ? 'Importing...'
                      : `Import ${previewData.validRows} Valid Cases`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
