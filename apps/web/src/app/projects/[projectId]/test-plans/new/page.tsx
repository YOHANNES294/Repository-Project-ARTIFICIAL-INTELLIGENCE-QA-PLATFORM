'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import { TestPlanStatus, TestPriority } from '@ai-qa/shared-types';
import {
  ClipboardList,
  ArrowLeft,
  Calendar,
  Layers,
  ShieldCheck,
  Target,
  FileText,
  AlertCircle,
} from 'lucide-react';

export default function NewTestPlanPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [objectives, setObjectives] = useState('');
  const [scope, setScope] = useState('');
  const [strategy, setStrategy] = useState('');
  const [status, setStatus] = useState<TestPlanStatus>(TestPlanStatus.PLANNED);
  const [priority, setPriority] = useState<TestPriority>(TestPriority.MEDIUM);
  const [milestoneId, setMilestoneId] = useState<string>('');
  const [environmentId, setEnvironmentId] = useState<string>('');
  const [managerId, setManagerId] = useState<string>('');
  const [entryCriteria, setEntryCriteria] = useState('');
  const [exitCriteria, setExitCriteria] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch Milestones
  const { data: milestonesData } = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => defaultApiClient.getMilestones(projectId),
  });

  // Fetch Environments
  const { data: environments } = useQuery({
    queryKey: ['environments', projectId],
    queryFn: () => defaultApiClient.getProjectEnvironments(projectId),
  });

  // Fetch Project Members
  const { data: members } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => defaultApiClient.getProjectMembers(projectId),
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: () => {
      if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
        throw new Error('End date must be greater than or equal to start date');
      }

      return defaultApiClient.createTestPlan(projectId, {
        name: name.trim(),
        description: description.trim() || undefined,
        objectives: objectives.trim() || undefined,
        scope: scope.trim() || undefined,
        strategy: strategy.trim() || undefined,
        status,
        priority,
        milestoneId: milestoneId || undefined,
        environmentId: environmentId || undefined,
        managerId: managerId || undefined,
        entryCriteria: entryCriteria.trim() || undefined,
        exitCriteria: exitCriteria.trim() || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      });
    },
    onSuccess: (newPlan) => {
      router.push(`/projects/${projectId}/test-plans/${newPlan.id}`);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to create test plan');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Test plan name is required');
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
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
              <span className="text-indigo-400">New Plan</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <ClipboardList className="w-7 h-7 text-indigo-400" />
              Create Master Test Plan
            </h1>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-300 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Information Card */}
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-5">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              General Information
            </h2>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                Plan Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Master Regression Plan - Release 2.0"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">Initial Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TestPlanStatus)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value={TestPlanStatus.DRAFT}>Draft</option>
                  <option value={TestPlanStatus.PLANNED}>Planned</option>
                  <option value={TestPlanStatus.IN_PROGRESS}>In Progress</option>
                  <option value={TestPlanStatus.COMPLETED}>Completed</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TestPriority)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value={TestPriority.CRITICAL}>Critical</option>
                  <option value={TestPriority.HIGH}>High</option>
                  <option value={TestPriority.MEDIUM}>Medium</option>
                  <option value={TestPriority.LOW}>Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">Description</label>
              <textarea
                rows={3}
                placeholder="Brief summary of what this test plan covers..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          {/* Strategy & Scope Card */}
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-5">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-400" />
              Strategy, Objectives & Scope
            </h2>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">Quality Objectives</label>
              <textarea
                rows={2}
                placeholder="e.g. Zero critical defects in payment processing workflows..."
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">Scope (In-Scope / Out-of-Scope)</label>
                <textarea
                  rows={3}
                  placeholder="In-scope modules and features..."
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">Testing Strategy & Approach</label>
                <textarea
                  rows={3}
                  placeholder="Automated smoke, manual functional, security audit..."
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">Entry Criteria</label>
                <textarea
                  rows={2}
                  placeholder="Conditions before testing can begin..."
                  value={entryCriteria}
                  onChange={(e) => setEntryCriteria(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">Exit Criteria</label>
                <textarea
                  rows={2}
                  placeholder="Conditions before testing can be declared complete..."
                  value={exitCriteria}
                  onChange={(e) => setExitCriteria(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>
          </div>

          {/* Association & Timeline Card */}
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-5">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              Associations & Schedule
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">Associated Milestone</label>
                <select
                  value={milestoneId}
                  onChange={(e) => setMilestoneId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="">None (Standalone)</option>
                  {milestonesData?.milestones.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">Target Environment</label>
                <select
                  value={environmentId}
                  onChange={(e) => setEnvironmentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="">None (Any)</option>
                  {environments?.map((env) => (
                    <option key={env.id} value={env.id}>
                      {env.name} ({env.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">Assigned QA Lead</label>
                <select
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="">Unassigned</option>
                  {members?.map((m) => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.firstName} {m.user.lastName} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">Target End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end items-center gap-3 pt-4">
            <Link
              href={`/projects/${projectId}/test-plans`}
              className="px-5 py-2.5 rounded-xl border border-slate-800 text-sm font-medium text-slate-400 hover:bg-slate-900 hover:text-white transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating Plan...' : 'Create Test Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
