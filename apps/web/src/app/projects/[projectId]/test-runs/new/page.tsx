'use client';

import React, { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import { TestPlanDto, MilestoneDto, TestCaseDto } from '@ai-qa/shared-types';
import {
  PlayCircle,
  ArrowLeft,
  Calendar,
  Layers,
  Server,
  User,
  CheckSquare,
  AlertCircle,
  ClipboardList,
  Sparkles,
} from 'lucide-react';

export default function NewTestRunPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const initialPlanId = searchParams.get('planId') || '';

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [testPlanId, setTestPlanId] = useState<string>(initialPlanId);
  const [milestoneId, setMilestoneId] = useState<string>('');
  const [environmentId, setEnvironmentId] = useState<string>('');
  const [assignedToId, setAssignedToId] = useState<string>('');
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Queries
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => defaultApiClient.getProject(projectId),
  });

  const { data: testPlansData } = useQuery({
    queryKey: ['test-plans', projectId],
    queryFn: () => defaultApiClient.getTestPlans(projectId),
  });

  const { data: milestonesData } = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => defaultApiClient.getMilestones(projectId),
  });

  const { data: environments } = useQuery({
    queryKey: ['environments', projectId],
    queryFn: () => defaultApiClient.getProjectEnvironments(projectId),
  });

  const { data: members } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => defaultApiClient.getProjectMembers(projectId),
  });

  const { data: testCasesData } = useQuery({
    queryKey: ['test-cases', projectId],
    queryFn: () => defaultApiClient.getTestCases(projectId, { limit: 100 }),
  });

  // If a test plan is selected, auto-populate details if empty
  const { data: selectedPlan } = useQuery({
    queryKey: ['test-plan', projectId, testPlanId],
    queryFn: () => defaultApiClient.getTestPlan(projectId, testPlanId),
    enabled: !!testPlanId,
  });

  // Handle Plan selection change
  const testPlans = testPlansData?.testPlans || [];
  const milestones = milestonesData?.milestones || [];
  const testCases = testCasesData?.testCases || [];

  const handlePlanChange = (planId: string) => {
    setTestPlanId(planId);
    if (planId) {
      const plan = testPlans.find((p: TestPlanDto) => p.id === planId);
      if (plan) {
        if (!name) setName(`${plan.name} - Execution Run`);
        if (plan.milestoneId && !milestoneId) setMilestoneId(plan.milestoneId);
        if (plan.environmentId && !environmentId) setEnvironmentId(plan.environmentId);
      }
    }
  };

  const toggleCase = (id: string) => {
    setSelectedCaseIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const selectAllCases = () => {
    if (testCases.length === 0) return;
    if (selectedCaseIds.length === testCases.length) {
      setSelectedCaseIds([]);
    } else {
      setSelectedCaseIds(testCases.map((c: TestCaseDto) => c.id));
    }
  };

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error('Run name is required');

      return defaultApiClient.createTestRun(projectId, {
        name: name.trim(),
        description: description.trim() || undefined,
        testPlanId: testPlanId || undefined,
        milestoneId: milestoneId || undefined,
        environmentId: environmentId || undefined,
        assignedToId: assignedToId || undefined,
        testCaseIds: selectedCaseIds.length > 0 ? selectedCaseIds : undefined,
      });
    },
    onSuccess: (newRun) => {
      router.push(`/projects/${projectId}/test-runs/${newRun.id}`);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to create test run');
    },
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}/test-runs`}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <span>{project?.name || 'Project'}</span>
              <span>/</span>
              <Link href={`/projects/${projectId}/test-runs`} className="hover:text-slate-200">
                Test Runs
              </Link>
              <span>/</span>
              <span className="text-emerald-400">New Run</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <PlayCircle className="w-7 h-7 text-emerald-400" />
              Create Test Execution Run
            </h1>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-6"
        >
          {/* Basic Information */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-6">
            <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-slate-800/80 pb-3">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Run Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Run Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sprint 24 Regression Execution"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe scope and goals of this test run..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>
          </div>

          {/* Context & Assignment */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-6">
            <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-slate-800/80 pb-3">
              <Layers className="w-4 h-4 text-emerald-400" />
              Target Environment & Associations
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
                  Associate Test Plan (Optional)
                </label>
                <select
                  value={testPlanId}
                  onChange={(e) => handlePlanChange(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">None (Ad-hoc run)</option>
                  {testPlans.map((p: TestPlanDto) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p._count?.selectedCases || 0} cases)
                    </option>
                  ))}
                </select>
                {selectedPlan && (
                  <p className="text-xs text-emerald-400 mt-1.5">
                    Plan selected: will include all {selectedPlan.selectedCases?.length || 0} planned cases automatically if no custom cases are checked below.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-slate-400" />
                  Target Environment
                </label>
                <select
                  value={environmentId}
                  onChange={(e) => setEnvironmentId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">Select Environment (Optional)</option>
                  {environments?.map((env: any) => (
                    <option key={env.id} value={env.id}>
                      {env.name} ({env.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Milestone
                </label>
                <select
                  value={milestoneId}
                  onChange={(e) => setMilestoneId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">Select Milestone (Optional)</option>
                  {milestones.map((m: MilestoneDto) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Lead Tester / Assignee
                </label>
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">Unassigned</option>
                  {members?.map((m: any) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user?.firstName} {m.user?.lastName} ({m.user?.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Test Case Selection */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  Select Test Cases ({selectedCaseIds.length} selected)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {testPlanId
                    ? 'Leaving empty will auto-import all test cases from the selected test plan.'
                    : 'Choose which repository test cases to execute in this run.'}
                </p>
              </div>
              {testCases.length > 0 && (
                <button
                  type="button"
                  onClick={selectAllCases}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                >
                  {selectedCaseIds.length === testCases.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {testCases.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                No test cases found in this project repository yet.
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {testCases.map((tc: TestCaseDto) => {
                  const isChecked = selectedCaseIds.includes(tc.id);
                  return (
                    <label
                      key={tc.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                          : 'bg-slate-950/60 border-slate-800/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCase(tc.id)}
                        className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500/30"
                      />
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                        {tc.key || `TC-${tc.caseNumber}`}
                      </span>
                      <span className="text-sm font-medium truncate flex-1">{tc.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 shrink-0">
                        {tc.priority}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Link
              href={`/projects/${projectId}/test-runs`}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-sm transition-colors border border-slate-800"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-sm transition-all shadow-lg shadow-emerald-600/20"
            >
              <PlayCircle className="w-4 h-4" />
              {createMutation.isPending ? 'Creating Run...' : 'Create Test Run'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
