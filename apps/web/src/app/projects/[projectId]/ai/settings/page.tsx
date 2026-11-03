'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import { AIProviderType } from '@ai-qa/shared-types';
import {
  Sliders,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Key,
  Cpu,
  Coins,
  Clock,
  Layers,
  Lock,
  RefreshCw,
} from 'lucide-react';

export default function AISettingsPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const projectId = params.projectId as string;

  const [provider, setProvider] = useState<AIProviderType>(AIProviderType.MOCK);
  const [modelName, setModelName] = useState('mock-llm-v1');
  const [apiKey, setApiKey] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs: number; message?: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch current provider config
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['ai-provider-config', projectId],
    queryFn: () => defaultApiClient.getAIProviderConfig(projectId),
  });

  // Fetch usage metrics
  const { data: metrics } = useQuery({
    queryKey: ['ai-usage-metrics', projectId],
    queryFn: () => defaultApiClient.getAIUsageMetrics(projectId),
  });

  useEffect(() => {
    if (config) {
      setProvider(config.provider);
      setModelName(config.modelName);
      setApiEndpoint(config.apiEndpoint || '');
      setIsActive(config.isActive);
    }
  }, [config]);

  // Provider change defaults
  const handleProviderChange = (newProvider: AIProviderType) => {
    setProvider(newProvider);
    switch (newProvider) {
      case AIProviderType.OPENAI:
        setModelName('gpt-4o-mini');
        setApiEndpoint('');
        break;
      case AIProviderType.ANTHROPIC:
        setModelName('claude-3-5-haiku-20241022');
        setApiEndpoint('');
        break;
      case AIProviderType.GEMINI:
        setModelName('gemini-2.0-flash');
        setApiEndpoint('');
        break;
      case AIProviderType.MOCK:
      default:
        setModelName('mock-llm-v1');
        setApiEndpoint('');
        break;
    }
  };

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      setSaveSuccess(false);
      return defaultApiClient.updateAIProviderConfig(projectId, {
        provider,
        modelName,
        apiKey: apiKey.trim() || undefined,
        apiEndpoint: apiEndpoint.trim() || null,
        isActive,
      });
    },
    onSuccess: () => {
      setSaveSuccess(true);
      setApiKey('');
      queryClient.invalidateQueries({ queryKey: ['ai-provider-config', projectId] });
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to update provider settings');
    },
  });

  // Test Connection Mutation
  const testMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      return defaultApiClient.testAIProviderConnection(projectId);
    },
    onSuccess: (data) => {
      setTestResult(data);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Connection test failed');
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
          <span className="text-slate-900 dark:text-white font-medium">Provider & Quota Settings</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Sliders className="h-7 w-7 text-indigo-600" />
          AI Provider & Telemetry Settings
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Configure provider adapters (OpenAI, Anthropic, Gemini, Mock). Credentials are encrypted at rest with AES-256-GCM.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <span>Provider settings updated and securely encrypted in the database.</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Settings Form */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cpu className="h-5 w-5 text-indigo-600" />
              Provider Configuration
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Active Provider Engine
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['MOCK', 'OPENAI', 'ANTHROPIC', 'GEMINI'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleProviderChange(p as AIProviderType)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      provider === p
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                {provider === 'MOCK'
                  ? 'Deterministic offline mode. Operates locally with full test case generation and diagnostics without external API keys.'
                  : `Requires valid ${provider} API key. Key is stored with AES-256-GCM encryption.`}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Model Name
              </label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="e.g. gpt-4o-mini, claude-3-5-haiku-20241022, gemini-2.0-flash"
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
              />
            </div>

            {provider !== 'MOCK' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>API Key</span>
                  {config?.hasKey && (
                    <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-semibold normal-case">
                      <Lock className="h-3 w-3" /> Configured ({config.maskedKey})
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  placeholder={config?.hasKey ? 'Enter new key to update...' : 'Paste your API key here (sk-...)'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Custom Endpoint Base URL (Optional)
              </label>
              <input
                type="text"
                placeholder="https://api.openai.com/v1"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-semibold">Enable Provider for Organization</span>
              </label>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition-all"
              >
                {saveMutation.isPending ? 'Saving...' : 'Save Configuration'}
              </button>

              <button
                type="button"
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-sm transition-all flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`h-4 w-4 ${testMutation.isPending ? 'animate-spin' : ''}`} />
                Test Connection
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                )}
                <span>
                  {testResult.message} ({testResult.latencyMs}ms latency)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quota and Telemetry Table */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Coins className="h-5 w-5 text-emerald-600" />
              Token & Cost Usage Summary
            </h2>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Total Requests</div>
                <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  {metrics?.totalRequests ?? 0}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Total Tokens</div>
                <div className="text-lg font-black text-indigo-600 mt-1">
                  {(metrics?.totalTokens ?? 0).toLocaleString()}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Estimated USD</div>
                <div className="text-lg font-black text-emerald-600 mt-1">
                  ${(metrics?.totalEstimatedCostUsd ?? 0).toFixed(4)}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-2">Recent Execution Logs</h3>
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-700 rounded-xl">
                <table className="w-full text-left text-[11px] text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 uppercase text-[9px]">
                    <tr>
                      <th className="p-2">Feature</th>
                      <th className="p-2">Model</th>
                      <th className="p-2">Tokens</th>
                      <th className="p-2">Latency</th>
                      <th className="p-2">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {!metrics?.recentLogs || metrics.recentLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400">
                          No recent logs recorded.
                        </td>
                      </tr>
                    ) : (
                      metrics.recentLogs.slice(0, 7).map((log: any) => (
                        <tr key={log.id}>
                          <td className="p-2 font-bold">{log.feature}</td>
                          <td className="p-2 font-mono text-[10px]">{log.modelName}</td>
                          <td className="p-2 font-mono">{log.tokensUsed}</td>
                          <td className="p-2">{log.durationMs}ms</td>
                          <td className="p-2 text-emerald-600 font-mono">${log.estimatedCostUsd.toFixed(5)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
