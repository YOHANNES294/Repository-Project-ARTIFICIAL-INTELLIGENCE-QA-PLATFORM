'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import {
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Search,
  AlertTriangle,
  FileText,
  Sliders,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  Layers,
  CheckSquare,
  ArrowLeft,
} from 'lucide-react';

export default function AIHubPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => defaultApiClient.getProject(projectId),
  });

  const { data: providerConfig } = useQuery({
    queryKey: ['ai-provider-config', projectId],
    queryFn: () => defaultApiClient.getAIProviderConfig(projectId),
  });

  const { data: usageMetrics } = useQuery({
    queryKey: ['ai-usage-metrics', projectId],
    queryFn: () => defaultApiClient.getAIUsageMetrics(projectId),
  });

  const { data: generations } = useQuery({
    queryKey: ['ai-generations', projectId],
    queryFn: () => defaultApiClient.listAIGenerations(projectId),
  });

  const capabilities = [
    {
      title: 'AI Test Case Generation',
      description: 'Synthesize structured test cases from requirements, user stories, and acceptance criteria with mandatory human review.',
      href: `/projects/${projectId}/ai/generate-tests`,
      icon: CheckSquare,
      color: 'bg-blue-600',
      badge: 'Interactive Review',
    },
    {
      title: 'AI Failure Analysis',
      description: 'Root-cause diagnostic engine separating observed execution facts from probable hypotheses with debugging guidance.',
      href: `/projects/${projectId}/ai/failure-analysis`,
      icon: ShieldAlert,
      color: 'bg-rose-600',
      badge: 'Diagnostic Engine',
    },
    {
      title: 'Duplicate Defect Intelligence',
      description: 'Lexical and semantic similarity matching against open defects to prevent redundant triage and duplicate reports.',
      href: `/projects/${projectId}/ai/duplicate-intelligence`,
      icon: Search,
      color: 'bg-purple-600',
      badge: 'Semantic Matching',
    },
    {
      title: 'Risk-Based Testing Intelligence',
      description: 'Explainable risk scoring, vulnerable component detection, and test focus recommendations grounded in real project metrics.',
      href: `/projects/${projectId}/ai/risk-analysis`,
      icon: AlertTriangle,
      color: 'bg-amber-600',
      badge: 'Metric-Grounded',
    },
    {
      title: 'Executive QA Summary Report',
      description: 'Automated executive status reports, release readiness scoring, and blocker assessments for stakeholders and directors.',
      href: `/projects/${projectId}/ai/qa-report`,
      icon: FileText,
      color: 'bg-teal-600',
      badge: 'Release Health',
    },
    {
      title: 'Provider & Quota Settings',
      description: 'Configure OpenAI, Anthropic, Gemini, or Mock adapters with AES-256-GCM encryption, latency tests, and usage tracking.',
      href: `/projects/${projectId}/ai/settings`,
      icon: Sliders,
      color: 'bg-indigo-600',
      badge: 'Provider Agnostic',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-sm text-slate-500 mb-2">
            <Link href={`/projects/${projectId}`} className="hover:text-blue-600 flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to {project?.name || 'Project'}
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">AI Intelligence Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-indigo-600" />
            AI Intelligence Workbench
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Provider-agnostic artificial intelligence services integrated with your test suites, executions, and defects.
          </p>
        </div>

        {/* Active Provider Pill */}
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm">
            <Cpu className="h-4 w-4 text-indigo-600" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Provider</div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {providerConfig?.provider || 'MOCK'} ({providerConfig?.modelName || 'mock-llm-v1'})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Metric Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total AI Requests</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {usageMetrics?.totalRequests ?? 0}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
            <Layers className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tokens Processed</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {(usageMetrics?.totalTokens ?? 0).toLocaleString()}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
            <Cpu className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estimated Cost</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              ${(usageMetrics?.totalEstimatedCostUsd ?? 0).toFixed(4)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
            <Coins className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Architecture State</div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-2 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Operational (Graceful Fallback)
            </div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
            <Clock className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* AI Capabilities Grid */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Core AI Engines</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.title}
                href={c.href}
                className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-indigo-500 hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${c.color} text-white shadow-sm group-hover:scale-105 transition-transform`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {c.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                    {c.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    {c.description}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs font-semibold text-indigo-600">
                  <span>Launch Engine</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent AI Generations Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Recent AI Generations in Project</h3>
        {!generations || generations.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            No AI generation tasks run yet in this project. Launch an engine above to generate test cases or analyze executions.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Task Type</th>
                  <th className="py-3 px-4">Provider / Model</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Proposals / Items</th>
                  <th className="py-3 px-4">Tokens / Latency</th>
                  <th className="py-3 px-4">Created At</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {generations.slice(0, 8).map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {g.taskType}
                    </td>
                    <td className="py-3 px-4">
                      {g.provider} <span className="text-slate-400 text-[10px]">({g.modelName})</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                        {g.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {g.items ? `${g.items.length} items` : 'Analysis result'}
                    </td>
                    <td className="py-3 px-4">
                      {g.tokenCount} tokens <span className="text-slate-400">({g.latencyMs}ms)</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(g.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      {g.taskType === 'TEST_GENERATION' ? (
                        <Link
                          href={`/projects/${projectId}/ai/generate-tests?generationId=${g.id}`}
                          className="text-indigo-600 hover:underline font-semibold"
                        >
                          Review Items
                        </Link>
                      ) : (
                        <span className="text-slate-400">Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
