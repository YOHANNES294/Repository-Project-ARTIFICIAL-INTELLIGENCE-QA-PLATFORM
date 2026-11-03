'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import { AIDuplicateAnalysisDto } from '@ai-qa/shared-types';
import {
  Search,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Layers,
  Link as LinkIcon,
  GitMerge,
  ShieldCheck,
  Check,
} from 'lucide-react';

export default function AIDuplicateIntelligencePage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [component, setComponent] = useState('');
  const [duplicateResult, setDuplicateResult] = useState<AIDuplicateAnalysisDto | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      return defaultApiClient.analyzeDuplicateDefect(projectId, {
        title: title.trim(),
        description: description.trim(),
        component: component.trim() || null,
      });
    },
    onSuccess: (data) => {
      setDuplicateResult(data);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to analyze duplicate defects');
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-sm text-slate-500 mb-2">
          <Link href={`/projects/${projectId}/ai`} className="hover:text-blue-600 flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            AI Intelligence Hub
          </Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-white font-medium">Duplicate Defect Intelligence</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Search className="h-7 w-7 text-purple-600" />
          Duplicate Defect Intelligence
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Perform dual lexical and semantic embedding analysis across project defect logs to prevent duplicate bug filings.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Candidate Defect Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Copy className="h-5 w-5 text-purple-600" />
              Candidate Defect Info
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Defect Title / Summary
              </label>
              <input
                type="text"
                placeholder="e.g. Session expires prematurely after 2 minutes of inactivity"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Detailed Description & Reproduction
              </label>
              <textarea
                rows={6}
                placeholder="Enter detailed error behavior, stack trace, or reproduction steps..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Component / Module (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Authentication, Billing, Dashboard"
                value={component}
                onChange={(e) => setComponent(e.target.value)}
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending || title.trim().length < 3}
              className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {analyzeMutation.isPending ? 'Comparing Defects...' : 'Check Duplicate Similarity'}
            </button>
          </div>
        </div>

        {/* Results Display */}
        <div className="lg:col-span-7 space-y-6">
          {!duplicateResult ? (
            <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3">
              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-full w-fit mx-auto">
                <Search className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Duplicate Analysis Output</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Enter your candidate defect on the left to analyze similarity against all existing defects in this project.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Match Card */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                      Top Match Comparison
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2">
                      {duplicateResult.candidateKey !== 'NONE' ? (
                        <Link
                          href={`/projects/${projectId}/defects/${duplicateResult.candidateDefectId}`}
                          className="hover:underline text-indigo-600 flex items-center gap-1.5"
                        >
                          {duplicateResult.candidateKey}: {duplicateResult.candidateTitle}
                        </Link>
                      ) : (
                        duplicateResult.candidateTitle
                      )}
                    </h3>
                  </div>

                  {/* Recommendation Action Badge */}
                  <div>
                    <span
                      className={`text-xs font-bold uppercase px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
                        duplicateResult.suggestedAction === 'MARK_DUPLICATE'
                          ? 'bg-rose-100 text-rose-800'
                          : duplicateResult.suggestedAction === 'LINK_RELATED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {duplicateResult.suggestedAction === 'MARK_DUPLICATE' ? (
                        <GitMerge className="h-4 w-4" />
                      ) : duplicateResult.suggestedAction === 'LINK_RELATED' ? (
                        <LinkIcon className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Recommendation: {duplicateResult.suggestedAction.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Meter Bar */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Similarity Score</span>
                    <span className="text-purple-600 font-extrabold">
                      {Math.round(duplicateResult.similarityScore * 100)}% ({duplicateResult.confidenceLevel} Confidence)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        duplicateResult.similarityScore > 0.7
                          ? 'bg-rose-500'
                          : duplicateResult.similarityScore > 0.4
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.round(duplicateResult.similarityScore * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Indicators */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Error Signature Match</span>
                    <span className={`text-xs font-bold ${duplicateResult.errorSignatureMatch ? 'text-rose-600' : 'text-slate-400'}`}>
                      {duplicateResult.errorSignatureMatch ? 'Exact Match' : 'None Detected'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Component Alignment</span>
                    <span className={`text-xs font-bold ${duplicateResult.componentMatch ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {duplicateResult.componentMatch ? 'Aligned' : 'Different / Unspecified'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Match Factors */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-purple-600" />
                  Key Match Factors & Evaluation Rationale
                </h4>
                <ul className="space-y-2">
                  {duplicateResult.matchReasons.map((reason, idx) => (
                    <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-purple-600" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
