'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Layers,
  Activity,
  CreditCard,
} from 'lucide-react';
import { defaultApiClient } from '@ai-qa/api-client';
import { PlatformOverviewMetricsDto } from '@ai-qa/shared-types';

export default function PlatformOverviewPage() {
  const [metrics, setMetrics] = useState<PlatformOverviewMetricsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await defaultApiClient.getPlatformOverview();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load platform telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
          <p className="text-sm text-slate-400 font-medium">Aggregating platform SaaS metrics...</p>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="bg-red-950/40 border border-red-800 text-red-300 p-8 rounded-2xl text-center space-y-4 max-w-xl mx-auto my-12">
        <ShieldAlert className="w-10 h-10 text-red-400 mx-auto" />
        <h3 className="text-lg font-bold">Access Denied or Service Unavailable</h3>
        <p className="text-xs text-red-300/80">
          {error || 'Platform overview requires verified Super Admin authority.'}
        </p>
        <button
          onClick={fetchMetrics}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold"
        >
          Retry Verification
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Headline */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Executive SaaS Telemetry</h2>
          <p className="text-xs text-slate-400">Live platform-wide metrics and tenant health monitoring</p>
        </div>
        <button
          onClick={fetchMetrics}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Telemetry
        </button>
      </div>

      {/* Primary KPI Scorecard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Organizations */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Organizations</span>
            <Building2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            {metrics.totalOrganizations.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-700/50">
            <span className="text-emerald-400">{metrics.activeOrganizations} active</span>
            {metrics.suspendedOrganizations > 0 && (
              <span className="text-red-400 font-semibold">{metrics.suspendedOrganizations} suspended</span>
            )}
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Registered Users</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            {metrics.totalUsers.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-700/50">
            <span className="text-emerald-400">{metrics.activeUsers} active</span>
            {metrics.suspendedUsers > 0 && (
              <span className="text-red-400 font-semibold">{metrics.suspendedUsers} suspended</span>
            )}
          </div>
        </div>

        {/* Monthly Recurring Revenue */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Monthly Recurring Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white tracking-tight text-emerald-400 font-mono">
            ${(metrics.mrrCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-700/50">
            Current normalized MRR run-rate
          </div>
        </div>

        {/* Annual Run Rate */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Annual Run Rate (ARR)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white tracking-tight text-emerald-400 font-mono">
            ${(metrics.arrCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-700/50">
            Annualized contract value
          </div>
        </div>
      </div>

      {/* Subscriptions Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tier Distribution */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Subscriptions by Plan Tier
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'].map((tier) => {
              const count = metrics.subscriptionsByTier[tier] || 0;
              return (
                <div key={tier} className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50 text-center">
                  <div className="text-xs font-bold text-slate-400">{tier}</div>
                  <div className="text-2xl font-black text-white mt-1">{count}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            Subscriptions by Lifecycle Status
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELLED'].map((status) => {
              const count = metrics.subscriptionsByStatus[status] || 0;
              return (
                <div key={status} className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50 text-center">
                  <div className="text-xs font-bold text-slate-400">{status}</div>
                  <div className="text-2xl font-black text-white mt-1">{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Platform Payments */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-400" />
            Recent Platform Payments
          </h3>
          <span className="text-xs text-slate-400 font-mono">Last 10 Transactions</span>
        </div>

        {metrics.recentPayments.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No transactions recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-4">Organization</th>
                  <th className="py-2.5 px-4">Amount</th>
                  <th className="py-2.5 px-4">Provider</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 text-slate-300">
                {metrics.recentPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-700/30">
                    <td className="py-3 px-4 font-mono text-slate-300">{p.organizationId.slice(0, 8)}...</td>
                    <td className="py-3 px-4 font-bold text-white">
                      ${(p.amountCents / 100).toFixed(2)} {p.currency}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">{p.provider}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Administration Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/platform/organizations"
          className="p-5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition flex items-center justify-between group"
        >
          <div>
            <h4 className="font-bold text-sm text-white group-hover:text-indigo-400 transition">
              Manage Organizations &rarr;
            </h4>
            <p className="text-xs text-slate-400 mt-1">Inspect, suspend, or reactivate tenant workspaces</p>
          </div>
        </Link>
        <Link
          href="/platform/users"
          className="p-5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition flex items-center justify-between group"
        >
          <div>
            <h4 className="font-bold text-sm text-white group-hover:text-indigo-400 transition">
              Manage User Accounts &rarr;
            </h4>
            <p className="text-xs text-slate-400 mt-1">Review accounts and apply governance actions</p>
          </div>
        </Link>
        <Link
          href="/platform/system"
          className="p-5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition flex items-center justify-between group"
        >
          <div>
            <h4 className="font-bold text-sm text-white group-hover:text-indigo-400 transition">
              System Telemetry &rarr;
            </h4>
            <p className="text-xs text-slate-400 mt-1">Monitor server uptime, memory, and database health</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
