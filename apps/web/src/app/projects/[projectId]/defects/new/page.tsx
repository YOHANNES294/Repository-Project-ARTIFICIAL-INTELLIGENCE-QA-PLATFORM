'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import {
  DefectSeverity,
  DefectPriority,
  DefectType,
  DuplicateCandidateDto,
  CreateDefectInput,
} from '@ai-qa/shared-types';
import {
  Bug,
  ArrowLeft,
  AlertCircle,
  Copy,
  Sparkles,
  Link2,
  CheckCircle2,
  Layers,
  Server,
  User,
  Calendar,
  Monitor,
  Cpu,
  Info,
  ExternalLink,
} from 'lucide-react';

export default function NewDefectPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;

  // Prefill params from execution runner
  const prefillTestResultId = searchParams.get('testResultId') || undefined;
  const prefillTestCaseId = searchParams.get('testCaseId') || undefined;
  const prefillRunId = searchParams.get('runId') || undefined;
  const prefillTitle = searchParams.get('title') || '';
  const prefillActual = searchParams.get('actualResult') || '';
  const prefillReason = searchParams.get('failureReason') || '';

  // Form Fields
  const [title, setTitle] = useState(prefillTitle);
  const [description, setDescription] = useState(
    prefillReason ? `Observed failure during execution:\n${prefillReason}` : ''
  );
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [actualBehavior, setActualBehavior] = useState(prefillActual || prefillReason || '');
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
  const [error, setError] = useState<string | null>(null);

  // Duplicate candidate detector state
  const [duplicateCandidates, setDuplicateCandidates] = useState<DuplicateCandidateDto[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  // Fetch Project
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => defaultApiClient.getProject(projectId),
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

  // Fetch Prefilled Test Case details if testCaseId is present
  const { data: prefilledTestCase } = useQuery({
    queryKey: ['test-case', projectId, prefillTestCaseId],
    queryFn: () => (prefillTestCaseId ? defaultApiClient.getTestCase(projectId, prefillTestCaseId) : null),
    enabled: Boolean(prefillTestCaseId),
  });

  // If prefilled test case is loaded and title wasn't set, prefill sensible title and steps
  useEffect(() => {
    if (prefilledTestCase && !title) {
      setTitle(`[Failure] ${prefilledTestCase.title}`);
      if (prefilledTestCase.currentVersionDetails) {
        const v = prefilledTestCase.currentVersionDetails;
        if (v.steps && v.steps.length > 0) {
          setExpectedBehavior(
            v.steps.map((s: any) => `Step ${s.stepNumber}: ${s.expectedResult}`).join('\n')
          );
          const stepsText = v.steps
            .map((s: any) => `${s.stepNumber}. ${s.action} -> Expected: ${s.expectedResult}`)
            .join('\n');
          setStepsToReproduce(stepsText);
        }
      }
    }
  }, [prefilledTestCase]);

  // Debounced duplicate candidate check
  useEffect(() => {
    if (!title || title.trim().length < 3) {
      setDuplicateCandidates([]);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingDuplicates(true);
      try {
        const candidates = await defaultApiClient.getDefectDuplicateCandidates(projectId, {
          title: title.trim(),
          component: component.trim() || undefined,
          environmentId: environmentId || undefined,
        });
        setDuplicateCandidates(candidates || []);
      } catch (err) {
        // Soft fail for duplicate check
        console.error('Duplicate detection failed', err);
      } finally {
        setCheckingDuplicates(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [projectId, title, component, environmentId]);

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      if (!title.trim()) {
        throw new Error('Defect title is required');
      }

      const payload: CreateDefectInput = {
        title: title.trim(),
        description: description.trim() || title.trim(),
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
        testResultId: prefillTestResultId,
        testCaseId: prefillTestCaseId,
      };

      return defaultApiClient.createDefect(projectId, payload);
    },
    onSuccess: (defect) => {
      router.push(`/projects/${projectId}/defects/${defect.id}`);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to create defect');
    },
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Breadcrumb Header */}
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}/defects`}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <Link href={`/projects/${projectId}`} className="hover:text-slate-200">
                {project?.name || 'Project'}
              </Link>
              <span>/</span>
              <Link href={`/projects/${projectId}/defects`} className="hover:text-slate-200">
                Defects
              </Link>
              <span>/</span>
              <span className="text-rose-400">Report Defect</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Bug className="w-7 h-7 text-rose-500" />
              Report New Defect
            </h1>
          </div>
        </div>

        {/* Execution context prefill banner */}
        {prefillTestCaseId && (
          <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/60 text-blue-300 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                Prefilled from failed execution session (Test Case:{' '}
                <strong className="text-white font-mono">
                  {prefilledTestCase?.key || prefillTestCaseId}
                </strong>
                {prefillRunId ? ` in Run ${prefillRunId}` : ''}). Will be linked automatically upon creation.
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Defect Form (2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-6">
              <h2 className="text-base font-semibold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <Bug className="w-4 h-4 text-rose-400" />
                Defect Details & Reproduction
              </h2>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Defect Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. User cannot complete checkout when coupon has special characters"
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
                    <option value={DefectSeverity.CRITICAL}>CRITICAL (System Down / Blocker)</option>
                    <option value={DefectSeverity.HIGH}>HIGH (Major feature broken)</option>
                    <option value={DefectSeverity.MEDIUM}>MEDIUM (Standard defect)</option>
                    <option value={DefectSeverity.LOW}>LOW (Minor / Cosmetic)</option>
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
                    <option value={DefectPriority.URGENT}>URGENT (Fix immediately)</option>
                    <option value={DefectPriority.HIGH}>HIGH (Current release cycle)</option>
                    <option value={DefectPriority.MEDIUM}>MEDIUM (Normal queue)</option>
                    <option value={DefectPriority.LOW}>LOW (Backlog / Low priority)</option>
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
                    <option value={DefectType.UI}>UI / VISUAL</option>
                    <option value={DefectType.API}>API / BACKEND</option>
                    <option value={DefectType.PERFORMANCE}>PERFORMANCE</option>
                    <option value={DefectType.SECURITY}>SECURITY</option>
                    <option value={DefectType.ACCESSIBILITY}>ACCESSIBILITY</option>
                    <option value={DefectType.DATA}>DATA / INTEGRITY</option>
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
                    placeholder="e.g. Auth, Checkout, Billing, Test Runner"
                    value={component}
                    onChange={(e) => setComponent(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Target Resolution Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Detailed Description & Summary
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide comprehensive context, user impact, and failure overview..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                />
              </div>

              {/* Steps to Reproduce */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Steps to Reproduce
                </label>
                <textarea
                  rows={4}
                  placeholder="1. Navigate to /checkout&#10;2. Add items to cart&#10;3. Apply coupon code '@SAVE50'&#10;4. Click Apply Button"
                  value={stepsToReproduce}
                  onChange={(e) => setStepsToReproduce(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
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
                    placeholder="Coupon is validated and discount applied smoothly"
                    value={expectedBehavior}
                    onChange={(e) => setExpectedBehavior(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Actual Observed Behavior
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Unhandled exception: 500 Internal Server Error displayed"
                    value={actualBehavior}
                    onChange={(e) => setActualBehavior(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Environment & Hardware Breakdown */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
              <h2 className="text-base font-semibold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-emerald-400" />
                Client & Platform Environment
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Browser</label>
                  <input
                    type="text"
                    placeholder="e.g. Chrome 122.0"
                    value={browser}
                    onChange={(e) => setBrowser(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Operating System</label>
                  <input
                    type="text"
                    placeholder="e.g. macOS Sonoma / Windows 11"
                    value={os}
                    onChange={(e) => setOs(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">App Build / Version</label>
                  <input
                    type="text"
                    placeholder="e.g. v2.4.1 (commit a9b2f)"
                    value={appVersion}
                    onChange={(e) => setAppVersion(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Device Form Factor</label>
                  <input
                    type="text"
                    placeholder="e.g. Desktop 1440p / iPhone 15"
                    value={device}
                    onChange={(e) => setDevice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-between pt-2">
              <Link
                href={`/projects/${projectId}/defects`}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm font-medium border border-slate-800 transition-colors"
              >
                Cancel
              </Link>

              <button
                type="button"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !title.trim()}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-medium text-sm transition-all shadow-lg shadow-rose-600/25"
              >
                <Bug className="w-4 h-4" />
                {createMutation.isPending ? 'Logging Defect...' : 'Create Defect'}
              </button>
            </div>
          </div>

          {/* Sidebar: Relationships & Real-Time Duplicate Detector (1 column) */}
          <div className="space-y-6">
            {/* Project & Ownership Assignment */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-rose-400" />
                Assignment & Scope
              </h3>

              {/* Developer Assignee */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Developer Assignee
                </label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                >
                  <option value="">Unassigned</option>
                  {members.map((m: any) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user?.firstName} {m.user?.lastName} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* QA Owner */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  QA Owner / Verifier
                </label>
                <select
                  value={qaOwnerId}
                  onChange={(e) => setQaOwnerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                >
                  <option value="">Unassigned</option>
                  {members.map((m: any) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user?.firstName} {m.user?.lastName} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Environment */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Target Environment
                </label>
                <select
                  value={environmentId}
                  onChange={(e) => setEnvironmentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                >
                  <option value="">None / General</option>
                  {environments.map((env: any) => (
                    <option key={env.id} value={env.id}>
                      {env.name} ({env.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Associated Milestone */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Associated Milestone
                </label>
                <select
                  value={milestoneId}
                  onChange={(e) => setMilestoneId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                >
                  <option value="">None / Backlog</option>
                  {milestones.map((ms: any) => (
                    <option key={ms.id} value={ms.id}>
                      {ms.name} ({ms.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Duplicate Defect Candidate Detector */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Copy className="w-4 h-4 text-purple-400" />
                  Duplicate Candidate Detection
                </h3>
                {checkingDuplicates && (
                  <span className="text-[10px] text-purple-400 animate-pulse font-mono">
                    Scanning...
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400">
                AI similarity engine checks titles, components, and environments to prevent redundant bug reports.
              </p>

              {duplicateCandidates.length > 0 ? (
                <div className="space-y-3 pt-1">
                  <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{duplicateCandidates.length} potential duplicate(s) detected:</span>
                  </div>

                  {duplicateCandidates.map((candidate) => (
                    <div
                      key={candidate.defect.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-rose-400">
                          {candidate.defect.key}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                          {candidate.confidence}% MATCH
                        </span>
                      </div>

                      <p className="font-medium text-white line-clamp-2">
                        {candidate.defect.title}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                        <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-900">
                          {candidate.defect.status}
                        </span>
                        <a
                          href={`/projects/${projectId}/defects/${candidate.defect.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-purple-400 hover:text-purple-300 inline-flex items-center gap-1"
                        >
                          View Bug <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 text-center text-xs text-slate-500">
                  {title.trim().length >= 3
                    ? 'No matching duplicate candidates found. This defect appears unique.'
                    : 'Start typing a title to run real-time similarity checks.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
