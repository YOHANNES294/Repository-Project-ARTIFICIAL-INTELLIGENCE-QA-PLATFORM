'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  RefreshCw,
  Edit2,
  Check,
  X,
  Save,
  CheckCircle2,
  DollarSign,
  HelpCircle,
} from 'lucide-react';
import { defaultApiClient } from '@ai-qa/api-client';
import { BillingPlanDto } from '@ai-qa/shared-types';

export default function PlatformPlansPage() {
  const [plans, setPlans] = useState<BillingPlanDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editing state
  const [editingPlan, setEditingPlan] = useState<BillingPlanDto | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await defaultApiClient.getPlatformPlans();
      setPlans(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    try {
      setSaving(true);
      await defaultApiClient.updatePlatformPlan(editingPlan.id, {
        name: editingPlan.name,
        description: editingPlan.description || undefined,
        priceCentsMonth: editingPlan.priceCentsMonth,
        priceCentsYear: editingPlan.priceCentsYear,
        maxProjects: Number(editingPlan.maxProjects),
        maxMembers: Number(editingPlan.maxMembers),
        maxTestCases: Number(editingPlan.maxTestCases),
        maxTestRunsPerMonth: Number(editingPlan.maxTestRunsPerMonth),
        maxAutomationRunsPerMonth: Number(editingPlan.maxAutomationRunsPerMonth),
        aiTokenAllowance: Number(editingPlan.aiTokenAllowance),
        allowCustomReports: editingPlan.allowCustomReports,
        allowIntegrations: editingPlan.allowIntegrations,
        allowAdvancedAnalytics: editingPlan.allowAdvancedAnalytics,
        allowSso: editingPlan.allowSso,
        allowAuditExport: editingPlan.allowAuditExport,
      });
      setEditingPlan(null);
      await fetchPlans();
    } catch (err: any) {
      alert(err.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
          <p className="text-sm text-slate-400 font-medium">Loading platform plan definitions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            Database-Backed Plan Catalog
          </h2>
          <p className="text-xs text-slate-400">
            Define dynamic quotas, token allowances, and pricing stored directly in PostgreSQL
          </p>
        </div>
        <button
          onClick={fetchPlans}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800 text-red-300 text-xs rounded-xl">
          {error}
        </div>
      )}

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((p) => (
          <div
            key={p.id}
            className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 flex flex-col justify-between shadow-sm hover:border-slate-600 transition"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
                  {p.tier}
                </span>
                <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded font-bold text-slate-300">
                  ORDER: {p.sortOrder}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">{p.name}</h3>
                <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{p.description}</p>
              </div>

              <div className="pt-2 border-t border-slate-700/60 flex items-baseline gap-1">
                <span className="text-2xl font-black text-white font-mono">
                  ${(p.priceCentsMonth / 100).toFixed(0)}
                </span>
                <span className="text-xs text-slate-400">/mo (${(p.priceCentsYear / 100).toFixed(0)}/yr)</span>
              </div>

              <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-700/60">
                <li className="flex justify-between">
                  <span className="text-slate-400">Max Projects:</span>
                  <span className="font-mono font-bold">{p.maxProjects === -1 ? 'Unlimited' : p.maxProjects}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-400">Max Members:</span>
                  <span className="font-mono font-bold">{p.maxMembers === -1 ? 'Unlimited' : p.maxMembers}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-400">Max Test Cases:</span>
                  <span className="font-mono font-bold">{p.maxTestCases === -1 ? 'Unlimited' : p.maxTestCases.toLocaleString()}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-400">Test Runs / mo:</span>
                  <span className="font-mono font-bold">{p.maxTestRunsPerMonth === -1 ? 'Unlimited' : p.maxTestRunsPerMonth.toLocaleString()}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-400">Automation / mo:</span>
                  <span className="font-mono font-bold">{p.maxAutomationRunsPerMonth === -1 ? 'Unlimited' : p.maxAutomationRunsPerMonth.toLocaleString()}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-400">AI Tokens / mo:</span>
                  <span className="font-mono font-bold">{p.aiTokenAllowance === -1 ? 'Unlimited' : p.aiTokenAllowance.toLocaleString()}</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700/60">
              <button
                onClick={() => setEditingPlan({ ...p })}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-slate-200 bg-slate-700/80 hover:bg-slate-700 rounded-xl transition"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit Entitlements
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <form
            onSubmit={handleSavePlan}
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full shadow-2xl p-6 space-y-4 my-8"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-400" />
                Edit Plan: {editingPlan.name} ({editingPlan.tier})
              </h3>
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Plan Name</label>
                <input
                  type="text"
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Monthly Price ($)</label>
                <input
                  type="number"
                  value={editingPlan.priceCentsMonth / 100}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, priceCentsMonth: Math.round(Number(e.target.value) * 100) })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none"
                  min="0"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="text-slate-300 font-semibold block mb-1">Description</label>
                <input
                  type="text"
                  value={editingPlan.description || ''}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Max Projects (-1 = unlimited)</label>
                <input
                  type="number"
                  value={editingPlan.maxProjects}
                  onChange={(e) => setEditingPlan({ ...editingPlan, maxProjects: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Max Members (-1 = unlimited)</label>
                <input
                  type="number"
                  value={editingPlan.maxMembers}
                  onChange={(e) => setEditingPlan({ ...editingPlan, maxMembers: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Max Test Cases (-1 = unlimited)</label>
                <input
                  type="number"
                  value={editingPlan.maxTestCases}
                  onChange={(e) => setEditingPlan({ ...editingPlan, maxTestCases: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Max Test Runs / mo</label>
                <input
                  type="number"
                  value={editingPlan.maxTestRunsPerMonth}
                  onChange={(e) => setEditingPlan({ ...editingPlan, maxTestRunsPerMonth: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Automation Runs / mo</label>
                <input
                  type="number"
                  value={editingPlan.maxAutomationRunsPerMonth}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, maxAutomationRunsPerMonth: Number(e.target.value) })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">AI Token Allowance / mo</label>
                <input
                  type="number"
                  value={editingPlan.aiTokenAllowance}
                  onChange={(e) => setEditingPlan({ ...editingPlan, aiTokenAllowance: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Feature Flags */}
            <div className="pt-2 border-t border-slate-800 space-y-2 text-xs">
              <label className="font-semibold text-slate-300 block">Feature Flags</label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan.allowCustomReports}
                    onChange={(e) => setEditingPlan({ ...editingPlan, allowCustomReports: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span>Custom Reports</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan.allowIntegrations}
                    onChange={(e) => setEditingPlan({ ...editingPlan, allowIntegrations: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span>Integrations (Slack/Teams)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan.allowAdvancedAnalytics}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, allowAdvancedAnalytics: e.target.checked })
                    }
                    className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span>Advanced Analytics</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan.allowSso}
                    onChange={(e) => setEditingPlan({ ...editingPlan, allowSso: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span>Enterprise SSO</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving Changes...' : 'Save Entitlements'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
