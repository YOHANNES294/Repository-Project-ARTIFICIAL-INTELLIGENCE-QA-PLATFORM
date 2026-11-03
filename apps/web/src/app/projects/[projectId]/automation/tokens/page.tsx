'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  ShieldAlert,
  Clock,
} from 'lucide-react';

export default function AutomationTokensPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('90');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reveal Modal State
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Queries
  const { data: tokens = [], isLoading } = useQuery({
    queryKey: ['automation-tokens', projectId],
    queryFn: () => defaultApiClient.getAutomationTokens(projectId),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      const expiresAt =
        expiresInDays === 'never'
          ? null
          : new Date(Date.now() + parseInt(expiresInDays, 10) * 86400000).toISOString();

      return defaultApiClient.createAutomationToken(projectId, {
        name: tokenName.trim(),
        scopes: ['automation:ingest'],
        expiresAt,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['automation-tokens', projectId] });
      queryClient.invalidateQueries({ queryKey: ['automation-overview', projectId] });
      setShowCreateModal(false);
      setTokenName('');
      setRevealedToken(data.rawToken);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to generate token');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (tokenId: string) => defaultApiClient.revokeAutomationToken(projectId, tokenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-tokens', projectId] });
      queryClient.invalidateQueries({ queryKey: ['automation-overview', projectId] });
    },
  });

  const handleCopy = () => {
    if (revealedToken) {
      navigator.clipboard.writeText(revealedToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}/automation`}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="h-6 w-6 text-cyan-600" />
              Automation API Tokens
            </h1>
            <p className="text-sm text-slate-500">
              Manage scoped API credentials for Playwright, Newman, and CI/CD pipelines
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          Generate New Token
        </button>
      </div>

      {/* Tokens Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading automation tokens...</div>
        ) : tokens.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="p-4 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-full w-fit mx-auto">
              <Key className="h-8 w-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              No API Tokens Created
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Generate an Automation API Token to authenticate your GitHub Actions or external test runners with this project.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg"
            >
              <Plus className="h-4 w-4" />
              Generate First Token
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs uppercase font-medium">
                <tr>
                  <th className="px-5 py-3">Token Name</th>
                  <th className="px-5 py-3">Prefix</th>
                  <th className="px-5 py-3">Scopes</th>
                  <th className="px-5 py-3">Last Used</th>
                  <th className="px-5 py-3">Expires</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {tokens.map((token) => (
                  <tr key={token.id} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                    <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">
                      {token.name}
                      <div className="text-xs font-normal text-slate-400 mt-0.5">
                        Created {new Date(token.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                      {token.tokenPrefix}...
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1">
                        {token.scopes.map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleString() : 'Never used'}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {token.expiresAt ? new Date(token.expiresAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          token.isRevoked
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        }`}
                      >
                        {token.isRevoked ? 'Revoked' : 'Active'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {!token.isRevoked && (
                        <button
                          onClick={() => {
                            if (confirm(`Revoke token "${token.name}"? This will immediately block test runners using it.`)) {
                              revokeMutation.mutate(token.id);
                            }
                          }}
                          disabled={revokeMutation.isPending}
                          className="text-xs text-rose-600 hover:text-rose-700 font-medium hover:underline flex items-center gap-1 ml-auto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Token Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Generate Automation API Token
            </h3>
            <p className="text-xs text-slate-500">
              Create a scoped token for automated CI test runners. Tokens are hashed at rest with SHA-256.
            </p>

            {errorMsg && (
              <div className="p-3 text-xs bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 rounded-lg">
                {errorMsg}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Token Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. GitHub Actions Playwright Runner"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Expiration
                </label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-white"
                >
                  <option value="30">30 days</option>
                  <option value="60">60 days</option>
                  <option value="90">90 days</option>
                  <option value="180">180 days</option>
                  <option value="365">1 year</option>
                  <option value="never">No Expiration</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setErrorMsg(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createMutation.mutate()}
                disabled={!tokenName.trim() || createMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg disabled:opacity-50"
              >
                {createMutation.isPending ? 'Generating...' : 'Generate Token'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* One-Time Token Reveal Modal */}
      {revealedToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <ShieldAlert className="h-6 w-6" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Copy Your Automation API Token
              </h3>
            </div>

            <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 p-3 rounded-lg">
              <strong>Security Notice:</strong> Please copy this token now. For security purposes, it will never be displayed again.
            </p>

            <div className="relative">
              <textarea
                readOnly
                value={revealedToken}
                rows={3}
                className="w-full font-mono text-xs p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 select-all"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-slate-500">
                Configure as secret <code className="font-mono text-cyan-600">AIQA_API_TOKEN</code> in CI.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy Token'}
                </button>
                <button
                  type="button"
                  onClick={() => setRevealedToken(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
