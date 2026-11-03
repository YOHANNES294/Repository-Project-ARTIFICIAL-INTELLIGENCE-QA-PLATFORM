'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import { TestPlanStatus, TestPriority, TestPlanDto } from '@ai-qa/shared-types';
import {
  ClipboardList,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Trash2,
  Edit,
  Copy,
  Layers,
  Archive,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export default function TestPlansPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const projectId = params.projectId as string;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [planToDuplicate, setPlanToDuplicate] = useState<TestPlanDto | null>(null);
  const [duplicateName, setDuplicateName] = useState('');

  // Fetch Project
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => defaultApiClient.getProject(projectId),
  });

  // Fetch Test Plans
  const { data, isLoading } = useQuery({
    queryKey: ['test-plans', projectId, search, statusFilter],
    queryFn: () =>
      defaultApiClient.getTestPlans(projectId, {
        search: search || undefined,
        status: (statusFilter as TestPlanStatus) || undefined,
      }),
  });

  // Duplicate Mutation
  const duplicateMutation = useMutation({
    mutationFn: (variables: { planId: string; name: string }) =>
      defaultApiClient.duplicateTestPlan(projectId, variables.planId, {
        name: variables.name,
        includeCases: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-plans', projectId] });
      setDuplicateModalOpen(false);
      setPlanToDuplicate(null);
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (planId: string) => defaultApiClient.deleteTestPlan(projectId, planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-plans', projectId] });
    },
  });

  const getStatusBadge = (status: TestPlanStatus) => {
    switch (status) {
      case TestPlanStatus.DRAFT:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">DRAFT</span>;
      case TestPlanStatus.PLANNED:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/40 text-blue-300 border border-blue-700/50">PLANNED</span>;
      case TestPlanStatus.IN_PROGRESS:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-900/40 text-amber-300 border border-amber-700/50">IN PROGRESS</span>;
      case TestPlanStatus.COMPLETED:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-900/40 text-emerald-300 border border-emerald-700/50">COMPLETED</span>;
      case TestPlanStatus.ARCHIVED:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">ARCHIVED</span>;
    }
  };

  const getPriorityBadge = (priority: TestPriority) => {
    switch (priority) {
      case TestPriority.CRITICAL:
        return <span className="text-xs font-semibold text-rose-400">CRITICAL</span>;
      case TestPriority.HIGH:
        return <span className="text-xs font-semibold text-amber-400">HIGH</span>;
      case TestPriority.MEDIUM:
        return <span className="text-xs font-semibold text-blue-400">MEDIUM</span>;
      case TestPriority.LOW:
        return <span className="text-xs font-semibold text-slate-400">LOW</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Breadcrumb & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/projects/${projectId}`}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                <span>{project?.name || 'Project'}</span>
                <span>/</span>
                <span className="text-indigo-400">Test Planning</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
                <ClipboardList className="w-7 h-7 text-indigo-400" />
                Test Plans
              </h1>
            </div>
          </div>

          <Link
            href={`/projects/${projectId}/test-plans/new`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            New Test Plan
          </Link>
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-sm flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search test plans by name or scope..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="">All Statuses</option>
              <option value={TestPlanStatus.DRAFT}>Draft</option>
              <option value={TestPlanStatus.PLANNED}>Planned</option>
              <option value={TestPlanStatus.IN_PROGRESS}>In Progress</option>
              <option value={TestPlanStatus.COMPLETED}>Completed</option>
              <option value={TestPlanStatus.ARCHIVED}>Archived</option>
            </select>
          </div>
        </div>

        {/* Plans List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-56 bg-slate-900/40 rounded-2xl animate-pulse border border-slate-800/60" />
            ))}
          </div>
        ) : data?.testPlans.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800">
            <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300">No test plans found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
              Create a structured test plan to group test cases, assign milestones, and orchestrate test execution runs.
            </p>
            <Link
              href={`/projects/${projectId}/test-plans/new`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              Create First Test Plan
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.testPlans.map((plan) => (
              <div
                key={plan.id}
                className="bg-slate-900/50 rounded-2xl border border-slate-800/80 hover:border-slate-700/80 transition-all p-5 flex flex-col justify-between group hover:shadow-xl hover:shadow-indigo-950/10"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold tracking-wider text-indigo-400 bg-indigo-950/50 px-2.5 py-1 rounded-lg border border-indigo-800/40">
                      {plan.key}
                    </span>
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(plan.priority)}
                      {getStatusBadge(plan.status)}
                    </div>
                  </div>

                  <Link
                    href={`/projects/${projectId}/test-plans/${plan.id}`}
                    className="block group-hover:text-indigo-300 transition-colors"
                  >
                    <h3 className="text-lg font-semibold text-white line-clamp-1">{plan.name}</h3>
                  </Link>

                  <p className="text-xs text-slate-400 line-clamp-2">
                    {plan.description || plan.objectives || 'No description provided.'}
                  </p>

                  <div className="pt-2 border-t border-slate-800/60 grid grid-cols-2 gap-2 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{plan._count?.selectedCases || 0} cases planned</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{plan._count?.testRuns || 0} execution runs</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {plan.startDate ? new Date(plan.startDate).toLocaleDateString() : 'Unscheduled'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setPlanToDuplicate(plan);
                        setDuplicateName(`${plan.name} (Copy)`);
                        setDuplicateModalOpen(true);
                      }}
                      title="Duplicate Test Plan"
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete test plan "${plan.name}"?`)) {
                          deleteMutation.mutate(plan.id);
                        }
                      }}
                      title="Delete Test Plan"
                      className="p-1.5 rounded-lg hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <Link
                      href={`/projects/${projectId}/test-plans/${plan.id}`}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors ml-1"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Duplicate Modal */}
        {duplicateModalOpen && planToDuplicate && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-2">Duplicate Test Plan</h3>
              <p className="text-xs text-slate-400 mb-4">
                Clone &quot;{planToDuplicate.name}&quot; along with all selected test cases and preserved versions.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1.5">New Plan Name</label>
                  <input
                    type="text"
                    value={duplicateName}
                    onChange={(e) => setDuplicateName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      setDuplicateModalOpen(false);
                      setPlanToDuplicate(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (duplicateName.trim()) {
                        duplicateMutation.mutate({
                          planId: planToDuplicate.id,
                          name: duplicateName.trim(),
                        });
                      }
                    }}
                    disabled={duplicateMutation.isPending || !duplicateName.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
                  >
                    {duplicateMutation.isPending ? 'Duplicating...' : 'Duplicate Plan'}
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
