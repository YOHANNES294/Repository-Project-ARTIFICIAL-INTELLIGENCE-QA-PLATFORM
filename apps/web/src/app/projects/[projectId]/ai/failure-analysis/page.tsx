'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import { AIFailureAnalysisDto } from '@ai-qa/shared-types';
import {
  ShieldAlert,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  Wrench,
  Activity,
  Bug,
} from 'lucide-react';

export default function AIFailureAnalysisPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [testResultId, setTestResultId] = useState('');
  const [additionalLogs, setAdditionalLogs] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AIFailureAnalysisDto | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch recent test runs to help user pick failed executions
  const { data: testRuns } = useQuery({
    queryKey: ['test-runs', projectId],
    queryFn: () => defaultApiClient.getTestRuns(projectId),
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      return defaultApiClient.analyzeTestFailure(projectId, {
        testResultId: testResultId.trim(),
        additionalLogs: additionalLogs.trim() || null,
      });
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to analyze test execution failure');
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
          <span className="text-slate-900 dark:text-white font-medium">Failure Diagnostics</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldAlert className="h-7 w-7 text-rose-600" />
          AI Execution Failure Diagnostics
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Perform automated root-cause failure analysis with strict separation between directly observed facts and probable hypotheses.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-rose-600" />
              Target Execution
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Execution Result UUID
              </label>
              <input
                type="text"
                placeholder="e.g. c1111111-1111-4111-8111-111111111111"
                value={testResultId}
                onChange={(e) => setTestResultId(e.target.value)}
                className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Enter the TestResult ID from any failed run case attempt.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Additional Server / Gateway Logs (Optional)
              </label>
              <textarea
                rows={5}
                placeholder="Paste relevant application stack traces, HTTP payload responses, or gateway logs..."
                value={additionalLogs}
                onChange={(e) => setAdditionalLogs(e.target.value)}
                className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending || !testResultId.trim()}
              className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {analyzeMutation.isPending ? 'Diagnosing Root Cause...' : 'Analyze Failure with AI'}
            </button>
          </div>
        </div>

        {/* Diagnostic Results Display */}
        <div className="lg:col-span-7 space-y-6">
          {!analysisResult ? (
            <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-full w-fit mx-auto">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Failure Diagnostics Output</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Enter a failed execution result ID on the left to extract root cause hypotheses and debugging steps.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-rose-100 text-rose-800">
                    Diagnostic Summary
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">
                      Suggested Severity:
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-extrabold bg-red-100 text-red-700">
                      {analysisResult.suggestedSeverity}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-extrabold bg-amber-100 text-amber-700">
                      {analysisResult.suggestedPriority}
                    </span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {analysisResult.summary}
                </h3>

                {analysisResult.affectedComponents && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-400 font-semibold">Affected Modules:</span>
                    {analysisResult.affectedComponents.map((comp) => (
                      <span key={comp} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                        {comp}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Observed Facts */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Directly Observed Facts (Execution Telemetry)
                </h4>
                <ul className="space-y-2">
                  {analysisResult.observedFacts.map((fact, idx) => (
                    <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 font-mono">
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Hypotheses */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4 text-indigo-500" />
                  Root Cause Hypotheses (Probabilistic Diagnostics)
                </h4>
                <div className="space-y-3">
                  {analysisResult.hypotheses.map((h, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                          {h.title}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-200 dark:bg-indigo-800 text-indigo-900 dark:text-indigo-200">
                            {h.probability} Probability
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">
                            {Math.round(h.confidence * 100)}% Confidence
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {h.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Debugging Steps */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Wrench className="h-4 w-4 text-amber-500" />
                  Recommended Debugging & Remediation Steps
                </h4>
                <ol className="space-y-2 list-decimal list-inside text-xs text-slate-700 dark:text-slate-300 font-medium">
                  {analysisResult.suggestedDebuggingSteps.map((step, idx) => (
                    <li key={idx} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
