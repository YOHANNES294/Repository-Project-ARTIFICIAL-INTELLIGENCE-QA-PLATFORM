'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import {
  DefectSeverity,
  DefectPriority,
  DefectType,
  UpdateDefectInput,
} from '@ai-qa/shared-types';
import {
  Bug,
  ArrowLeft,
  AlertCircle,
  Save,
  Clock,
  Monitor,
  User,
} from 'lucide-react';

export default function EditDefectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const defectId = params.defectId as string;

  // Form Fields State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [actualBehavior, setActualBehavior] = useState('');
  const [severity, setSeverity] = useState<DefectSeverity>(DefectSeverity.MEDIUM);
  const [priority, setPriority] = useState<DefectPriority>(DefectPriority.MEDIUM);
  const [type, setType] = useState<DefectType>(DefectType.FUNCTIONAL);
  const [component, setComponent] = useState('');
  const [environmentId, setEnvironmentId] = useState('');
  const [milestoneId, setMilestoneId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [qaOwnerId, setQaOwnerId] = useState('');
  const [browser, setBrowser] = useState('');
  const [os, setOs] = useState('');
  const [appVersion, setAppVersion] = useState('');
  const [device, setDevice] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [resolution, setResolution] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch Defect
  const { data: defect, isLoading: defectLoading } = useQuery({
    queryKey: ['defect', projectId, defectId],
    queryFn: async () => {
      const d = await defaultApiClient.getDefect(projectId, defectId);
      setTitle(d.title);
      setDescription(d.description || '');
      setStepsToReproduce(d.stepsToRepro || '');
      setExpectedBehavior(d.expectedResult || '');
      setActualBehavior(d.actualResult || '');
      setSeverity(d.severity);
      setPriority(d.priority);
      setType(d.type);
      setComponent(d.component || '');
      setEnvironmentId(d.environmentId || '');
      setMilestoneId(d.milestoneId || '');
      setAssigneeId(d.assigneeId || '');
      setQaOwnerId(d.qaOwnerId || '');
      setBrowser(d.browser || '');
      setOs(d.os || '');
      setAppVersion(d.appVersion || '');
      setDevice(d.device || '');
      setDueDate(d.dueDate ? d.dueDate.slice(0, 10) : '');
      setRootCause(d.rootCause || '');
      setResolution(d.resolution || '');
      return d;
    },
  });

  // Fetch Environments
  const { data: environments = [] } = useQuery({
    queryKey: ['project-environments', projectId],
    queryFn: () => defaultApiClient.getProjectEnvironments(projectId),
  });

  // Fetch Milestones
  const { data: milestonesData } = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => defaultApiClient.getMilestones(projectId),
  });
  const milestones = milestonesData?.milestones || [];

  // Fetch Project Members
  const { data: members = [] } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => defaultApiClient.getProjectMembers(projectId),
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      if (!title.trim()) {
        throw new Error('Defect title is required');
      }

      const payload: UpdateDefectInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        stepsToRepro: stepsToReproduce.trim() || undefined,
        expectedResult: expectedBehavior.trim() || undefined,
        actualResult: actualBehavior.trim() || undefined,
        severity,
        priority,
        type,
        component: component.trim() || undefined,
        environmentId: environmentId || undefined,
        milestoneId: milestoneId || undefined,
        assigneeId: assigneeId || undefined,
        qaOwnerId: qaOwnerId || undefined,
        browser: browser.trim() || undefined,
        os: os.trim() || undefined,
        appVersion: appVersion.trim() || undefined,
        device: device.trim() || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        rootCause: rootCause.trim() || undefined,
        resolution: resolution.trim() || undefined,
      };

      return defaultApiClient.updateDefect(projectId, defectId, payload);
    },
    onSuccess: () => {
      router.push(`/projects/${projectId}/defects/${defectId}`);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to update defect');
    },
  });

  if (defectLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Clock className="w-5 h-5 animate-spin text-rose-500 mr-3" />
        Loading defect for editing...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Breadcrumb Header */}
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}/defects/${defectId}`}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <Link href={`/projects/${projectId}/defects`} className="hover:text-slate-200">
                Defects
              </Link>
              <span>/</span>
              <Link href={`/projects/${projectId}/defects/${defectId}`} className="hover:text-slate-200">
                {defect?.key || 'Defect'}
              </Link>
              <span>/</span>
              <span className="text-rose-400">Edit</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Bug className="w-7 h-7 text-rose-500" />
              Edit Defect ({defect?.key})
            </h1>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Defect Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              required
            />
          </div>

          {/* Classification Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Severity
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as DefectSeverity)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              >
                <option value={DefectSeverity.CRITICAL}>CRITICAL</option>
                <option value={DefectSeverity.HIGH}>HIGH</option>
                <option value={DefectSeverity.MEDIUM}>MEDIUM</option>
                <option value={DefectSeverity.LOW}>LOW</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as DefectPriority)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              >
                <option value={DefectPriority.URGENT}>URGENT</option>
                <option value={DefectPriority.HIGH}>HIGH</option>
                <option value={DefectPriority.MEDIUM}>MEDIUM</option>
                <option value={DefectPriority.LOW}>LOW</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Defect Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as DefectType)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              >
                <option value={DefectType.FUNCTIONAL}>FUNCTIONAL</option>
                <option value={DefectType.UI}>UI</option>
                <option value={DefectType.API}>API</option>
                <option value={DefectType.PERFORMANCE}>PERFORMANCE</option>
                <option value={DefectType.SECURITY}>SECURITY</option>
                <option value={DefectType.ACCESSIBILITY}>ACCESSIBILITY</option>
                <option value={DefectType.DATA}>DATA</option>
                <option value={DefectType.INTEGRATION}>INTEGRATION</option>
                <option value={DefectType.OTHER}>OTHER</option>
              </select>
            </div>
          </div>

          {/* Component & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Component / Module
              </label>
              <input
                type="text"
                value={component}
                onChange={(e) => setComponent(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              />
            </div>
          </div>

          {/* Assignments & Environment */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Assignee</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="">Unassigned</option>
                {members.map((m: any) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user?.firstName} {m.user?.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">QA Owner</label>
              <select
                value={qaOwnerId}
                onChange={(e) => setQaOwnerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="">Unassigned</option>
                {members.map((m: any) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user?.firstName} {m.user?.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Environment</label>
              <select
                value={environmentId}
                onChange={(e) => setEnvironmentId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="">None</option>
                {environments.map((env: any) => (
                  <option key={env.id} value={env.id}>
                    {env.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Milestone</label>
              <select
                value={milestoneId}
                onChange={(e) => setMilestoneId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="">None</option>
                {milestones.map((ms: any) => (
                  <option key={ms.id} value={ms.id}>
                    {ms.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            />
          </div>

          {/* Steps */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Steps to Reproduce
            </label>
            <textarea
              rows={4}
              value={stepsToReproduce}
              onChange={(e) => setStepsToReproduce(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            />
          </div>

          {/* Expected vs Actual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Expected Behavior
              </label>
              <textarea
                rows={3}
                value={expectedBehavior}
                onChange={(e) => setExpectedBehavior(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Actual Behavior
              </label>
              <textarea
                rows={3}
                value={actualBehavior}
                onChange={(e) => setActualBehavior(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              />
            </div>
          </div>

          {/* Root Cause & Resolution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Root Cause Analysis
              </label>
              <textarea
                rows={2}
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Resolution Notes
              </label>
              <textarea
                rows={2}
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              />
            </div>
          </div>

          {/* Client & Device Environment */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Browser</label>
              <input
                type="text"
                value={browser}
                onChange={(e) => setBrowser(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">OS</label>
              <input
                type="text"
                value={os}
                onChange={(e) => setOs(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">App Build</label>
              <input
                type="text"
                value={appVersion}
                onChange={(e) => setAppVersion(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Device</label>
              <input
                type="text"
                value={device}
                onChange={(e) => setDevice(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <Link
              href={`/projects/${projectId}/defects/${defectId}`}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm font-medium border border-slate-800 transition-colors"
            >
              Cancel
            </Link>

            <button
              type="button"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || !title.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-medium text-sm transition-all shadow-lg shadow-rose-600/25"
            >
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? 'Saving Changes...' : 'Save Defect Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
