'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import {
  TestPriority,
  TestType,
  TestCaseStatus,
  TestStepDto,
} from '@ai-qa/shared-types';
import {
  CheckSquare,
  ArrowLeft,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Tag as TagIcon,
  X,
  AlertCircle,
  Save,
  History,
  Archive,
  RefreshCw,
  Clock,
  User,
} from 'lucide-react';

export default function EditTestCasePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = params.projectId as string;
  const caseId = params.caseId as string;

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [preconditions, setPreconditions] = useState('');
  const [objectives, setObjectives] = useState('');
  const [suiteId, setSuiteId] = useState('');
  const [milestoneId, setMilestoneId] = useState('');
  const [priority, setPriority] = useState<TestPriority>(TestPriority.MEDIUM);
  const [type, setType] = useState<TestType>(TestType.FUNCTIONAL);
  const [status, setStatus] = useState<TestCaseStatus>(TestCaseStatus.ACTIVE);
  const [estimatedTimeMin, setEstimatedTimeMin] = useState<number>(5);
  const [changeSummary, setChangeSummary] = useState('');

  // Tags
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Steps
  const [steps, setSteps] = useState<Array<{ stepNumber: number; action: string; testData: string; expectedResult: string }>>([]);

  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => defaultApiClient.getProject(projectId),
  });

  const { data: suites = [] } = useQuery({
    queryKey: ['test-suites', projectId],
    queryFn: () => defaultApiClient.getTestSuites(projectId),
  });

  const { data: milestonesData } = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => defaultApiClient.getMilestones(projectId),
  });

  const { data: testCase, isLoading } = useQuery({
    queryKey: ['test-case', projectId, caseId],
    queryFn: () => defaultApiClient.getTestCase(projectId, caseId),
  });

  // Populate state when test case loads
  useEffect(() => {
    if (testCase) {
      setTitle(testCase.title);
      setDescription(testCase.description || '');
      setPreconditions(testCase.preconditions || '');
      setObjectives(testCase.objectives || '');
      setSuiteId(testCase.suiteId || '');
      setMilestoneId(testCase.milestoneId || '');
      setPriority(testCase.priority);
      setType(testCase.type);
      setStatus(testCase.status);
      setEstimatedTimeMin(testCase.estimatedTimeMin || 0);
      setTags(testCase.tags?.map((t) => t.name) || []);

      const currentSteps = testCase.currentVersionDetails?.steps || [];
      if (currentSteps.length > 0) {
        setSteps(
          currentSteps.map((s) => ({
            stepNumber: s.stepNumber,
            action: s.action,
            testData: s.testData || '',
            expectedResult: s.expectedResult,
          }))
        );
      } else {
        setSteps([
          {
            stepNumber: 1,
            action: 'Execute verification step',
            testData: '',
            expectedResult: 'System performs as expected',
          },
        ]);
      }
    }
  }, [testCase]);

  // Step Management
  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        stepNumber: prev.length + 1,
        action: '',
        testData: '',
        expectedResult: '',
      },
    ]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    const next = steps.filter((_, i) => i !== index);
    setSteps(next.map((s, idx) => ({ ...s, stepNumber: idx + 1 })));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= steps.length) return;

    const next = [...steps];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;

    setSteps(next.map((s, idx) => ({ ...s, stepNumber: idx + 1 })));
  };

  const updateStepField = (
    index: number,
    field: 'action' | 'testData' | 'expectedResult',
    value: string
  ) => {
    const next = [...steps];
    next[index][field] = value;
    setSteps(next);
  };

  // Tag helpers
  const handleAddTag = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const clean = tagInput.trim().replace(/^#/, '');
      if (clean && !tags.includes(clean)) {
        setTags([...tags, clean]);
      }
      setTagInput('');
    }
  };

  const removeTag = (t: string) => {
    setTags(tags.filter((x) => x !== t));
  };

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error('Title is required');
      if (steps.some((s) => !s.action.trim() || !s.expectedResult.trim())) {
        throw new Error('All steps must have an action and expected result');
      }

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        preconditions: preconditions.trim() || null,
        objectives: objectives.trim() || null,
        suiteId: suiteId || null,
        milestoneId: milestoneId || null,
        priority,
        type,
        status,
        estimatedTimeMin: estimatedTimeMin || null,
        tags,
        steps: steps.map((s, idx) => ({
          stepNumber: idx + 1,
          action: s.action.trim(),
          testData: s.testData.trim() || null,
          expectedResult: s.expectedResult.trim(),
        })),
        changeSummary: changeSummary.trim() || undefined,
      };

      return defaultApiClient.updateTestCase(projectId, caseId, payload);
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['test-case', projectId, caseId] });
      queryClient.invalidateQueries({ queryKey: ['test-cases', projectId] });
      setChangeSummary('');
      alert(`Test case updated successfully! Now at version v${updated.currentVersion}.`);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to update test case');
    },
  });

  // Archive / Restore Mutation
  const toggleArchiveMutation = useMutation({
    mutationFn: async () => {
      if (testCase?.isArchived) {
        return defaultApiClient.restoreTestCase(projectId, caseId);
      } else {
        return defaultApiClient.archiveTestCase(projectId, caseId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case', projectId, caseId] });
      queryClient.invalidateQueries({ queryKey: ['test-cases', projectId] });
    },
  });

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-r-transparent mb-2"></div>
        <p className="text-sm text-slate-500">Loading test case details...</p>
      </div>
    );
  }

  if (!testCase) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm text-slate-500">Test case not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/projects" className="hover:text-blue-600">Projects</Link>
            <span>/</span>
            <Link href={`/projects/${projectId}`} className="hover:text-blue-600">{project?.name || 'Project'}</Link>
            <span>/</span>
            <Link href={`/projects/${projectId}/test-cases`} className="hover:text-blue-600">Test Cases</Link>
            <span>/</span>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
              {testCase.key}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{testCase.title}</h1>
            <Link
              href={`/projects/${projectId}/test-cases/${caseId}/versions`}
              className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-100 flex items-center gap-1 transition-colors"
            >
              <History className="h-3.5 w-3.5" />
              v{testCase.currentVersion} History
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleArchiveMutation.mutate()}
            className="px-3.5 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors"
          >
            {testCase.isArchived ? (
              <>
                <RefreshCw className="h-4 w-4" /> Restore
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" /> Archive
              </>
            )}
          </button>

          <button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending || !title.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {formError && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm flex items-center gap-2 border border-red-200 dark:border-red-900/50">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Main Details Form */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
            Test Case Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Test Suite</label>
            <select
              value={suiteId}
              onChange={(e) => setSuiteId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:outline-none"
            >
              <option value="">No Suite (Root)</option>
              {suites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Milestone</label>
            <select
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:outline-none"
            >
              <option value="">No Milestone</option>
              {milestonesData?.milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TestPriority)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:outline-none"
            >
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TestType)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:outline-none"
            >
              <option value="FUNCTIONAL">Functional</option>
              <option value="REGRESSION">Regression</option>
              <option value="SMOKE">Smoke</option>
              <option value="SANITY">Sanity</option>
              <option value="INTEGRATION">Integration</option>
              <option value="SECURITY">Security</option>
              <option value="PERFORMANCE">Performance</option>
              <option value="ACCESSIBILITY">Accessibility</option>
              <option value="EXPLORATORY">Exploratory</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TestCaseStatus)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:outline-none"
            >
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="DEPRECATED">Deprecated</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Estimated Time (Minutes)
            </label>
            <input
              type="number"
              min={0}
              max={1440}
              value={estimatedTimeMin}
              onChange={(e) => setEstimatedTimeMin(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Tags</label>
            <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 min-h-[42px]">
              {tags.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-xs font-medium flex items-center gap-1"
                >
                  #{t}
                  <button type="button" onClick={() => removeTag(t)} className="hover:text-red-600">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="Add tag and press Enter..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                className="flex-1 bg-transparent border-none text-xs focus:outline-none min-w-[120px]"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Preconditions</label>
            <textarea
              rows={2}
              value={preconditions}
              onChange={(e) => setPreconditions(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:outline-none"
            />
          </div>
        </div>

        {/* Change Summary note for versioning */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <label className="block text-xs font-semibold uppercase text-blue-600 dark:text-blue-400 mb-1">
            Change Summary (Recorded in Version History)
          </label>
          <input
            type="text"
            placeholder="e.g. Added verification for two-factor SMS timeout"
            value={changeSummary}
            onChange={(e) => setChangeSummary(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/20 text-sm focus:outline-none"
          />
        </div>
      </div>

      {/* MULTI-STEP TEST CASE STEP EDITOR */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Ordered Test Steps ({steps.length})</h2>
            <p className="text-xs text-slate-500">Reorder, edit, and specify precise verification expectations.</p>
          </div>
          <button
            type="button"
            onClick={addStep}
            className="px-3.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Step
          </button>
        </div>

        <div className="space-y-3">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  Step {step.stepNumber}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveStep(idx, 'up')}
                    className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 rounded"
                    title="Move Up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === steps.length - 1}
                    onClick={() => moveStep(idx, 'down')}
                    className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 rounded"
                    title="Move Down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={steps.length <= 1}
                    onClick={() => removeStep(idx)}
                    className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 rounded ml-1"
                    title="Delete Step"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-sm">
                <div className="md:col-span-5">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Action *
                  </label>
                  <input
                    type="text"
                    required
                    value={step.action}
                    onChange={(e) => updateStepField(idx, 'action', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:outline-none"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Test Data
                  </label>
                  <input
                    type="text"
                    value={step.testData}
                    onChange={(e) => updateStepField(idx, 'testData', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:outline-none"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Expected Result *
                  </label>
                  <input
                    type="text"
                    required
                    value={step.expectedResult}
                    onChange={(e) => updateStepField(idx, 'expectedResult', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
