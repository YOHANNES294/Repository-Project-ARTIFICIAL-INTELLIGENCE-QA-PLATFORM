'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';

export default function NewTestCasePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = params.projectId as string;

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

  // Tags
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Steps
  const [steps, setSteps] = useState<Array<{ stepNumber: number; action: string; testData: string; expectedResult: string }>>([
    {
      stepNumber: 1,
      action: 'Navigate to target screen or resource',
      testData: '',
      expectedResult: 'Screen loads successfully with all elements active',
    },
  ]);

  const [formError, setFormError] = useState<string | null>(null);

  // Project Info
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => defaultApiClient.getProject(projectId),
  });

  // Suites
  const { data: suites = [] } = useQuery({
    queryKey: ['test-suites', projectId],
    queryFn: () => defaultApiClient.getTestSuites(projectId),
  });

  // Milestones
  const { data: milestonesData } = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => defaultApiClient.getMilestones(projectId),
  });

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
    // Renumber
    setSteps(next.map((s, idx) => ({ ...s, stepNumber: idx + 1 })));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= steps.length) return;

    const next = [...steps];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;

    // Renumber
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

  // Submit Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error('Title is required');
      if (steps.some((s) => !s.action.trim() || !s.expectedResult.trim())) {
        throw new Error('All steps must have an action and expected result');
      }

      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        preconditions: preconditions.trim() || undefined,
        objectives: objectives.trim() || undefined,
        suiteId: suiteId || undefined,
        milestoneId: milestoneId || undefined,
        priority,
        type,
        status,
        estimatedTimeMin: estimatedTimeMin || undefined,
        tags,
        steps: steps.map((s, idx) => ({
          stepNumber: idx + 1,
          action: s.action.trim(),
          testData: s.testData.trim() || undefined,
          expectedResult: s.expectedResult.trim(),
        })),
      };

      return defaultApiClient.createTestCase(projectId, payload);
    },
    onSuccess: (tc) => {
      queryClient.invalidateQueries({ queryKey: ['test-cases', projectId] });
      router.push(`/projects/${projectId}/test-cases/${tc.id}`);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create test case');
    },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/projects" className="hover:text-blue-600">Projects</Link>
            <span>/</span>
            <Link href={`/projects/${projectId}`} className="hover:text-blue-600">{project?.name || 'Project'}</Link>
            <span>/</span>
            <Link href={`/projects/${projectId}/test-cases`} className="hover:text-blue-600">Test Cases</Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 font-medium">New</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <CheckSquare className="h-6 w-6 text-blue-600" />
            Create Test Case
          </h1>
        </div>

        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending || !title.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm disabled:opacity-50 transition-colors"
        >
          <Save className="h-4 w-4" />
          {createMutation.isPending ? 'Saving Test Case...' : 'Save Test Case'}
        </button>
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
            placeholder="e.g. Verify that user session terminates when refreshToken is revoked"
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
              Estimated Execution Time (Minutes)
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
                placeholder="Type and press Enter..."
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
              placeholder="Test context, business logic, user flow..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Preconditions</label>
            <textarea
              rows={2}
              placeholder="Prerequisites, environment setup, seeded data..."
              value={preconditions}
              onChange={(e) => setPreconditions(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* MULTI-STEP TEST CASE STEP EDITOR */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Ordered Test Steps ({steps.length})</h2>
            <p className="text-xs text-slate-500">Define reproducible action, test data, and expected results.</p>
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
                    placeholder="e.g. Click 'Submit' button on login modal"
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
                    placeholder="e.g. email='admin@test.com'"
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
                    placeholder="e.g. Redirects to /dashboard and sets JWT cookie"
                    value={step.expectedResult}
                    onChange={(e) => updateStepField(idx, 'expectedResult', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addStep}
          className="w-full py-2.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Another Step
        </button>
      </div>

      {/* Footer Submit */}
      <div className="flex justify-end gap-3 pt-4">
        <Link
          href={`/projects/${projectId}/test-cases`}
          className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
        >
          Cancel
        </Link>
        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending || !title.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm disabled:opacity-50 transition-colors"
        >
          <Save className="h-4 w-4" />
          {createMutation.isPending ? 'Saving Test Case...' : 'Create Test Case'}
        </button>
      </div>
    </div>
  );
}
