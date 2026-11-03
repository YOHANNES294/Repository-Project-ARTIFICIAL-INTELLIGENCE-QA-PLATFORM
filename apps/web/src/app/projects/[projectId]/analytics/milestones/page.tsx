'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import {
  Target,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Settings,
  RefreshCw,
  Download,
  Calendar,
  Layers,
  Bug,
  Edit2,
  Trash2,
} from 'lucide-react';
import { ExportModal } from '../export-modal';

export default function MilestoneAnalyticsPage() {
  const params = useParams();
  const projectId = (params?.projectId as string) || '';
  const queryClient = useQueryClient();

  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isGateModalOpen, setIsGateModalOpen] = useState(false);
  const [gateForm, setGateForm] = useState({
    name: 'Standard Production Release Gate',
    minTestPassRate: 95,
    maxCriticalDefects: 0,
    maxHighDefects: 2,
    minExecutionCoverage: 90,
    requireZeroBlockers: true,
  });

  // Fetch milestones
  const { data: milestonesData, isLoading: isMilestonesLoading } = useQuery({
    queryKey: ['milestones-list', projectId],
    queryFn: () => defaultApiClient.getMilestones(projectId, { limit: 50 }),
    enabled: !!projectId,
  });

  const milestones = milestonesData?.milestones || [];

  // Automatically select the first milestone if none selected
  React.useEffect(() => {
    if (!selectedMilestoneId && milestones.length > 0) {
      setSelectedMilestoneId(milestones[0].id);
    }
  }, [milestones, selectedMilestoneId]);

  // Fetch release analytics for selected milestone
  const {
    data: releaseAnalytics,
    isLoading: isAnalyticsLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['milestone-release-analytics', projectId, selectedMilestoneId],
    queryFn: () => defaultApiClient.getMilestoneReleaseAnalytics(projectId, selectedMilestoneId),
    enabled: !!projectId && !!selectedMilestoneId,
  });

  // Fetch Quality Gates
  const { data: qualityGates, refetch: refetchGates } = useQuery({
    queryKey: ['quality-gates', projectId],
    queryFn: () => defaultApiClient.getQualityGates(projectId),
    enabled: !!projectId,
  });

  // Quality gate mutation
  const gateMutation = useMutation({
    mutationFn: (payload: any) => defaultApiClient.createQualityGate(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-gates', projectId] });
      queryClient.invalidateQueries({ queryKey: ['milestone-release-analytics', projectId, selectedMilestoneId] });
      setIsGateModalOpen(false);
    },
  });

  const getRecommendationBadge = (status?: string) => {
    switch (status) {
      case 'READY_FOR_RELEASE':
        return {
          label: 'READY FOR RELEASE',
          icon: ShieldCheck,
          badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300',
          bgClass: 'from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/10',
        };
      case 'WARNING_NEEDS_REVIEW':
        return {
          label: 'WARNING / REVIEW REQUIRED',
          icon: AlertTriangle,
          badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300',
          bgClass: 'from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/10',
        };
      default:
        return {
          label: 'BLOCKED / DO NOT RELEASE',
          icon: ShieldAlert,
          badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-300',
          bgClass: 'from-rose-50 to-rose-100/50 dark:from-rose-950/30 dark:to-rose-900/10',
        };
    }
  };

  const rec = getRecommendationBadge(releaseAnalytics?.qualityGateEvaluation?.recommendation);
  const RecIcon = rec.icon;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 rounded-lg">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Milestone & Quality Gate Release Governance
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Rule-based release criteria, blocker verification, and go/no-go readiness verdicts
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Milestone selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Milestone:</label>
            <select
              value={selectedMilestoneId}
              onChange={(e) => setSelectedMilestoneId(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm font-medium"
            >
              {milestones.length === 0 ? (
                <option value="">No milestones</option>
              ) : (
                milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.status})
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            onClick={() => setIsGateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
          >
            <Settings className="h-4 w-4" />
            Configure Gates
          </button>

          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
          >
            <Download className="h-4 w-4" />
            Export Audit
          </button>
        </div>
      </div>

      {milestones.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <Target className="h-10 w-10 mx-auto text-slate-400 mb-3" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Milestones Found</h3>
          <p className="text-sm text-slate-500 mt-1">
            Create a milestone under Project Management to evaluate release quality gates.
          </p>
        </div>
      ) : (
        <>
          {/* Release Readiness Banner */}
          <div className={`p-6 rounded-xl border bg-gradient-to-r ${rec.bgClass} border-slate-200 dark:border-slate-700 shadow-sm`}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl border ${rec.badgeClass}`}>
                  <RecIcon className="h-8 w-8" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {releaseAnalytics?.milestoneName || 'Milestone Verdict'}
                    </h2>
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${rec.badgeClass}`}>
                      {rec.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
                    Evaluation status: {releaseAnalytics?.qualityGateEvaluation?.passed ? 'All criteria met' : 'Quality rules violated'} for {releaseAnalytics?.milestoneName}.
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                  Milestone Progress
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white">
                  {isAnalyticsLoading ? '...' : `${releaseAnalytics?.progressPercentage ?? 0}%`}
                </div>
              </div>
            </div>
          </div>

          {/* Milestone Metrics Scorecards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Cases</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {isAnalyticsLoading ? '...' : releaseAnalytics?.testRunStats?.totalCases ?? 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">Assigned to milestone</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">Total Runs</span>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {isAnalyticsLoading ? '...' : releaseAnalytics?.testRunStats?.totalRuns ?? 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {releaseAnalytics?.testRunStats?.completedRuns ?? 0} completed
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Passed</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                {isAnalyticsLoading ? '...' : releaseAnalytics?.testRunStats?.passedCases ?? 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {releaseAnalytics?.testRunStats?.passRate ?? 0}% pass rate
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">Failed</span>
              <div className="text-2xl font-bold text-rose-600 mt-1">
                {isAnalyticsLoading ? '...' : releaseAnalytics?.testRunStats?.failedCases ?? 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">Active test failures</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Open Defects</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {isAnalyticsLoading ? '...' : releaseAnalytics?.defectStats?.openDefects ?? 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">In this milestone</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">Critical / Blocker</span>
              <div className="text-2xl font-bold text-rose-600 mt-1">
                {isAnalyticsLoading ? '...' : (releaseAnalytics?.defectStats?.criticalDefects ?? 0) + (releaseAnalytics?.defectStats?.blockerDefects ?? 0)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Must be zero for sign-off</p>
            </div>
          </div>

          {/* Quality Gate Rules Compliance Table */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Quality Gate Rules Verification
                  </h3>
                  <p className="text-xs text-slate-500">
                    Applied policy: {releaseAnalytics?.qualityGateEvaluation?.qualityGateName || 'Default Enterprise Quality Gate'}
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase">
                    <th className="py-3">Release Criteria Rule</th>
                    <th className="py-3 text-center">Required Threshold</th>
                    <th className="py-3 text-center">Current Milestone Value</th>
                    <th className="py-3 text-right">Verification Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {releaseAnalytics?.qualityGateEvaluation?.rules?.map((rule) => (
                    <tr key={rule.ruleKey} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-3 font-medium text-slate-900 dark:text-white">
                        {rule.description || rule.ruleKey}
                      </td>
                      <td className="py-3 text-center text-slate-600 dark:text-slate-300 font-mono text-xs">
                        {String(rule.threshold)}
                      </td>
                      <td className="py-3 text-center text-slate-900 dark:text-white font-mono text-xs font-semibold">
                        {String(rule.actual)}
                      </td>
                      <td className="py-3 text-right">
                        {rule.passed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            PASSED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                            <XCircle className="h-3.5 w-3.5" />
                            FAILED
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Quality Gate Configuration Modal */}
      {isGateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Configure Quality Gate Policy</h3>
              <button onClick={() => setIsGateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Gate Name</label>
                <input
                  type="text"
                  value={gateForm.name}
                  onChange={(e) => setGateForm({ ...gateForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Min Pass Rate (%)</label>
                  <input
                    type="number"
                    value={gateForm.minTestPassRate}
                    onChange={(e) => setGateForm({ ...gateForm, minTestPassRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Min Coverage (%)</label>
                  <input
                    type="number"
                    value={gateForm.minExecutionCoverage}
                    onChange={(e) => setGateForm({ ...gateForm, minExecutionCoverage: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Max Critical Defects</label>
                  <input
                    type="number"
                    value={gateForm.maxCriticalDefects}
                    onChange={(e) => setGateForm({ ...gateForm, maxCriticalDefects: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Max High Defects</label>
                  <input
                    type="number"
                    value={gateForm.maxHighDefects}
                    onChange={(e) => setGateForm({ ...gateForm, maxHighDefects: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="zeroBlockers"
                  checked={gateForm.requireZeroBlockers}
                  onChange={(e) => setGateForm({ ...gateForm, requireZeroBlockers: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="zeroBlockers" className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  Enforce strict Zero Blocker Defects for release sign-off
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setIsGateModalOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => gateMutation.mutate(gateForm)}
                disabled={gateMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
              >
                {gateMutation.isPending ? 'Saving...' : 'Save Quality Gate'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        projectId={projectId}
        defaultReportType="QUALITY_GATE_AUDIT"
      />
    </div>
  );
}
