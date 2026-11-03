'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import { AIRiskAnalysisDto } from '@ai-qa/shared-types';
import {
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Target,
  Layers,
  Database,
} from 'lucide-react';

export default function AIRiskAnalysisPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [milestoneId, setMilestoneId] = useState('');
  const [environmentId, setEnvironmentId] = useState('');
  const [riskResult, setRiskResult] = useState<AIRiskAnalysisDto | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: milestones } = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => defaultApiClient.getMilestones(projectId),
  });

  const { data: environments } = useQuery({
    queryKey: ['environments', projectId],
    queryFn: () => defaultApiClient.getProjectEnvironments(projectId),
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      return defaultApiClient.analyzeRisk(projectId, {
        milestoneId: milestoneId || null,
        environmentId: environmentId || null,
      });
    },
    onSuccess: (data) => {
      setRiskResult(data);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to compute risk analysis');
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
          <span className="text-slate-900 dark:text-white font-medium">Risk-Based Intelligence</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <AlertTriangle className="h-7 w-7 text-amber-600" />
          Risk-Based Testing Intelligence
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Compute explainable risk scores, detect vulnerable modules, and prioritize test focus based on real defect density and failure rates.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Control Panel */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Filter by Milestone
            </label>
            <select
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
              className="text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="">All Project Milestones</option>
              {milestones?.milestones?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Filter by Environment
            </label>
            <select
              value={environmentId}
              onChange={(e) => setEnvironmentId(e.target.value)}
              className="text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="">All Environments</option>
              {environments?.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => analyzeMutation.mutate()}
          disabled={analyzeMutation.isPending}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="h-4 w-4" />
          {analyzeMutation.isPending ? 'Computing Risk Scores...' : 'Compute Risk Intelligence'}
        </button>
      </div>

      {!riskResult ? (
        <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-full w-fit mx-auto">
            <TrendingUp className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Run Risk Analysis</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click &quot;Compute Risk Intelligence&quot; to aggregate real execution telemetry and synthesize targeted focus recommendations.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Score Banner */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                Overall Risk Assessment
              </span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {riskResult.summary}
              </h3>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-3xl font-black text-amber-600">{riskResult.overallRiskScore} / 100</div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Risk Category: <span className="text-amber-600">{riskResult.riskCategory}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recommended Test Focus */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="h-5 w-5 text-indigo-600" />
                Recommended Test Focus Areas
              </h3>

              <div className="space-y-3">
                {riskResult.recommendedTestFocus.map((focus, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{focus.area}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                        {focus.priority} Priority
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{focus.suggestedAction}</p>
                    <div className="text-[10px] text-slate-400">Target test cases: ~{focus.testCasesCount} cases</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vulnerable Components */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-600" />
                Vulnerable Modules & Components
              </h3>

              <div className="space-y-3">
                {riskResult.vulnerableComponents.map((comp, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{comp.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Failure rate: {comp.failureRate}% • Open defects: {comp.openDefects}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-rose-600">Risk {comp.riskScore}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Contributing Factors & Data Sources Transparency */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Contributing Factors Breakdown</h3>
              <div className="space-y-2">
                {riskResult.contributingFactors.map((factor, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{factor.factor}</span>
                    <span className="text-slate-500">{factor.impact}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="h-4 w-4 text-slate-400" />
                Analyzed Telemetry Sources
              </h3>
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700">
                  <span>Executions Evaluated</span>
                  <span className="font-bold">{riskResult.dataSources.totalTestCasesAnalyzed}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700">
                  <span>Failures Analyzed</span>
                  <span className="font-bold text-rose-600">{riskResult.dataSources.failedExecutionsAnalyzed}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700">
                  <span>Open Defects Scanned</span>
                  <span className="font-bold">{riskResult.dataSources.openDefectsAnalyzed}</span>
                </div>
                <div className="text-[10px] text-slate-400 pt-2">
                  Ground truth: calculated strictly from current PostgreSQL defect and execution attempt tables.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
