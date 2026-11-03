'use client';

import React, { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import {
  AIGenerationDto,
  AIGenerationItemDto,
  AIReviewStatus,
  AIFeedbackRating,
} from '@ai-qa/shared-types';
import {
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Edit3,
  CheckSquare,
  ShieldAlert,
  Sliders,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Layers,
  Star,
  Check,
  ChevronDown,
} from 'lucide-react';

export default function AITestGenerationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const projectId = params.projectId as string;
  const initialGenId = searchParams.get('generationId');

  // Form state
  const [requirementText, setRequirementText] = useState('');
  const [targetCount, setTargetCount] = useState(5);
  const [suiteId, setSuiteId] = useState<string>('');
  const [includeEdgeCases, setIncludeEdgeCases] = useState(true);
  const [includeSecurity, setIncludeSecurity] = useState(true);

  // Active generation state
  const [activeGeneration, setActiveGeneration] = useState<AIGenerationDto | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Rejection modal state
  const [rejectingItemId, setRejectingItemId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Feedback state
  const [rating, setRating] = useState(5);
  const [ratingCategory, setRatingCategory] = useState<AIFeedbackRating>(AIFeedbackRating.HELPFUL);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Fetch test suites
  const { data: suites } = useQuery({
    queryKey: ['test-suites', projectId],
    queryFn: () => defaultApiClient.getTestSuites(projectId),
  });

  // If initialGenId is present in URL, fetch it
  useQuery({
    queryKey: ['ai-generation', projectId, initialGenId],
    queryFn: async () => {
      if (!initialGenId) return null;
      const gen = await defaultApiClient.getAIGeneration(projectId, initialGenId);
      setActiveGeneration(gen);
      return gen;
    },
    enabled: !!initialGenId,
  });

  // Generate Mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      return defaultApiClient.generateTestCases(projectId, {
        requirementText,
        targetCount,
        suiteId: suiteId || null,
        includeEdgeCases,
        includeSecurity,
      });
    },
    onSuccess: (data) => {
      setActiveGeneration(data);
      queryClient.invalidateQueries({ queryKey: ['ai-generations', projectId] });
      queryClient.invalidateQueries({ queryKey: ['ai-usage-metrics', projectId] });
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to generate test cases');
    },
  });

  // Review Item Mutation
  const reviewMutation = useMutation({
    mutationFn: async ({
      itemId,
      reviewStatus,
      reason,
    }: {
      itemId: string;
      reviewStatus: AIReviewStatus;
      reason?: string;
    }) => {
      if (!activeGeneration) return;
      return defaultApiClient.reviewAIGenerationItem(projectId, activeGeneration.id, itemId, {
        reviewStatus,
        rejectionReason: reason || null,
        suiteId: suiteId || null,
      });
    },
    onSuccess: (updatedItem) => {
      if (!updatedItem || !activeGeneration) return;
      setActiveGeneration((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items?.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
        };
      });
      queryClient.invalidateQueries({ queryKey: ['test-cases', projectId] });
    },
  });

  // Batch Review Mutation
  const batchReviewMutation = useMutation({
    mutationFn: async (action: 'ACCEPT' | 'REJECT') => {
      if (!activeGeneration || !activeGeneration.items) return;
      const pendingIds = activeGeneration.items
        .filter((i) => i.reviewStatus === AIReviewStatus.PROPOSED)
        .map((i) => i.id);

      if (pendingIds.length === 0) return;

      return defaultApiClient.batchReviewAIGenerationItems(projectId, activeGeneration.id, {
        generationId: activeGeneration.id,
        itemIds: pendingIds,
        action,
        targetSuiteId: suiteId || null,
      });
    },
    onSuccess: () => {
      if (activeGeneration) {
        defaultApiClient.getAIGeneration(projectId, activeGeneration.id).then((fresh) => {
          setActiveGeneration(fresh);
        });
      }
      queryClient.invalidateQueries({ queryKey: ['test-cases', projectId] });
    },
  });

  // Feedback Mutation
  const feedbackMutation = useMutation({
    mutationFn: async () => {
      if (!activeGeneration) return;
      return defaultApiClient.submitAIFeedback(projectId, activeGeneration.id, {
        rating,
        ratingCategory,
        comments: feedbackComments || null,
      });
    },
    onSuccess: () => {
      setFeedbackSubmitted(true);
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb Header */}
      <div>
        <div className="flex items-center space-x-2 text-sm text-slate-500 mb-2">
          <Link href={`/projects/${projectId}/ai`} className="hover:text-blue-600 flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            AI Intelligence Hub
          </Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-white font-medium">Test Case Generation</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-blue-600" />
          AI Test Case Generator
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Synthesize comprehensive test suites covering positive, negative, boundary, and security scenarios with mandatory human verification.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Form on Left, Workbench on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Specification Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="h-5 w-5 text-blue-600" />
              Requirements & Scope
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Requirements / User Stories / Acceptance Criteria
              </label>
              <textarea
                value={requirementText}
                onChange={(e) => setRequirementText(e.target.value)}
                rows={8}
                placeholder="Paste your requirement, user story, or API contract here...&#10;&#10;e.g. As an authenticated user, I should be able to request a password reset email containing a one-time token that expires in 15 minutes."
                className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                <span>Credentials, tokens, and secrets are automatically redacted before processing.</span>
                <span>{requirementText.length} chars</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Target Count
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={targetCount}
                  onChange={(e) => setTargetCount(parseInt(e.target.value, 10) || 5)}
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Target Test Suite
                </label>
                <select
                  value={suiteId}
                  onChange={(e) => setSuiteId(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="">Default Project Root</option>
                  {suites?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center space-x-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeEdgeCases}
                  onChange={(e) => setIncludeEdgeCases(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium">Include boundary & negative edge cases</span>
              </label>

              <label className="flex items-center space-x-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSecurity}
                  onChange={(e) => setIncludeSecurity(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium">Include security, authentication & injection tests</span>
              </label>
            </div>

            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || requirementText.trim().length < 10}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {generateMutation.isPending ? 'Generating Test Cases...' : 'Generate Test Cases with AI'}
            </button>
          </div>
        </div>

        {/* Generated Proposals Review Workbench */}
        <div className="lg:col-span-7 space-y-6">
          {!activeGeneration ? (
            <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-full w-fit mx-auto">
                <CheckSquare className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">AI Generation Proposals</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Enter your specification on the left and click Generate. Generated test cases appear here for review and official commitment.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Batch Actions Bar */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Generated {activeGeneration.items?.length || 0} Test Case Proposals
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Model: {activeGeneration.provider} ({activeGeneration.modelName}) • Latency: {activeGeneration.latencyMs}ms
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => batchReviewMutation.mutate('ACCEPT')}
                    disabled={batchReviewMutation.isPending}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Accept All
                  </button>
                  <button
                    onClick={() => batchReviewMutation.mutate('REJECT')}
                    disabled={batchReviewMutation.isPending}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reject Pending
                  </button>
                </div>
              </div>

              {/* Proposals List */}
              <div className="space-y-4">
                {activeGeneration.items?.map((item: AIGenerationItemDto) => {
                  const content = item.content as any;
                  const isAccepted = item.reviewStatus === AIReviewStatus.ACCEPTED;
                  const isRejected = item.reviewStatus === AIReviewStatus.REJECTED;

                  return (
                    <div
                      key={item.id}
                      className={`bg-white dark:bg-slate-800 rounded-2xl border p-5 space-y-4 shadow-sm transition-all ${
                        isAccepted
                          ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/20'
                          : isRejected
                          ? 'border-slate-200 opacity-60'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              content.scenarioType === 'SECURITY'
                                ? 'bg-red-100 text-red-700'
                                : content.scenarioType === 'NEGATIVE'
                                ? 'bg-amber-100 text-amber-700'
                                : content.scenarioType === 'BOUNDARY'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {content.scenarioType || 'FUNCTIONAL'}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            Priority: {content.priority || 'MEDIUM'}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            Type: {content.type || 'FUNCTIONAL'}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {isAccepted ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Committed as Official Case
                            </span>
                          ) : isRejected ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                              <XCircle className="h-3.5 w-3.5" />
                              Rejected ({item.rejectionReason || 'Declined'})
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                              Proposed (Awaiting Review)
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h4>
                        {content.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{content.description}</p>
                        )}
                        {content.preconditions && (
                          <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                            <span className="font-semibold text-slate-700 dark:text-slate-200">Preconditions: </span>
                            {content.preconditions}
                          </div>
                        )}
                      </div>

                      {/* Steps Table */}
                      {content.steps && Array.isArray(content.steps) && content.steps.length > 0 && (
                        <div className="overflow-x-auto border border-slate-100 dark:border-slate-700 rounded-lg">
                          <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 uppercase text-[9px]">
                              <tr>
                                <th className="p-2 w-8">#</th>
                                <th className="p-2">Action</th>
                                <th className="p-2">Test Data</th>
                                <th className="p-2">Expected Result</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-600 dark:text-slate-300">
                              {content.steps.map((st: any, idx: number) => (
                                <tr key={idx}>
                                  <td className="p-2 font-bold text-slate-400">{st.stepNumber || idx + 1}</td>
                                  <td className="p-2 font-medium">{st.action}</td>
                                  <td className="p-2 font-mono text-slate-500">{st.testData || '-'}</td>
                                  <td className="p-2 text-emerald-700 dark:text-emerald-400 font-medium">{st.expectedResult}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Review Buttons if Proposed */}
                      {item.reviewStatus === AIReviewStatus.PROPOSED && (
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                          <button
                            onClick={() =>
                              reviewMutation.mutate({
                                itemId: item.id,
                                reviewStatus: AIReviewStatus.ACCEPTED,
                              })
                            }
                            disabled={reviewMutation.isPending}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Accept & Commit
                          </button>
                          <button
                            onClick={() => {
                              setRejectingItemId(item.id);
                              setRejectionReason('');
                            }}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:border-rose-300 text-slate-600 hover:text-rose-600 text-xs font-semibold transition-colors"
                          >
                            Reject Proposal
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Feedback Component */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  Evaluate AI Generation Quality
                </h3>

                {feedbackSubmitted ? (
                  <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Thank you! Your feedback helps calibrate the prompt quality evaluations.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-500 font-semibold">Rating:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setRating(star)}
                            className={`p-1 ${rating >= star ? 'text-amber-400' : 'text-slate-300'}`}
                          >
                            <Star className="h-4 w-4 fill-current" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        AIFeedbackRating.HELPFUL,
                        AIFeedbackRating.NOT_HELPFUL,
                        AIFeedbackRating.INACCURATE,
                        AIFeedbackRating.INCOMPLETE,
                      ].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setRatingCategory(cat)}
                          className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-colors ${
                            ratingCategory === cat
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      placeholder="Optional feedback comments..."
                      value={feedbackComments}
                      onChange={(e) => setFeedbackComments(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                    />

                    <button
                      onClick={() => feedbackMutation.mutate()}
                      disabled={feedbackMutation.isPending}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-colors"
                    >
                      Submit Feedback
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rejection Reason Modal */}
      {rejectingItemId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Reject Proposed Test Case</h3>
            <p className="text-xs text-slate-500">
              Provide a rationale for rejecting this proposal for calibration and audit history.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Redundant scenario already covered in regression suite..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectingItemId(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (rejectingItemId) {
                    reviewMutation.mutate({
                      itemId: rejectingItemId,
                      reviewStatus: AIReviewStatus.REJECTED,
                      reason: rejectionReason,
                    });
                    setRejectingItemId(null);
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
