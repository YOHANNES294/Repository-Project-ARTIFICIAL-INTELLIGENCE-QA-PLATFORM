'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import {
  DefectDto,
  DefectSeverity,
  DefectPriority,
  DefectStatus,
  DefectType,
} from '@ai-qa/shared-types';
import {
  Bug,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Trash2,
  Eye,
  RefreshCw,
  ShieldAlert,
  Layers,
  Sparkles,
  TrendingUp,
  Activity,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react';

export default function DefectsListPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = params.projectId as string;

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [componentFilter, setComponentFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const limit = 15;

  // Fetch Project
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => defaultApiClient.getProject(projectId),
  });

  // Fetch Analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['defect-analytics', projectId],
    queryFn: () => defaultApiClient.getDefectAnalytics(projectId),
  });

  // Fetch Defects
  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      'defects',
      projectId,
      search,
      statusFilter,
      severityFilter,
      priorityFilter,
      typeFilter,
      componentFilter,
      page,
    ],
    queryFn: () =>
      defaultApiClient.getDefects(projectId, {
        search: search.trim() || undefined,
        status: (statusFilter as DefectStatus) || undefined,
        severity: (severityFilter as DefectSeverity) || undefined,
        priority: (priorityFilter as DefectPriority) || undefined,
        type: (typeFilter as DefectType) || undefined,
        component: componentFilter.trim() || undefined,
        page,
        limit,
      }),
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (defectId: string) => defaultApiClient.deleteDefect(projectId, defectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defects', projectId] });
      queryClient.invalidateQueries({ queryKey: ['defect-analytics', projectId] });
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to delete defect');
    },
  });

  const handleDelete = (defect: DefectDto) => {
    if (confirm(`Are you sure you want to delete defect ${defect.key || defect.id} ("${defect.title}")? This action cannot be undone.`)) {
      deleteMutation.mutate(defect.id);
    }
  };

  const getStatusBadge = (status: DefectStatus) => {
    switch (status) {
      case DefectStatus.NEW:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-950 text-sky-400 border border-sky-800">NEW</span>;
      case DefectStatus.OPEN:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950 text-blue-400 border border-blue-800">OPEN</span>;
      case DefectStatus.IN_PROGRESS:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-950 text-purple-400 border border-purple-800">IN PROGRESS</span>;
      case DefectStatus.FIXED:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-950 text-teal-400 border border-teal-800">FIXED</span>;
      case DefectStatus.READY_FOR_RETEST:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950 text-amber-400 border border-amber-800">READY FOR RETEST</span>;
      case DefectStatus.VERIFIED:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">VERIFIED</span>;
      case DefectStatus.CLOSED:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">CLOSED</span>;
      case DefectStatus.REOPENED:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950 text-rose-400 border border-rose-800">REOPENED</span>;
      case DefectStatus.REJECTED:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">REJECTED</span>;
      case DefectStatus.DUPLICATE:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-900 text-slate-400 border border-slate-700">DUPLICATE</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  const getSeverityBadge = (severity: DefectSeverity) => {
    switch (severity) {
      case DefectSeverity.CRITICAL:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-950/80 text-rose-400 border border-rose-800">CRITICAL</span>;
      case DefectSeverity.HIGH:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-950/80 text-amber-400 border border-amber-800">HIGH</span>;
      case DefectSeverity.MEDIUM:
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-950/80 text-blue-400 border border-blue-800">MEDIUM</span>;
      case DefectSeverity.LOW:
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">LOW</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs text-slate-400">{severity}</span>;
    }
  };

  const getPriorityBadge = (priority: DefectPriority) => {
    switch (priority) {
      case DefectPriority.URGENT:
        return <span className="text-xs font-bold text-rose-400">URGENT</span>;
      case DefectPriority.HIGH:
        return <span className="text-xs font-semibold text-amber-400">HIGH</span>;
      case DefectPriority.MEDIUM:
        return <span className="text-xs font-semibold text-blue-400">MEDIUM</span>;
      case DefectPriority.LOW:
        return <span className="text-xs font-semibold text-slate-400">LOW</span>;
      default:
        return <span className="text-xs text-slate-400">{priority}</span>;
    }
  };

  const defectsList = data?.defects || [];
  const totalCount = data?.meta?.total || defectsList.length;
  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Breadcrumb & Navigation */}
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
                <Link href="/projects" className="hover:text-slate-200">
                  Projects
                </Link>
                <span>/</span>
                <Link href={`/projects/${projectId}`} className="hover:text-slate-200">
                  {project?.name || 'Project'}
                </Link>
                <span>/</span>
                <span className="text-rose-400">Defects</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
                <Bug className="w-7 h-7 text-rose-400" />
                Defect Management & Bug Tracking
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/projects/${projectId}/defects/new`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm transition-all shadow-lg shadow-rose-600/20"
            >
              <Plus className="w-4 h-4" />
              Report Defect
            </Link>
          </div>
        </div>

        {/* Database-Backed Analytics Summary Banner */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Bug className="w-3.5 h-3.5 text-rose-400" />
              Total Defects
            </span>
            <p className="text-2xl font-bold text-white">
              {analyticsLoading ? '...' : analytics?.totalDefects ?? 0}
            </p>
            <span className="text-[11px] text-slate-400">All recorded</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              Open / Active
            </span>
            <p className="text-2xl font-bold text-blue-400">
              {analyticsLoading ? '...' : analytics?.openDefects ?? 0}
            </p>
            <span className="text-[11px] text-slate-400">Requiring action</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              Critical / High
            </span>
            <p className="text-2xl font-bold text-amber-400">
              {analyticsLoading ? '...' : analytics?.criticalHighDefects ?? 0}
            </p>
            <span className="text-[11px] text-slate-400">High impact</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <CheckCheck className="w-3.5 h-3.5 text-teal-400" />
              Resolved / Fixed
            </span>
            <p className="text-2xl font-bold text-teal-400">
              {analyticsLoading ? '...' : analytics?.resolvedDefects ?? 0}
            </p>
            <span className="text-[11px] text-slate-400">Fixed & ready</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
              Reopened Rate
            </span>
            <p className="text-2xl font-bold text-purple-400">
              {analyticsLoading ? '...' : `${analytics?.reopenedRate ?? 0}%`}
            </p>
            <span className="text-[11px] text-slate-400">Quality stability</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Avg Resolution
            </span>
            <p className="text-2xl font-bold text-emerald-400">
              {analyticsLoading
                ? '...'
                : analytics?.avgTimeToResolutionHours != null
                ? `${analytics.avgTimeToResolutionHours}h`
                : 'N/A'}
            </p>
            <span className="text-[11px] text-slate-400">Fix velocity</span>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Search */}
            <div className="lg:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search defects by key, title, description..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              >
                <option value="">All Statuses</option>
                <option value={DefectStatus.NEW}>New</option>
                <option value={DefectStatus.OPEN}>Open</option>
                <option value={DefectStatus.IN_PROGRESS}>In Progress</option>
                <option value={DefectStatus.FIXED}>Fixed</option>
                <option value={DefectStatus.READY_FOR_RETEST}>Ready For Retest</option>
                <option value={DefectStatus.VERIFIED}>Verified</option>
                <option value={DefectStatus.CLOSED}>Closed</option>
                <option value={DefectStatus.REOPENED}>Reopened</option>
                <option value={DefectStatus.REJECTED}>Rejected</option>
                <option value={DefectStatus.DUPLICATE}>Duplicate</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div>
              <select
                value={severityFilter}
                onChange={(e) => {
                  setSeverityFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              >
                <option value="">All Severities</option>
                <option value={DefectSeverity.CRITICAL}>Critical</option>
                <option value={DefectSeverity.HIGH}>High</option>
                <option value={DefectSeverity.MEDIUM}>Medium</option>
                <option value={DefectSeverity.LOW}>Low</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              >
                <option value="">All Priorities</option>
                <option value={DefectPriority.URGENT}>Urgent</option>
                <option value={DefectPriority.HIGH}>High</option>
                <option value={DefectPriority.MEDIUM}>Medium</option>
                <option value={DefectPriority.LOW}>Low</option>
              </select>
            </div>

            {/* Defect Type Filter */}
            <div>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              >
                <option value="">All Types</option>
                <option value={DefectType.FUNCTIONAL}>Functional</option>
                <option value={DefectType.UI}>UI / UX</option>
                <option value={DefectType.API}>API / Backend</option>
                <option value={DefectType.PERFORMANCE}>Performance</option>
                <option value={DefectType.SECURITY}>Security</option>
                <option value={DefectType.ACCESSIBILITY}>Accessibility</option>
                <option value={DefectType.DATA}>Data</option>
                <option value={DefectType.INTEGRATION}>Integration</option>
                <option value={DefectType.OTHER}>Other</option>
              </select>
            </div>
          </div>

          {(search || statusFilter || severityFilter || priorityFilter || typeFilter || componentFilter) && (
            <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-3">
              <span>Active filters applied</span>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setSeverityFilter('');
                  setPriorityFilter('');
                  setTypeFilter('');
                  setComponentFilter('');
                  setPage(1);
                }}
                className="text-rose-400 hover:text-rose-300 underline font-medium"
              >
                Reset all filters
              </button>
            </div>
          )}
        </div>

        {/* Defects Table */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-rose-500" />
              <p className="text-sm">Loading defects repository...</p>
            </div>
          ) : defectsList.length === 0 ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <Bug className="w-10 h-10 text-slate-600" />
              <p className="text-base font-semibold text-slate-300">No defects found</p>
              <p className="text-xs text-slate-500 max-w-sm">
                No defects match your current search or filter criteria. Report a new defect or clear filters.
              </p>
              <Link
                href={`/projects/${projectId}/defects/new`}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Report First Defect
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Key</th>
                    <th className="py-3 px-4">Title & Component</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Assignee / QA</th>
                    <th className="py-3 px-4">Reported</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {defectsList.map((defect) => (
                    <tr
                      key={defect.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Key */}
                      <td className="py-3 px-4 font-mono font-bold text-rose-400 whitespace-nowrap">
                        <Link
                          href={`/projects/${projectId}/defects/${defect.id}`}
                          className="hover:underline"
                        >
                          {defect.key || `BUG-${defect.defectNumber}`}
                        </Link>
                      </td>

                      {/* Title & Component */}
                      <td className="py-3 px-4 max-w-md">
                        <Link
                          href={`/projects/${projectId}/defects/${defect.id}`}
                          className="font-medium text-white hover:text-rose-300 block truncate"
                        >
                          {defect.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          {defect.component && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {defect.component}
                            </span>
                          )}
                          {defect.environment && (
                            <span className="text-slate-400">
                              Env: {defect.environment.name}
                            </span>
                          )}
                          {defect.duplicateOf && (
                            <span className="text-zinc-400 flex items-center gap-1">
                              • Dup of {defect.duplicateOf.key}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Severity */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getSeverityBadge(defect.severity)}
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getPriorityBadge(defect.priority)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(defect.status)}
                      </td>

                      {/* Type */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-800/60 text-slate-300 text-[11px]">
                          {defect.type}
                        </span>
                      </td>

                      {/* Assignee / QA Owner */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-slate-300">
                          {defect.assignee ? (
                            <span className="flex items-center gap-1 font-medium">
                              <User className="w-3 h-3 text-slate-500" />
                              {defect.assignee.firstName} {defect.assignee.lastName}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">Unassigned</span>
                          )}
                        </div>
                        {defect.qaOwner && (
                          <div className="text-[10px] text-slate-500">
                            QA: {defect.qaOwner.firstName} {defect.qaOwner.lastName}
                          </div>
                        )}
                      </td>

                      {/* Reported date */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-400 text-[11px]">
                        {new Date(defect.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/projects/${projectId}/defects/${defect.id}`}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="View Workbench"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(defect)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Delete Defect"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-400">
              <span>
                Showing page <strong className="text-white">{page}</strong> of{' '}
                <strong className="text-white">{totalPages}</strong> ({totalCount} total defects)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40 text-slate-300 hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40 text-slate-300 hover:text-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
