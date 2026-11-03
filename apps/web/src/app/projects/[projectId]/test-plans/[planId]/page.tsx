'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import { TestPlanStatus, TestPriority, ExecutionStatus } from '@ai-qa/shared-types';
import {
  ClipboardList,
  ArrowLeft,
  Calendar,
  Layers,
  ShieldCheck,
  Target,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  Play,
  X,
  Search,
  ChevronRight,
  User,
  Sliders,
} from 'lucide-react';

export default function TestPlanDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = params.projectId as string;
  const planId = params.planId as string;

  const [activeTab, setActiveTab] = useState<'overview' | 'cases' | 'runs'>('overview');
  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [caseSearch, setCaseSearch] = useState('');

  // Fetch Plan Details
  const { data: plan, isLoading } = useQuery({
    queryKey: ['test-plan', projectId, planId],
    queryFn: () => defaultApiClient.getTestPlan(projectId, planId),
  });

  // Fetch Plan Cases
  const { data: planCasesData, isLoading: casesLoading } = useQuery({
    queryKey: ['test-plan-cases', projectId, planId],
    queryFn: () => defaultApiClient.getPlanCases(projectId, planId),
  });

  // Fetch Available Test Cases for selection modal
  const { data: availableCasesData } = useQuery({
    queryKey: ['available-cases', projectId, caseSearch],
    queryFn: () =>
      defaultApiClient.getTestCases(projectId, {
        search: caseSearch || undefined,
        limit: 50,
      }),
    enabled: caseModalOpen,
  });

  // Add Cases Mutation
  const addCasesMutation = useMutation({
    mutationFn: (testCaseIds: string[]) =>
      defaultApiClient.selectPlanCases(projectId, planId, { testCaseIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-plan-cases', projectId, planId] });
      queryClient.invalidateQueries({ queryKey: ['test-plan', projectId, planId] });
      setCaseModalOpen(false);
      setSelectedCaseIds([]);
    },
  });

  // Remove Case Mutation
  const removeCaseMutation = useMutation({
    mutationFn: (caseId: string) => defaultApiClient.removePlanCase(projectId, planId, caseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-plan-cases', projectId, planId] });
      queryClient.invalidateQueries({ queryKey: ['test-plan', projectId, planId] });
    },
  });

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: TestPlanStatus) =>
      defaultApiClient.updateTestPlan(projectId, planId, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-plan', projectId, planId] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8 text-center">
        <h2 className="text-xl font-bold">Test Plan Not Found</h2>
        <Link href={`/projects/${projectId}/test-plans`} className="text-indigo-400 mt-4 inline-block">
          Return to Test Plans
        </Link>
      </div>
    );
  }

  const existingCaseIdSet = new Set(planCasesData?.planCases.map((pc) => pc.testCaseId) || []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/projects/${projectId}/test-plans`}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                <Link href={`/projects/${projectId}/test-plans`} className="hover:text-slate-300">
                  Test Plans
                </Link>
                <span>/</span>
                <span className="text-indigo-400 font-mono">{plan.key}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
                <ClipboardList className="w-7 h-7 text-indigo-400" />
                {plan.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/projects/${projectId}/test-runs/new?testPlanId=${plan.id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-all shadow-lg shadow-emerald-600/20"
            >
              <Play className="w-4 h-4 fill-white" />
              Create Test Run
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 gap-6 text-sm">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Overview & Scope
          </button>
          <button
            onClick={() => setActiveTab('cases')}
            className={`pb-3 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'cases'
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Planned Test Cases ({planCasesData?.totalCount || 0})
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-base font-semibold text-white">Plan Description & Objectives</h3>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {plan.description || 'No description provided.'}
                </p>
                {plan.objectives && (
                  <div className="pt-3 border-t border-slate-800">
                    <h4 className="text-xs font-semibold text-indigo-400 mb-1">Testing Objectives</h4>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">{plan.objectives}</p>
                  </div>
                )}
              </div>

              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-base font-semibold text-white">Strategy & Scope</h3>
                {plan.scope && (
                  <div>
                    <h4 className="text-xs font-semibold text-indigo-400 mb-1">Scope Definition</h4>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">{plan.scope}</p>
                  </div>
                )}
                {plan.strategy && (
                  <div className="pt-3 border-t border-slate-800">
                    <h4 className="text-xs font-semibold text-indigo-400 mb-1">Testing Strategy</h4>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">{plan.strategy}</p>
                  </div>
                )}
              </div>

              {(plan.entryCriteria || plan.exitCriteria) && (
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-4">
                  <h3 className="text-base font-semibold text-white">Entry & Exit Criteria</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {plan.entryCriteria && (
                      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                        <h4 className="text-xs font-semibold text-emerald-400 mb-1">Entry Criteria</h4>
                        <p className="text-xs text-slate-300 whitespace-pre-wrap">{plan.entryCriteria}</p>
                      </div>
                    )}
                    {plan.exitCriteria && (
                      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                        <h4 className="text-xs font-semibold text-rose-400 mb-1">Exit Criteria</h4>
                        <p className="text-xs text-slate-300 whitespace-pre-wrap">{plan.exitCriteria}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Meta */}
            <div className="space-y-6">
              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-semibold text-slate-300">Plan Status & Priority</h3>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Current Status</label>
                  <select
                    value={plan.status}
                    onChange={(e) => updateStatusMutation.mutate(e.target.value as TestPlanStatus)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value={TestPlanStatus.DRAFT}>Draft</option>
                    <option value={TestPlanStatus.PLANNED}>Planned</option>
                    <option value={TestPlanStatus.IN_PROGRESS}>In Progress</option>
                    <option value={TestPlanStatus.COMPLETED}>Completed</option>
                    <option value={TestPlanStatus.ARCHIVED}>Archived</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-slate-800 space-y-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Milestone:</span>
                    <span className="text-slate-200 font-medium">{plan.milestone?.name || 'Unassigned'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Environment:</span>
                    <span className="text-slate-200 font-medium">{plan.environment?.name || 'Any'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">QA Lead / Manager:</span>
                    <span className="text-slate-200 font-medium">
                      {plan.manager ? `${plan.manager.firstName} ${plan.manager.lastName}` : 'Unassigned'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Schedule:</span>
                    <span className="text-slate-200 font-medium">
                      {plan.startDate ? new Date(plan.startDate).toLocaleDateString() : '—'} to{' '}
                      {plan.endDate ? new Date(plan.endDate).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Test Cases */}
        {activeTab === 'cases' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Selected Test Cases</h3>
                <p className="text-xs text-slate-400">
                  Each test case preserves the exact version snapshot at the time it was assigned.
                </p>
              </div>
              <button
                onClick={() => setCaseModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all shadow-md shadow-indigo-600/20"
              >
                <Plus className="w-4 h-4" />
                Add Test Cases
              </button>
            </div>

            {casesLoading ? (
              <div className="h-48 bg-slate-900/40 rounded-2xl animate-pulse" />
            ) : planCasesData?.planCases.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800">
                <Layers className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h4 className="text-base font-medium text-slate-300">No test cases assigned yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Add test cases from your project repository to organize and run them as part of this plan.
                </p>
                <button
                  onClick={() => setCaseModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all shadow-md shadow-indigo-600/20"
                >
                  <Plus className="w-4 h-4" />
                  Select Test Cases
                </button>
              </div>
            ) : (
              <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase font-medium border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Key</th>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Suite</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Preserved Version</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {planCasesData?.planCases.map((pc) => (
                      <tr key={pc.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-400">
                          {pc.testCase?.key || pc.testCaseId}
                        </td>
                        <td className="py-3 px-4 font-medium text-white">
                          {pc.testCase?.title || 'Unknown Test Case'}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {pc.testCase?.suite?.name || 'Root'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-300">
                            {pc.testCase?.priority || 'MEDIUM'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-indigo-300 border border-indigo-900/40">
                            v{pc.testCaseVersion?.versionNumber || 1}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              if (confirm('Remove this test case from the test plan?')) {
                                removeCaseMutation.mutate(pc.testCaseId);
                              }
                            }}
                            className="p-1 rounded hover:bg-rose-950/50 text-slate-500 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Case Selection Modal */}
        {caseModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Select Test Cases to Plan</h3>
                <button
                  onClick={() => setCaseModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter available cases..."
                  value={caseSearch}
                  onChange={(e) => setCaseSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-800/40">
                {availableCasesData?.testCases.map((tc) => {
                  const alreadySelected = existingCaseIdSet.has(tc.id);
                  const isChecked = selectedCaseIds.includes(tc.id);

                  return (
                    <div
                      key={tc.id}
                      className={`p-3 rounded-xl flex items-center justify-between text-xs transition-colors ${
                        alreadySelected
                          ? 'opacity-40 bg-slate-950/40'
                          : isChecked
                          ? 'bg-indigo-950/30 border border-indigo-800/50'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          disabled={alreadySelected}
                          checked={isChecked || alreadySelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCaseIds([...selectedCaseIds, tc.id]);
                            } else {
                              setSelectedCaseIds(selectedCaseIds.filter((id) => id !== tc.id));
                            }
                          }}
                          className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <span className="font-mono font-bold text-indigo-400 mr-2">
                            {tc.key || `CORE-${tc.caseNumber}`}
                          </span>
                          <span className="font-medium text-white">{tc.title}</span>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {tc.suite?.name || 'Root'} • v{tc.currentVersion} • {tc.priority}
                          </div>
                        </div>
                      </div>

                      {alreadySelected && (
                        <span className="text-[10px] text-slate-500">Already in plan</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-800 mt-4">
                <span className="text-xs text-slate-400">
                  {selectedCaseIds.length} test cases selected
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCaseModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (selectedCaseIds.length > 0) {
                        addCasesMutation.mutate(selectedCaseIds);
                      }
                    }}
                    disabled={selectedCaseIds.length === 0 || addCasesMutation.isPending}
                    className="px-4 py-2 rounded-xl text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
                  >
                    {addCasesMutation.isPending ? 'Adding...' : 'Add Selected Cases'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
