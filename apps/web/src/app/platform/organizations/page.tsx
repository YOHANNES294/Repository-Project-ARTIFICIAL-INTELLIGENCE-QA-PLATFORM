'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Ban,
  Check,
  X,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import { defaultApiClient } from '@ai-qa/api-client';
import { PlatformOrganizationListItemDto } from '@ai-qa/shared-types';

export default function PlatformOrganizationsPage() {
  const [organizations, setOrganizations] = useState<PlatformOrganizationListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSuspended, setFilterSuspended] = useState<'all' | 'active' | 'suspended'>('all');
  const [error, setError] = useState<string | null>(null);

  // Suspension Modal State
  const [targetOrg, setTargetOrg] = useState<PlatformOrganizationListItemDto | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);
      const isSuspended =
        filterSuspended === 'suspended' ? true : filterSuspended === 'active' ? false : undefined;

      const res = await defaultApiClient.getPlatformOrganizations({
        search: search || undefined,
        isSuspended,
      });

      if (res.data) {
        setOrganizations(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch organizations list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [filterSuspended]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrganizations();
  };

  const handleSuspendOrg = async () => {
    if (!targetOrg || !suspensionReason.trim()) return;
    try {
      setSubmitting(true);
      await defaultApiClient.suspendOrganization(targetOrg.id, suspensionReason);
      setTargetOrg(null);
      setSuspensionReason('');
      await fetchOrganizations();
    } catch (err: any) {
      alert(err.message || 'Failed to suspend organization');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivateOrg = async (orgId: string) => {
    if (!confirm('Reactivate this organization? Members will regain access immediately.')) return;
    try {
      await defaultApiClient.reactivateOrganization(orgId);
      await fetchOrganizations();
    } catch (err: any) {
      alert(err.message || 'Failed to reactivate organization');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            Tenants & Organizations
          </h2>
          <p className="text-xs text-slate-400">
            Review active tenants, track plan subscriptions, and manage suspension governance
          </p>
        </div>
        <button
          onClick={fetchOrganizations}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh List
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search organizations by name or slug..."
            className="w-full bg-slate-800/80 border border-slate-700 text-xs text-white pl-10 pr-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </form>

        <div className="flex bg-slate-800 border border-slate-700 rounded-xl p-1 text-xs font-semibold">
          <button
            onClick={() => setFilterSuspended('all')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterSuspended === 'all' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterSuspended('active')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterSuspended === 'active' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilterSuspended('suspended')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterSuspended === 'suspended' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Suspended
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800 text-red-300 text-xs rounded-xl">
          {error}
        </div>
      )}

      {/* Organizations Table */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
            Loading organization records...
          </div>
        ) : organizations.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No organizations match the filter criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 font-bold uppercase text-[10px] bg-slate-900/60">
                  <th className="py-3 px-5">Organization</th>
                  <th className="py-3 px-5">Slug</th>
                  <th className="py-3 px-5">Plan Tier</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Members</th>
                  <th className="py-3 px-5">Projects</th>
                  <th className="py-3 px-5">Created</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-slate-300">
                {organizations.map((org) => {
                  const sub = org.subscription;
                  return (
                    <tr key={org.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-white flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-400" />
                        {org.name}
                        {org.isSuspended && (
                          <span className="text-[10px] bg-red-950 text-red-400 border border-red-800 px-1.5 py-0.5 rounded font-bold uppercase">
                            SUSPENDED
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 font-mono text-slate-400">{org.slug}</td>
                      <td className="py-3.5 px-5">
                        <span className="font-bold text-slate-200">
                          {sub?.plan?.name || 'Free'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            sub?.status === 'ACTIVE'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}
                        >
                          {sub?.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-slate-300 font-mono">{org.memberCount}</td>
                      <td className="py-3.5 px-5 text-slate-300 font-mono">{org.projectCount}</td>
                      <td className="py-3.5 px-5 text-slate-400">
                        {new Date(org.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {org.isSuspended ? (
                          <button
                            onClick={() => handleReactivateOrg(org.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/80 hover:bg-emerald-900/60 transition"
                          >
                            <Check className="w-3 h-3" /> Reactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => setTargetOrg(org)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400 hover:text-red-300 px-2.5 py-1 rounded-lg bg-red-950/60 border border-red-800/80 hover:bg-red-900/60 transition"
                          >
                            <Ban className="w-3 h-3" /> Suspend
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Suspend Organization Modal */}
      {targetOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                Suspend Organization Tenant
              </h3>
              <button
                onClick={() => setTargetOrg(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              You are about to suspend <strong>{targetOrg.name}</strong> ({targetOrg.slug}). All member access will be blocked immediately.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Mandatory Reason for Suspension (Logged to Audit Trail)
              </label>
              <textarea
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="e.g., Non-payment overdue 30+ days, TOS abuse, Security incident..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:ring-2 focus:ring-red-500 focus:outline-none resize-none h-24"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTargetOrg(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSuspendOrg}
                disabled={submitting || !suspensionReason.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl transition disabled:opacity-50"
              >
                {submitting ? 'Applying...' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
