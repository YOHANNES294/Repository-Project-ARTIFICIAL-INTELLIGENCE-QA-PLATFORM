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
  DefectCommentDto,
  DefectHistoryDto,
  DefectTestLinkDto,
} from '@ai-qa/shared-types';
import {
  Bug,
  ArrowLeft,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Clock,
  RotateCcw,
  User,
  Shield,
  Layers,
  Monitor,
  Calendar,
  MessageSquare,
  History,
  Link2,
  Unlink2,
  Plus,
  Send,
  EyeOff,
  Copy,
  ExternalLink,
  ChevronRight,
  Sparkles,
  PlayCircle,
  FileText,
} from 'lucide-react';

export default function DefectWorkbenchPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const projectId = params.projectId as string;
  const defectId = params.defectId as string;

  const [activeTab, setActiveTab] = useState<'details' | 'links' | 'comments' | 'history'>('details');

  // Transition Modal State
  const [transitionTarget, setTransitionTarget] = useState<DefectStatus | null>(null);
  const [transitionReason, setTransitionReason] = useState('');
  const [transitionResolution, setTransitionResolution] = useState('');
  const [transitionDuplicateOfId, setTransitionDuplicateOfId] = useState('');
  const [transitionError, setTransitionError] = useState<string | null>(null);

  // Comment Form State
  const [newCommentContent, setNewCommentContent] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [replyParentId, setReplyParentId] = useState<string | null>(null);

  // Link Test Modal State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkTestCaseId, setLinkTestCaseId] = useState('');
  const [linkTestRunId, setLinkTestRunId] = useState('');
  const [linkNotes, setLinkNotes] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);

  // Assignment states
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [selectedQaOwner, setSelectedQaOwner] = useState<string>('');

  // Queries
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => defaultApiClient.getProject(projectId),
  });

  const { data: defect, isLoading: defectLoading } = useQuery({
    queryKey: ['defect', projectId, defectId],
    queryFn: async () => {
      const d = await defaultApiClient.getDefect(projectId, defectId);
      setSelectedAssignee(d.assigneeId || '');
      setSelectedQaOwner(d.qaOwnerId || '');
      return d;
    },
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ['defect-comments', projectId, defectId],
    queryFn: () => defaultApiClient.getDefectComments(projectId, defectId),
    enabled: activeTab === 'comments',
  });

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['defect-history', projectId, defectId],
    queryFn: () => defaultApiClient.getDefectHistory(projectId, defectId),
    enabled: activeTab === 'history',
  });

  const { data: members = [] } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => defaultApiClient.getProjectMembers(projectId),
  });

  const { data: testCasesData } = useQuery({
    queryKey: ['test-cases-selector', projectId],
    queryFn: () => defaultApiClient.getTestCases(projectId, { limit: 100 }),
    enabled: showLinkModal,
  });

  const { data: testRunsData } = useQuery({
    queryKey: ['test-runs-selector', projectId],
    queryFn: () => defaultApiClient.getTestRuns(projectId, { limit: 50 }),
    enabled: showLinkModal,
  });

  // Fetch candidate defects for duplicate assignment modal
  const { data: otherDefectsData } = useQuery({
    queryKey: ['defects-list-for-duplicate', projectId],
    queryFn: () => defaultApiClient.getDefects(projectId, { limit: 100 }),
    enabled: transitionTarget === DefectStatus.DUPLICATE,
  });

  // Mutations
  const transitionMutation = useMutation({
    mutationFn: (payload: {
      status: DefectStatus;
      reason?: string;
      resolution?: string;
      duplicateOfId?: string;
    }) => defaultApiClient.transitionDefectStatus(projectId, defectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defect', projectId, defectId] });
      queryClient.invalidateQueries({ queryKey: ['defect-history', projectId, defectId] });
      queryClient.invalidateQueries({ queryKey: ['defects', projectId] });
      setTransitionTarget(null);
      setTransitionReason('');
      setTransitionResolution('');
      setTransitionDuplicateOfId('');
      setTransitionError(null);
    },
    onError: (err: any) => {
      setTransitionError(err.message || 'Status transition failed');
    },
  });

  const assignMutation = useMutation({
    mutationFn: (payload: { assigneeId?: string; qaOwnerId?: string }) =>
      defaultApiClient.assignDefect(projectId, defectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defect', projectId, defectId] });
      queryClient.invalidateQueries({ queryKey: ['defect-history', projectId, defectId] });
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to update assignment');
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (payload: { content: string; isInternal?: boolean; parentId?: string }) =>
      defaultApiClient.addDefectComment(projectId, defectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defect-comments', projectId, defectId] });
      setNewCommentContent('');
      setIsInternalComment(false);
      setReplyParentId(null);
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to add comment');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) =>
      defaultApiClient.deleteDefectComment(projectId, defectId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defect-comments', projectId, defectId] });
    },
  });

  const linkTestMutation = useMutation({
    mutationFn: (payload: { testCaseId?: string; testRunId?: string; notes?: string }) =>
      defaultApiClient.linkDefectTest(projectId, defectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defect', projectId, defectId] });
      setShowLinkModal(false);
      setLinkTestCaseId('');
      setLinkTestRunId('');
      setLinkNotes('');
      setLinkError(null);
    },
    onError: (err: any) => {
      setLinkError(err.message || 'Failed to link test');
    },
  });

  const unlinkTestMutation = useMutation({
    mutationFn: (linkId: string) => defaultApiClient.unlinkDefectTest(projectId, defectId, linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defect', projectId, defectId] });
    },
  });

  const deleteDefectMutation = useMutation({
    mutationFn: () => defaultApiClient.deleteDefect(projectId, defectId),
    onSuccess: () => {
      router.push(`/projects/${projectId}/defects`);
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to delete defect');
    },
  });

  const handleDeleteDefect = () => {
    if (confirm(`Are you sure you want to delete this defect? This action cannot be undone.`)) {
      deleteDefectMutation.mutate();
    }
  };

  const executeStatusTransition = () => {
    if (!transitionTarget) return;

    if (transitionTarget === DefectStatus.FIXED && !transitionResolution.trim()) {
      setTransitionError('Resolution notes are mandatory when marking a defect as FIXED');
      return;
    }

    if (
      (transitionTarget === DefectStatus.REJECTED || transitionTarget === DefectStatus.REOPENED) &&
      !transitionReason.trim()
    ) {
      setTransitionError(`A reason explanation is mandatory when changing status to ${transitionTarget}`);
      return;
    }

    if (transitionTarget === DefectStatus.DUPLICATE && !transitionDuplicateOfId) {
      setTransitionError('You must select the canonical original defect this duplicates');
      return;
    }

    transitionMutation.mutate({
      status: transitionTarget,
      reason: transitionReason.trim() || undefined,
      resolution: transitionResolution.trim() || undefined,
      duplicateOfId: transitionDuplicateOfId || undefined,
    });
  };

  // State Machine transition options based on current status
  const getAvailableTransitions = (currentStatus: DefectStatus): DefectStatus[] => {
    switch (currentStatus) {
      case DefectStatus.NEW:
      case DefectStatus.OPEN:
        return [
          DefectStatus.IN_PROGRESS,
          DefectStatus.FIXED,
          DefectStatus.REJECTED,
          DefectStatus.DUPLICATE,
        ];
      case DefectStatus.IN_PROGRESS:
        return [DefectStatus.FIXED, DefectStatus.REJECTED];
      case DefectStatus.FIXED:
        return [DefectStatus.READY_FOR_RETEST, DefectStatus.REOPENED];
      case DefectStatus.READY_FOR_RETEST:
        return [DefectStatus.VERIFIED, DefectStatus.REOPENED];
      case DefectStatus.VERIFIED:
        return [DefectStatus.CLOSED, DefectStatus.REOPENED];
      case DefectStatus.CLOSED:
      case DefectStatus.REJECTED:
      case DefectStatus.DUPLICATE:
        return [DefectStatus.REOPENED];
      case DefectStatus.REOPENED:
        return [DefectStatus.IN_PROGRESS, DefectStatus.FIXED, DefectStatus.REJECTED, DefectStatus.DUPLICATE];
      default:
        return [];
    }
  };

  const getStatusBadge = (status: DefectStatus) => {
    switch (status) {
      case DefectStatus.NEW:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-950 text-sky-400 border border-sky-800">NEW</span>;
      case DefectStatus.OPEN:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-950 text-blue-400 border border-blue-800">OPEN</span>;
      case DefectStatus.IN_PROGRESS:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-950 text-purple-400 border border-purple-800">IN PROGRESS</span>;
      case DefectStatus.FIXED:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-950 text-teal-400 border border-teal-800">FIXED</span>;
      case DefectStatus.READY_FOR_RETEST:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-400 border border-amber-800">READY FOR RETEST</span>;
      case DefectStatus.VERIFIED:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">VERIFIED</span>;
      case DefectStatus.CLOSED:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">CLOSED</span>;
      case DefectStatus.REOPENED:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-950 text-rose-400 border border-rose-800">REOPENED</span>;
      case DefectStatus.REJECTED:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">REJECTED</span>;
      case DefectStatus.DUPLICATE:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-900 text-slate-400 border border-slate-700">DUPLICATE</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  const getSeverityBadge = (sev: DefectSeverity) => {
    switch (sev) {
      case DefectSeverity.CRITICAL:
        return <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-rose-950 text-rose-400 border border-rose-800">CRITICAL</span>;
      case DefectSeverity.HIGH:
        return <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-amber-950 text-amber-400 border border-amber-800">HIGH</span>;
      case DefectSeverity.MEDIUM:
        return <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-950 text-blue-400 border border-blue-800">MEDIUM</span>;
      case DefectSeverity.LOW:
        return <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">LOW</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded text-xs text-slate-400">{sev}</span>;
    }
  };

  if (defectLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Clock className="w-5 h-5 animate-spin text-rose-500 mr-3" />
        Loading defect workbench...
      </div>
    );
  }

  if (!defect) {
    return (
      <div className="min-h-screen bg-slate-950 p-10 flex flex-col items-center justify-center text-slate-400 gap-4">
        <Bug className="w-12 h-12 text-rose-500" />
        <h2 className="text-xl font-bold text-white">Defect Not Found</h2>
        <p className="text-sm">The defect could not be found or you do not have permission to view it.</p>
        <Link
          href={`/projects/${projectId}/defects`}
          className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-300 hover:text-white"
        >
          Return to Defects List
        </Link>
      </div>
    );
  }

  const availableTransitions = getAvailableTransitions(defect.status);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Breadcrumb & Workbench Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/projects/${projectId}/defects`}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                <Link href={`/projects/${projectId}`} className="hover:text-slate-200">
                  {project?.name || 'Project'}
                </Link>
                <span>/</span>
                <Link href={`/projects/${projectId}/defects`} className="hover:text-slate-200">
                  Defects
                </Link>
                <span>/</span>
                <span className="font-mono text-rose-400 font-bold">{defect.key}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3 mt-0.5">
                <span className="font-mono text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-900/50">
                  {defect.key}
                </span>
                <span>{defect.title}</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/projects/${projectId}/defects/${defect.id}/edit`}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit Defect
            </Link>
            <button
              type="button"
              onClick={handleDeleteDefect}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 text-xs font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>

        {/* Duplicate Notice Banner if Marked as Duplicate */}
        {defect.status === DefectStatus.DUPLICATE && defect.duplicateOf && (
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <Copy className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                This defect has been marked as a duplicate of canonical defect{' '}
                <strong className="text-white font-mono">{defect.duplicateOf.key}</strong> (
                {defect.duplicateOf.title}).
              </span>
            </div>
            <Link
              href={`/projects/${projectId}/defects/${defect.duplicateOf.id}`}
              className="text-purple-400 hover:text-purple-300 inline-flex items-center gap-1 font-semibold"
            >
              Open Original <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Status Lifecycle Action Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Current Status:
            </span>
            {getStatusBadge(defect.status)}
            <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />
            <span className="text-xs text-slate-400">Severity: {getSeverityBadge(defect.severity)}</span>
            <span className="text-xs text-slate-400">Priority: <strong className="text-white">{defect.priority}</strong></span>
            <span className="text-xs text-slate-400">Type: <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">{defect.type}</span></span>
          </div>

          {/* Quick Lifecycle Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-medium mr-1">Lifecycle Actions:</span>
            {availableTransitions.map((nextStatus) => {
              let btnClass = 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700';
              if (nextStatus === DefectStatus.IN_PROGRESS)
                btnClass = 'bg-purple-900/60 hover:bg-purple-800 text-purple-200 border-purple-700/60';
              if (nextStatus === DefectStatus.FIXED)
                btnClass = 'bg-teal-900/60 hover:bg-teal-800 text-teal-200 border-teal-700/60';
              if (nextStatus === DefectStatus.READY_FOR_RETEST)
                btnClass = 'bg-amber-900/60 hover:bg-amber-800 text-amber-200 border-amber-700/60';
              if (nextStatus === DefectStatus.VERIFIED)
                btnClass = 'bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border-emerald-700/60';
              if (nextStatus === DefectStatus.CLOSED)
                btnClass = 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700';
              if (nextStatus === DefectStatus.REOPENED)
                btnClass = 'bg-rose-900/60 hover:bg-rose-800 text-rose-200 border-rose-700/60';

              return (
                <button
                  key={nextStatus}
                  type="button"
                  onClick={() => {
                    setTransitionTarget(nextStatus);
                    setTransitionError(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${btnClass}`}
                >
                  Move to {nextStatus.replace('_', ' ')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Transition Input Modal / Drawer when active */}
        {transitionTarget && (
          <div className="p-6 rounded-2xl bg-slate-900 border-2 border-rose-500/50 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-rose-400" />
                Transition Defect Status to: <span className="text-rose-400">{transitionTarget}</span>
              </h3>
              <button
                type="button"
                onClick={() => setTransitionTarget(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            {transitionError && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
                {transitionError}
              </div>
            )}

            {/* When transition is FIXED: Require Resolution Notes */}
            {transitionTarget === DefectStatus.FIXED && (
              <div>
                <label className="block text-xs font-semibold text-teal-400 uppercase tracking-wider mb-2">
                  Resolution Notes <span className="text-rose-400">* (Required)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe code changes, patch PR, or config update that resolved this issue..."
                  value={transitionResolution}
                  onChange={(e) => setTransitionResolution(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                  required
                />
              </div>
            )}

            {/* When transition is REJECTED or REOPENED: Require Reason */}
            {(transitionTarget === DefectStatus.REJECTED || transitionTarget === DefectStatus.REOPENED) && (
              <div>
                <label className="block text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2">
                  Reason for {transitionTarget} <span className="text-rose-400">* (Required)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder={
                    transitionTarget === DefectStatus.REJECTED
                      ? 'Explain why this report is rejected (e.g. As designed, cannot reproduce, out of scope)...'
                      : 'Explain why the defect is being reopened (e.g. Failed retest in staging, regression in build v1.2)...'
                  }
                  value={transitionReason}
                  onChange={(e) => setTransitionReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  required
                />
              </div>
            )}

            {/* When transition is DUPLICATE: Select Canonical Defect */}
            {transitionTarget === DefectStatus.DUPLICATE && (
              <div>
                <label className="block text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">
                  Select Original Canonical Defect <span className="text-rose-400">* (Required)</span>
                </label>
                <select
                  value={transitionDuplicateOfId}
                  onChange={(e) => setTransitionDuplicateOfId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  required
                >
                  <option value="">-- Choose Canonical Defect --</option>
                  {(otherDefectsData?.defects || [])
                    .filter((d: DefectDto) => d.id !== defect.id)
                    .map((d: DefectDto) => (
                      <option key={d.id} value={d.id}>
                        {d.key} — {d.title} ({d.status})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTransitionTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-xs text-slate-300 border border-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeStatusTransition}
                disabled={transitionMutation.isPending}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-xs font-semibold text-white shadow-lg shadow-rose-600/30"
              >
                {transitionMutation.isPending ? 'Updating Status...' : `Confirm Move to ${transitionTarget}`}
              </button>
            </div>
          </div>
        )}

        {/* Workbench Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Workspace (3 columns) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Tabs Header */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-sm">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                  activeTab === 'details'
                    ? 'bg-rose-600/20 text-rose-300 border border-rose-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Bug className="w-4 h-4" />
                Details & Steps
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('links')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                  activeTab === 'links'
                    ? 'bg-rose-600/20 text-rose-300 border border-rose-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Link2 className="w-4 h-4" />
                Linked Tests ({defect.testLinks?.length || 0})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('comments')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                  activeTab === 'comments'
                    ? 'bg-rose-600/20 text-rose-300 border border-rose-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Comments & Discussions
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                  activeTab === 'history'
                    ? 'bg-rose-600/20 text-rose-300 border border-rose-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <History className="w-4 h-4" />
                Audit Trail & History
              </button>
            </div>

            {/* TAB: DETAILS & STEPS */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                {/* Description */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Summary & Description
                  </h3>
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {defect.description || 'No detailed description provided.'}
                  </p>
                </div>

                {/* Reproduction Steps */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Steps to Reproduce
                  </h3>
                  {defect.stepsToRepro ? (
                    <div className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-slate-200 whitespace-pre-wrap border border-slate-800/80">
                      {defect.stepsToRepro}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No specific steps recorded.</p>
                  )}
                </div>

                {/* Expected vs Actual */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-2">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                      Expected Behavior
                    </span>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap">
                      {defect.expectedResult || 'Not specified'}
                    </p>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-2">
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block">
                      Actual Observed Behavior
                    </span>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap">
                      {defect.actualResult || 'Not specified'}
                    </p>
                  </div>
                </div>

                {/* Root Cause & Resolution Notes */}
                {(defect.rootCause || defect.resolution) && (
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
                    <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                      Resolution & Root Cause Analysis
                    </h3>

                    {defect.resolution && (
                      <div>
                        <span className="text-xs font-semibold text-slate-400 block mb-1">
                          Resolution Notes
                        </span>
                        <p className="text-xs text-slate-200 bg-slate-950 p-3 rounded-xl border border-slate-800 whitespace-pre-wrap">
                          {defect.resolution}
                        </p>
                      </div>
                    )}

                    {defect.rootCause && (
                      <div>
                        <span className="text-xs font-semibold text-slate-400 block mb-1">
                          Root Cause Analysis
                        </span>
                        <p className="text-xs text-slate-200 bg-slate-950 p-3 rounded-xl border border-slate-800 whitespace-pre-wrap">
                          {defect.rootCause}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Technical Client Info */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Monitor className="w-3.5 h-3.5 text-blue-400" />
                    Client & Device Specifications
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Browser</span>
                      <span className="font-semibold text-white">{defect.browser || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Operating System</span>
                      <span className="font-semibold text-white">{defect.os || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">App Build</span>
                      <span className="font-semibold text-white">{defect.appVersion || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Device</span>
                      <span className="font-semibold text-white">{defect.device || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: LINKED TESTS & EXECUTIONS */}
            {activeTab === 'links' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-rose-400" />
                    Test Execution Traceability Links
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowLinkModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Link Test Case / Run
                  </button>
                </div>

                {defect.testLinks && defect.testLinks.length > 0 ? (
                  <div className="space-y-3">
                    {defect.testLinks.map((link: DefectTestLinkDto) => (
                      <div
                        key={link.id}
                        className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {link.testCase && (
                              <Link
                                href={`/projects/${projectId}/test-cases`}
                                className="font-mono font-bold text-emerald-400 hover:underline"
                              >
                                {link.testCase.key || link.testCase.id}
                              </Link>
                            )}
                            {link.testCase && (
                              <span className="text-white font-medium">
                                {link.testCase.title || 'Test Case'}
                              </span>
                            )}
                          </div>

                          <div className="text-slate-400 flex items-center gap-3 text-[11px]">
                            {link.testRun && (
                              <Link
                                href={`/projects/${projectId}/test-runs/${link.testRun.id}`}
                                className="text-blue-400 hover:underline flex items-center gap-1"
                              >
                                <PlayCircle className="w-3 h-3" />
                                Run: {link.testRun.name}
                              </Link>
                            )}
                            {link.testResult && (
                              <span className="uppercase font-semibold text-rose-400">
                                Result: {link.testResult.status} (Attempt #{link.testResult.attemptNumber})
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => unlinkTestMutation.mutate(link.id)}
                          disabled={unlinkTestMutation.isPending}
                          className="p-1.5 rounded-lg bg-slate-950 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Unlink"
                        >
                          <Unlink2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-500">
                    No test cases or executions are currently linked to this defect.
                  </div>
                )}

                {/* Link Test Execution Modal */}
                {showLinkModal && (
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Link Test Artifact
                    </h4>
                    {linkError && <p className="text-xs text-rose-400">{linkError}</p>}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-400 mb-1">Test Case</label>
                        <select
                          value={linkTestCaseId}
                          onChange={(e) => setLinkTestCaseId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                        >
                          <option value="">-- Select Test Case --</option>
                          {(testCasesData?.testCases || []).map((tc: any) => (
                            <option key={tc.id} value={tc.id}>
                              {tc.key} — {tc.title || tc.id}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1">Test Run</label>
                        <select
                          value={linkTestRunId}
                          onChange={(e) => setLinkTestRunId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                        >
                          <option value="">-- Select Test Run (Optional) --</option>
                          {(testRunsData?.testRuns || []).map((tr: any) => (
                            <option key={tr.id} value={tr.id}>
                              {tr.name} ({tr.status})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder="Link notes (e.g. Discovered during regression cycle 4)"
                        value={linkNotes}
                        onChange={(e) => setLinkNotes(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowLinkModal(false)}
                        className="px-3 py-1.5 bg-slate-950 rounded-lg text-xs text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          linkTestMutation.mutate({
                            testCaseId: linkTestCaseId || undefined,
                            testRunId: linkTestRunId || undefined,
                            notes: linkNotes.trim() || undefined,
                          })
                        }
                        disabled={linkTestMutation.isPending || (!linkTestCaseId && !linkTestRunId)}
                        className="px-4 py-1.5 bg-rose-600 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Confirm Link
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: COMMENTS & COLLABORATION */}
            {activeTab === 'comments' && (
              <div className="space-y-6">
                {/* Add Comment Box */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-rose-400" />
                      {replyParentId ? 'Replying to comment' : 'Add Discussion Comment'}
                    </span>
                    {replyParentId && (
                      <button
                        type="button"
                        onClick={() => setReplyParentId(null)}
                        className="text-[11px] text-slate-400 hover:text-white"
                      >
                        Cancel Reply
                      </button>
                    )}
                  </div>

                  <textarea
                    rows={3}
                    placeholder="Share findings, root cause analysis, or mention teammates..."
                    value={newCommentContent}
                    onChange={(e) => setNewCommentContent(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  />

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternalComment}
                        onChange={(e) => setIsInternalComment(e.target.checked)}
                        className="rounded bg-slate-950 border-slate-700 text-rose-600 focus:ring-rose-500"
                      />
                      <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                      <span>Internal Note (Hidden from client viewers)</span>
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        addCommentMutation.mutate({
                          content: newCommentContent.trim(),
                          isInternal: isInternalComment,
                          parentId: replyParentId || undefined,
                        })
                      }
                      disabled={addCommentMutation.isPending || !newCommentContent.trim()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-rose-600/20"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {addCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
                    </button>
                  </div>
                </div>

                {/* Comments List */}
                {commentsLoading ? (
                  <div className="p-8 text-center text-xs text-slate-400">Loading comments...</div>
                ) : comments.length === 0 ? (
                  <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-500">
                    No comments yet. Start the conversation above!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment: DefectCommentDto) => (
                      <div
                        key={comment.id}
                        className={`p-4 rounded-xl border text-xs space-y-2 ${
                          comment.isInternal
                            ? 'bg-amber-950/20 border-amber-900/40 text-amber-200'
                            : 'bg-slate-900/60 border-slate-800 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">
                              {comment.user
                                ? `${comment.user.firstName} ${comment.user.lastName}`
                                : 'User'}
                            </span>
                            {comment.isInternal && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                                INTERNAL NOTE
                              </span>
                            )}
                          </div>
                          <span className="text-slate-400 text-[11px]">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <p className="whitespace-pre-wrap leading-relaxed">{comment.content}</p>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/40 text-[11px]">
                          <button
                            type="button"
                            onClick={() => {
                              setReplyParentId(comment.id);
                              window.scrollTo({ top: 400, behavior: 'smooth' });
                            }}
                            className="text-rose-400 hover:underline"
                          >
                            Reply
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteCommentMutation.mutate(comment.id)}
                            className="text-slate-500 hover:text-rose-400"
                          >
                            Delete
                          </button>
                        </div>

                        {/* Render Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="ml-4 pl-3 border-l-2 border-slate-800 space-y-2 pt-2">
                            {comment.replies.map((reply: DefectCommentDto) => (
                              <div
                                key={reply.id}
                                className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/60 space-y-1"
                              >
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-semibold text-white">
                                    {reply.user
                                      ? `${reply.user.firstName} ${reply.user.lastName}`
                                      : 'User'}
                                  </span>
                                  <span className="text-slate-400">
                                    {new Date(reply.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-300">{reply.content}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: AUDIT TRAIL & HISTORY */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-rose-400" />
                  Chronological Defect History & State Transitions
                </h3>

                {historyLoading ? (
                  <div className="p-8 text-center text-xs text-slate-400">Loading audit history...</div>
                ) : history.length === 0 ? (
                  <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-500">
                    No historical modifications recorded yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((h: DefectHistoryDto) => (
                      <div
                        key={h.id}
                        className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex items-start justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">
                              {h.user ? `${h.user.firstName} ${h.user.lastName}` : 'System'}
                            </span>
                            <span className="text-slate-400">changed</span>
                            <span className="font-mono px-1.5 py-0.5 rounded bg-slate-800 text-rose-300 font-bold">
                              {h.field}
                            </span>
                          </div>

                          <div className="text-slate-300 flex items-center gap-2 text-[11px]">
                            <span className="text-slate-400 line-through">
                              {h.oldValue || '(empty)'}
                            </span>
                            <span>→</span>
                            <span className="font-semibold text-emerald-400">
                              {h.newValue || '(empty)'}
                            </span>
                          </div>

                          {h.reason && (
                            <p className="text-slate-400 text-[11px] italic bg-slate-950 p-2 rounded border border-slate-800/60">
                              Reason / Notes: {h.reason}
                            </p>
                          )}
                        </div>

                        <span className="text-slate-400 text-[11px] shrink-0">
                          {new Date(h.changedAt).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar Properties & Metadata (1 column) */}
          <div className="space-y-6">
            {/* Quick Assignment Controls */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
                Assignments & Roles
              </h3>

              {/* Developer Assignee */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Developer Assignee
                </label>
                <select
                  value={selectedAssignee}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedAssignee(val);
                    assignMutation.mutate({ assigneeId: val || undefined });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                >
                  <option value="">Unassigned</option>
                  {members.map((m: any) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user?.firstName} {m.user?.lastName} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* QA Owner */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  QA Owner / Verifier
                </label>
                <select
                  value={selectedQaOwner}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedQaOwner(val);
                    assignMutation.mutate({ qaOwnerId: val || undefined });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                >
                  <option value="">Unassigned</option>
                  {members.map((m: any) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user?.firstName} {m.user?.lastName} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scope & Metadata Details */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-3 text-xs">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
                Attributes
              </h3>

              <div>
                <span className="text-slate-400 block mb-0.5">Component</span>
                <span className="font-semibold text-white">{defect.component || 'General'}</span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Environment</span>
                <span className="font-semibold text-white">
                  {defect.environment?.name || 'Unspecified'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Milestone</span>
                <span className="font-semibold text-white">
                  {defect.milestone?.name || 'Unassigned'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Due Date</span>
                <span className="font-semibold text-white">
                  {defect.dueDate ? new Date(defect.dueDate).toLocaleDateString() : 'No Due Date'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Reporter</span>
                <span className="font-semibold text-white">
                  {defect.reporter
                    ? `${defect.reporter.firstName} ${defect.reporter.lastName}`
                    : 'System'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Created Date</span>
                <span className="font-semibold text-white">
                  {new Date(defect.createdAt).toLocaleString()}
                </span>
              </div>

              {defect.resolvedAt && (
                <div>
                  <span className="text-slate-400 block mb-0.5">Resolved Date</span>
                  <span className="font-semibold text-teal-400">
                    {new Date(defect.resolvedAt).toLocaleString()}
                  </span>
                </div>
              )}

              {defect.closedAt && (
                <div>
                  <span className="text-slate-400 block mb-0.5">Closed Date</span>
                  <span className="font-semibold text-slate-300">
                    {new Date(defect.closedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
