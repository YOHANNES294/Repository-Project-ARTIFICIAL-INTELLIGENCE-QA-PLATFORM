'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import { AIQAReportDto } from '@ai-qa/shared-types';
import {
  FileText,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Calendar,
  Layers,
  ArrowUpRight,
  TrendingUp,
  AlertOctagon,
} from 'lucide-react';

export default function AIQAReportPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [milestoneId, setMilestoneId] = useState('');
  const [testPlanId, setTestPlanId] = useState('');
  const [timeframeDays, setTimeframeDays] = useState(30);
  const [reportResult, setReportResult] = useState<AIQAReportDto | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: milestones } = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => defaultApiClient.getMilestones(projectId),
  });

  const { data: testPlans } = useQuery({
    queryKey: ['test-plans', projectId],
    queryFn: () => defaultApiClient.getTestPlans(projectId),
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      return defaultApiClient.generateQAReport(projectId, {
        milestoneId: milestoneId || null,
        testPlanId: testPlanId || null,
        timeframeDays,
      });
    },
    onSuccess: (data) => {
      setReportResult(data);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to generate QA report');
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
          <span className="text-slate-900 dark:text-white font-medium">Executive QA Report</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="h-7 w-7 text-teal-600" />
          Executive QA Release Summary Report
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Synthesize executive quality summaries and release readiness assessments grounded strictly in actual project metrics.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Control Panel */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Milestone Scope
            </label>
            <select
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="">Full Project Scope</option>
              {milestones?.milestones?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Test Plan Scope
            </label>
            <select
              value={testPlanId}
              onChange={(e) => setTestPlanId(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="">All Test Plans</option>
              {testPlans?.testPlans?.map((tp) => (
                <option key={tp.id} value={tp.id}>
                  {tp.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Timeframe
            </label>
            <select
              value={timeframeDays}
              onChange={(e) => setTimeframeDays(parseInt(e.target.value, 10))}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value={7}>Last 7 Days</option>
              <option value={14}>Last 14 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={90}>Last 90 Days</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="w-full md:w-auto px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="h-4 w-4" />
          {generateMutation.isPending ? 'Synthesizing Executive Report...' : 'Generate QA Report'}
        </button>
      </div>

      {!reportResult ? (
        <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3">
          <div className="p-3 bg-teal-50 dark:bg-teal-950/40 text-teal-600 rounded-full w-fit mx-auto">
            <FileText className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Generate Executive Report</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click &quot;Generate QA Report&quot; to synthesize executive health metrics, blocker analyses, and release readiness recommendations.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Executive Release Readiness Hero */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                  Release Readiness Assessment
                </span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                  {reportResult.headline}
                </h2>
                <div className="text-xs text-slate-400 mt-1">
                  Generated at: {new Date(reportResult.generatedAt).toLocaleString()}
                </div>
              </div>

              {/* Status Pill */}
              <div className="flex items-center gap-4">
                <div
                  className={`px-4 py-2.5 rounded-2xl font-black text-sm flex items-center gap-2 ${
                    reportResult.releaseReadiness.status === 'READY'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : reportResult.releaseReadiness.status === 'BLOCKED'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}
                >
                  {reportResult.releaseReadiness.status === 'READY' ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : reportResult.releaseReadiness.status === 'BLOCKED' ? (
                    <AlertOctagon className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                  {reportResult.releaseReadiness.status} (Score: {reportResult.releaseReadiness.score}/100)
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              {reportResult.executiveSummary}
            </p>

            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Strategic Recommendation: <span className="text-teal-600 font-semibold">{reportResult.releaseReadiness.recommendation}</span>
            </div>
          </div>

          {/* Metric KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Total Cases</div>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {reportResult.metricsSummary.totalTestCases}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Executions</div>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {reportResult.metricsSummary.totalExecutions}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Pass Rate</div>
              <div className="text-xl font-black text-emerald-600 mt-1">
                {reportResult.metricsSummary.passRatePercent}%
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Completion</div>
              <div className="text-xl font-black text-blue-600 mt-1">
                {reportResult.metricsSummary.completionRatePercent}%
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Open Defects</div>
              <div className="text-xl font-black text-amber-600 mt-1">
                {reportResult.metricsSummary.openDefects}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Blockers</div>
              <div className="text-xl font-black text-rose-600 mt-1">
                {reportResult.metricsSummary.criticalDefects}
              </div>
            </div>
          </div>

          {/* Key Findings and Suggested Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Key Quality Findings
              </h3>
              <ul className="space-y-2">
                {reportResult.keyFindings.map((finding, idx) => (
                  <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Recommended Release Actions
              </h3>
              <ul className="space-y-2">
                {reportResult.suggestedActions.map((action, idx) => (
                  <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Blocker Issues Section */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-600" />
              Critical Blocker Issues ({reportResult.blockerIssues.length})
            </h3>

            {reportResult.blockerIssues.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Zero critical blockers identified. Quality criteria met for this assessment scope.
              </div>
            ) : (
              <div className="space-y-2">
                {reportResult.blockerIssues.map((issue) => (
                  <div key={issue.key} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-600">{issue.key}</span>
                      <span className="text-slate-800 dark:text-slate-200">{issue.title}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-100 text-red-700">
                      {issue.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
