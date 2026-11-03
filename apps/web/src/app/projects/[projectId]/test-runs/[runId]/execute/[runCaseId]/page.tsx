'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import {
  ExecutionStatus,
  TestExecutionStepDto,
  TestResultDto,
  TestRunCaseDto,
} from '@ai-qa/shared-types';
import {
  PlayCircle,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  MinusCircle,
  RotateCcw,
  Clock,
  Upload,
  FileText,
  History,
  AlertCircle,
  ShieldAlert,
  Paperclip,
  Check,
  Timer,
  Bug,
  ExternalLink,
} from 'lucide-react';

export default function TestExecutionRunnerPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const projectId = params.projectId as string;
  const runId = params.runId as string;
  const runCaseId = params.runCaseId as string;

  // Execution Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  // Fetch Test Run details
  const { data: run, isLoading: runLoading } = useQuery({
    queryKey: ['test-run', projectId, runId],
    queryFn: () => defaultApiClient.getTestRun(projectId, runId),
  });

  // Fetch Execution History for this case
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['execution-history', projectId, runId, runCaseId],
    queryFn: () => defaultApiClient.getExecutionHistory(projectId, runId, runCaseId),
  });

  // Fetch Defects for this project to show linked defects
  const { data: defectsData } = useQuery({
    queryKey: ['project-defects-for-case', projectId],
    queryFn: () => defaultApiClient.getDefects(projectId, { limit: 100 }),
  });

  const runCase = run?.cases?.find((c: TestRunCaseDto) => c.id === runCaseId);
  const steps = runCase?.testCaseVersion?.steps || [];

  // Form State
  const [stepExecutions, setStepExecutions] = useState<
    Record<
      number,
      {
        status: ExecutionStatus;
        actualResult: string;
        comment: string;
      }
    >
  >({});

  const [actualResult, setActualResult] = useState('');
  const [failureReason, setFailureReason] = useState('');
  const [comment, setComment] = useState('');
  const [isRetestMode, setIsRetestMode] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedAttachmentId, setUploadedAttachmentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize step status when steps load
  useEffect(() => {
    if (steps.length > 0 && Object.keys(stepExecutions).length === 0) {
      const initial: Record<number, any> = {};
      steps.forEach((s: any) => {
        initial[s.stepNumber] = {
          status: ExecutionStatus.PASSED,
          actualResult: '',
          comment: '',
        };
      });
      setStepExecutions(initial);
    }
  }, [steps]);

  // Set retest mode if case was already executed
  useEffect(() => {
    if (runCase && runCase.status !== ExecutionStatus.NOT_RUN) {
      setIsRetestMode(true);
    }
  }, [runCase]);

  const handleStepStatusChange = (stepNum: number, status: ExecutionStatus) => {
    setStepExecutions((prev) => ({
      ...prev,
      [stepNum]: {
        ...prev[stepNum],
        status,
      },
    }));
  };

  const handleStepActualResultChange = (stepNum: number, actual: string) => {
    setStepExecutions((prev) => ({
      ...prev,
      [stepNum]: {
        ...prev[stepNum],
        actualResult: actual,
      },
    }));
  };

  // Submit Normal Execution
  const submitExecutionMutation = useMutation({
    mutationFn: async () => {
      setIsTimerRunning(false);

      const stepResults = Object.entries(stepExecutions).map(([num, data]) => ({
        stepNumber: parseInt(num, 10),
        status: data.status,
        actualResult: data.actualResult.trim() || undefined,
        comment: data.comment.trim() || undefined,
      }));

      // Upload attachment if selected
      let attachmentIds: string[] = [];
      if (selectedFile) {
        setUploadingFile(true);
        const form = new FormData();
        form.append('file', selectedFile);
        const uploaded = await defaultApiClient.uploadAttachment(projectId, form);
        attachmentIds.push(uploaded.id);
        setUploadingFile(false);
      }

      return defaultApiClient.submitExecution(projectId, runId, runCaseId, {
        actualResult: actualResult.trim() || undefined,
        failureReason: failureReason.trim() || undefined,
        comment: comment.trim() || undefined,
        durationMs: elapsedSeconds * 1000,
        stepResults,
        attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-run', projectId, runId] });
      queryClient.invalidateQueries({ queryKey: ['execution-history', projectId, runId, runCaseId] });
      router.push(`/projects/${projectId}/test-runs/${runId}`);
    },
    onError: (err: any) => {
      setError(err.message || 'Execution submission failed');
    },
  });

  // Submit Retest Execution
  const retestExecutionMutation = useMutation({
    mutationFn: async () => {
      setIsTimerRunning(false);

      const stepResults = Object.entries(stepExecutions).map(([num, data]) => ({
        stepNumber: parseInt(num, 10),
        status: data.status,
        actualResult: data.actualResult.trim() || undefined,
        comment: data.comment.trim() || undefined,
      }));

      let attachmentIds: string[] = [];
      if (selectedFile) {
        setUploadingFile(true);
        const form = new FormData();
        form.append('file', selectedFile);
        const uploaded = await defaultApiClient.uploadAttachment(projectId, form);
        attachmentIds.push(uploaded.id);
        setUploadingFile(false);
      }

      return defaultApiClient.retestExecution(projectId, runId, runCaseId, {
        actualResult: actualResult.trim() || undefined,
        failureReason: failureReason.trim() || undefined,
        comment: comment.trim() || undefined,
        durationMs: elapsedSeconds * 1000,
        stepResults,
        attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-run', projectId, runId] });
      queryClient.invalidateQueries({ queryKey: ['execution-history', projectId, runId, runCaseId] });
      router.push(`/projects/${projectId}/test-runs/${runId}`);
    },
    onError: (err: any) => {
      setError(err.message || 'Retest execution submission failed');
    },
  });

  if (runLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Clock className="w-5 h-5 animate-spin text-emerald-500 mr-3" />
        Loading execution session...
      </div>
    );
  }

  if (!runCase) {
    return (
      <div className="min-h-screen bg-slate-950 p-10 flex flex-col items-center justify-center text-slate-400 gap-4">
        <AlertCircle className="w-10 h-10 text-rose-400" />
        <p className="text-white text-lg font-semibold">Test case not found in this run</p>
        <Link
          href={`/projects/${projectId}/test-runs/${runId}`}
          className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-300 hover:text-white"
        >
          Return to Run Workbench
        </Link>
      </div>
    );
  }

  const tcVersion = runCase.testCaseVersion;
  const tc = tcVersion.testCase;
  const historyList: TestResultDto[] = historyData || [];

  const anyStepFailed = Object.values(stepExecutions).some(
    (s) => s.status === ExecutionStatus.FAILED
  );

  const linkedDefects = (defectsData?.defects || []).filter(
    (d: any) =>
      d.testLinks?.some((l: any) => l.testCaseId === tc?.id || l.testRunId === runId) ||
      d.testCaseId === tc?.id ||
      (tc?.key && d.title?.includes(tc.key))
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/projects/${projectId}/test-runs/${runId}`}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                <Link
                  href={`/projects/${projectId}/test-runs/${runId}`}
                  className="hover:text-slate-200"
                >
                  {run?.name}
                </Link>
                <span>/</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {tc?.key || `TC-${tc?.caseNumber}`}
                </span>
                <span>/</span>
                <span>v{tcVersion.versionNumber}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
                <PlayCircle className="w-7 h-7 text-emerald-400" />
                {tcVersion.title}
              </h1>
            </div>
          </div>

          {/* Live Timer Counter */}
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 font-mono text-sm text-slate-200 shadow-inner">
            <Timer className={`w-4 h-4 ${isTimerRunning ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            <span>
              {Math.floor(elapsedSeconds / 60)
                .toString()
                .padStart(2, '0')}
              :{(elapsedSeconds % 60).toString().padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="text-xs text-slate-400 hover:text-white underline ml-1"
            >
              {isTimerRunning ? 'Pause' : 'Resume'}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Case Metadata & Preconditions */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Priority</span>
              <span className="font-semibold text-white uppercase">{tcVersion.priority}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Test Type</span>
              <span className="font-semibold text-slate-200 uppercase">{tcVersion.type}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Current Case Status</span>
              <span className="font-semibold text-emerald-400 uppercase">{runCase.status}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Attempts Logged</span>
              <span className="font-semibold text-purple-400">{historyList.length}</span>
            </div>
          </div>

          {tcVersion.preconditions && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
              <span className="font-semibold text-amber-400 uppercase tracking-wider block mb-1">
                Preconditions
              </span>
              <p className="text-slate-300 whitespace-pre-wrap">{tcVersion.preconditions}</p>
            </div>
          )}

          {tcVersion.description && (
            <div className="text-xs text-slate-400">
              <span className="font-semibold text-slate-300 block mb-1">Description</span>
              <p>{tcVersion.description}</p>
            </div>
          )}
        </div>

        {/* Step-by-Step Interactive Execution */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Step-by-Step Verification ({steps.length} Steps)
            </h2>
            <span className="text-xs text-slate-400">
              Backend automatically computes final case status from step results
            </span>
          </div>

          {steps.map((step: any) => {
            const currentStep = stepExecutions[step.stepNumber] || {
              status: ExecutionStatus.PASSED,
              actualResult: '',
              comment: '',
            };

            return (
              <div
                key={step.stepNumber}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-200 text-xs font-bold flex items-center justify-center">
                      {step.stepNumber}
                    </span>
                    <span className="text-sm font-semibold text-white">{step.action}</span>
                  </div>

                  {/* Status Radio Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {[
                      { status: ExecutionStatus.PASSED, label: 'Pass', color: 'emerald' },
                      { status: ExecutionStatus.FAILED, label: 'Fail', color: 'rose' },
                      { status: ExecutionStatus.BLOCKED, label: 'Block', color: 'amber' },
                      { status: ExecutionStatus.SKIPPED, label: 'Skip', color: 'slate' },
                    ].map((pill) => {
                      const isSelected = currentStep.status === pill.status;
                      return (
                        <button
                          key={pill.status}
                          type="button"
                          onClick={() => handleStepStatusChange(step.stepNumber, pill.status)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                            isSelected
                              ? pill.color === 'emerald'
                                ? 'bg-emerald-600 text-white'
                                : pill.color === 'rose'
                                ? 'bg-rose-600 text-white'
                                : pill.color === 'amber'
                                ? 'bg-amber-600 text-white'
                                : 'bg-slate-700 text-white'
                              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {pill.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">Expected Result</span>
                    <p className="text-slate-200 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 font-mono">
                      {step.expectedResult}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1">Actual Observed Result</span>
                    <input
                      type="text"
                      placeholder="Observed outcome (e.g. As expected, or button unresponsive)"
                      value={currentStep.actualResult}
                      onChange={(e) =>
                        handleStepActualResultChange(step.stepNumber, e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Overall Execution Details */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-white border-b border-slate-800/80 pb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            Execution Summary & Defect Evidence
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Overall Observed Result
              </label>
              <textarea
                rows={2}
                placeholder="Overall behavioral summary..."
                value={actualResult}
                onChange={(e) => setActualResult(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                Failure Reason {anyStepFailed && <span className="text-rose-400">*</span>}
              </label>
              <textarea
                rows={2}
                placeholder="If failed or blocked, specify root cause or error code..."
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              />
            </div>
          </div>

          {/* Attachment Upload */}
          <div className="pt-2 border-t border-slate-800/80">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-slate-400" />
              Upload Defect Evidence / Screenshot (Images, PDFs, Logs - Max 10MB)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
                className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
              />
              {selectedFile && (
                <span className="text-xs text-emerald-400">
                  Ready to attach ({Math.round(selectedFile.size / 1024)} KB)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <Link
            href={`/projects/${projectId}/test-runs/${runId}`}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm font-medium border border-slate-800 transition-colors"
          >
            Cancel
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href={`/projects/${projectId}/defects/new?testCaseId=${tc?.id}&runId=${runId}&actualResult=${encodeURIComponent(
                actualResult || ''
              )}&failureReason=${encodeURIComponent(
                failureReason || ''
              )}&title=${encodeURIComponent(`[Failure] ${tcVersion.title}`)}`}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                anyStepFailed
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-600/30'
                  : 'bg-slate-900 hover:bg-slate-800 text-rose-400 border-slate-800'
              }`}
            >
              <Bug className="w-4 h-4" />
              Log Defect
            </Link>

            {isRetestMode ? (
              <button
                type="button"
                onClick={() => retestExecutionMutation.mutate()}
                disabled={retestExecutionMutation.isPending || uploadingFile}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium text-sm transition-all shadow-lg shadow-purple-600/20"
              >
                <RotateCcw className="w-4 h-4" />
                {retestExecutionMutation.isPending
                  ? 'Recording Retest Attempt...'
                  : `Submit Retest Attempt #${historyList.length + 1}`}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => submitExecutionMutation.mutate()}
                disabled={submitExecutionMutation.isPending || uploadingFile}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-sm transition-all shadow-lg shadow-emerald-600/20"
              >
                <Check className="w-4 h-4" />
                {submitExecutionMutation.isPending ? 'Submitting Execution...' : 'Submit Execution'}
              </button>
            )}
          </div>
        </div>

        {/* Known Linked Defects for Retest */}
        {linkedDefects.length > 0 && (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-slate-800/80 pb-3">
              <Bug className="w-4 h-4 text-rose-400" />
              Known Linked Defects ({linkedDefects.length})
            </h2>
            <div className="space-y-3">
              {linkedDefects.map((def: any) => (
                <div
                  key={def.id}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-rose-400">{def.key}</span>
                      <span className="text-white font-medium">{def.title}</span>
                    </div>
                    <div className="text-slate-400 flex items-center gap-2 text-[11px]">
                      <span>
                        Severity: <strong className="text-slate-200">{def.severity}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Status: <strong className="text-emerald-400">{def.status}</strong>
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/projects/${projectId}/defects/${def.id}`}
                    target="_blank"
                    className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 font-medium border border-slate-800"
                  >
                    <span>View Defect</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Execution History & Retest Audit Trail */}
        {historyList.length > 0 && (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-slate-800/80 pb-3">
              <History className="w-4 h-4 text-emerald-400" />
              Previous Execution Attempts History
            </h2>

            <div className="space-y-3">
              {historyList.map((res) => (
                <div
                  key={res.id}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white px-2 py-0.5 rounded bg-slate-800">
                        Attempt #{res.attemptNumber}
                      </span>
                      <span className="font-semibold uppercase text-emerald-400">
                        {res.status}
                      </span>
                    </div>
                    <div className="text-slate-400">
                      <span>
                        {res.executedBy
                          ? `${res.executedBy.firstName} ${res.executedBy.lastName}`
                          : 'System'}
                      </span>
                      <span className="mx-2">•</span>
                      <span>{new Date(res.executedAt).toLocaleString()}</span>
                      {res.durationMs && (
                        <>
                          <span className="mx-2">•</span>
                          <span>{Math.round(res.durationMs / 1000)}s</span>
                        </>
                      )}
                    </div>
                  </div>

                  {res.failureReason && (
                    <div className="text-rose-400 bg-rose-950/20 p-2 rounded border border-rose-900/40">
                      Failure Reason: {res.failureReason}
                    </div>
                  )}

                  {res.actualResult && (
                    <div className="text-slate-300">Observed: {res.actualResult}</div>
                  )}

                  {res.attachments && res.attachments.length > 0 && (
                    <div className="flex items-center gap-2 pt-1 text-slate-400">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>{res.attachments.length} attachment(s) recorded</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
