'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import { MilestoneStatus, TestPriority, MilestoneDto } from '@ai-qa/shared-types';
import {
  Milestone,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowLeft,
  Trash2,
  Edit,
  TrendingUp,
  X,
  Target,
} from 'lucide-react';

export default function MilestonesPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const projectId = params.projectId as string;

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<MilestoneDto | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [objectives, setObjectives] = useState('');
  const [status, setStatus] = useState<MilestoneStatus>(MilestoneStatus.PLANNED);
  const [priority, setPriority] = useState<TestPriority>(TestPriority.MEDIUM);
  const [releaseVer, setReleaseVer] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Project Info
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => defaultApiClient.getProject(projectId),
  });

  // Milestones Query
  const { data: milestonesData, isLoading } = useQuery({
    queryKey: ['milestones', projectId, search, statusFilter, priorityFilter],
    queryFn: () =>
      defaultApiClient.getMilestones(projectId, {
        search: search || undefined,
        status: statusFilter ? (statusFilter as MilestoneStatus) : undefined,
        priority: priorityFilter ? (priorityFilter as TestPriority) : undefined,
      }),
  });

  const milestones = milestonesData?.milestones || [];

  // Create/Update Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name,
        description: description || undefined,
        objectives: objectives || undefined,
        status,
        priority,
        releaseVer: releaseVer || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      };

      if (editingMilestone) {
        return defaultApiClient.updateMilestone(projectId, editingMilestone.id, payload);
      } else {
        return defaultApiClient.createMilestone(projectId, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', projectId] });
      closeModal();
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to save milestone');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (milestoneId: string) => defaultApiClient.deleteMilestone(projectId, milestoneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', projectId] });
    },
  });

  const openCreateModal = () => {
    setEditingMilestone(null);
    setName('');
    setDescription('');
    setObjectives('');
    setStatus(MilestoneStatus.PLANNED);
    setPriority(TestPriority.MEDIUM);
    setReleaseVer('');
    setStartDate('');
    setDueDate('');
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (m: MilestoneDto) => {
    setEditingMilestone(m);
    setName(m.name);
    setDescription(m.description || '');
    setObjectives(m.objectives || '');
    setStatus(m.status);
    setPriority(m.priority);
    setReleaseVer(m.releaseVer || '');
    setStartDate(m.startDate ? m.startDate.substring(0, 10) : '');
    setDueDate(m.dueDate ? m.dueDate.substring(0, 10) : '');
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingMilestone(null);
    setFormError(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/projects" className="hover:text-blue-600">Projects</Link>
            <span>/</span>
            <Link href={`/projects/${projectId}`} className="hover:text-blue-600">{project?.name || 'Project'}</Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 font-medium">Milestones</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Milestone className="h-6 w-6 text-blue-600" />
            Project Milestones
          </h1>
        </div>

        <button
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4" /> New Milestone
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search milestones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="PLANNED">Planned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="BLOCKED">Blocked</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none"
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Milestones List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-sm text-slate-500">Loading milestones...</p>
        </div>
      ) : milestones.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
          <Milestone className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">No milestones found</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Create sprint or release milestones to track QA execution progress.
          </p>
          <button
            onClick={openCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Create First Milestone
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {milestones.map((m) => {
            const completion = m.progress?.completionPercentage || 0;
            return (
              <div
                key={m.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-shadow space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          m.status === MilestoneStatus.COMPLETED
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : m.status === MilestoneStatus.IN_PROGRESS
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                            : m.status === MilestoneStatus.BLOCKED
                            ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {m.status}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${
                          m.priority === TestPriority.CRITICAL
                            ? 'bg-rose-100 text-rose-800'
                            : m.priority === TestPriority.HIGH
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {m.priority}
                      </span>
                      {m.releaseVer && (
                        <span className="text-xs font-mono font-medium text-slate-500">
                          {m.releaseVer}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{m.name}</h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(m)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete milestone "${m.name}"?`)) {
                          deleteMutation.mutate(m.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {m.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                    {m.description}
                  </p>
                )}

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between items-center text-xs text-slate-500 mb-1.5 font-medium">
                    <span>QA Execution Progress</span>
                    <span className="text-slate-900 dark:text-white font-bold">{completion}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        completion === 100
                          ? 'bg-emerald-500'
                          : completion > 50
                          ? 'bg-blue-600'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${completion}%` }}
                    />
                  </div>
                </div>

                {/* Metrics Pill Grid */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <div className="p-2 rounded bg-slate-50 dark:bg-slate-900">
                    <div className="font-bold text-slate-800 dark:text-slate-100">{m.progress?.totalRuns || 0}</div>
                    <div className="text-slate-400 text-[10px]">Test Runs</div>
                  </div>
                  <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300">
                    <div className="font-bold">{m.progress?.passedRuns || 0}</div>
                    <div className="text-[10px]">Passed</div>
                  </div>
                  <div className="p-2 rounded bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300">
                    <div className="font-bold">{m.progress?.failedRuns || 0}</div>
                    <div className="text-[10px]">Failed</div>
                  </div>
                  <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300">
                    <div className="font-bold">{m.progress?.openDefects || 0}</div>
                    <div className="text-[10px]">Open Bugs</div>
                  </div>
                </div>

                {/* Timeline dates */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {m.startDate ? new Date(m.startDate).toLocaleDateString() : 'No start date'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      Target: {m.dueDate ? new Date(m.dueDate).toLocaleDateString() : 'No target date'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingMilestone ? 'Edit Milestone' : 'Create New Milestone'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs">
                {formError}
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Major Release"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Scope and purpose of this milestone..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">QA Objectives</label>
                <textarea
                  rows={2}
                  placeholder="Target criteria, exit benchmarks, coverage goals..."
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as MilestoneStatus)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                  >
                    <option value="PLANNED">Planned</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="BLOCKED">Blocked</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TestPriority)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Release Version</label>
                <input
                  type="text"
                  placeholder="e.g. v2.1.0"
                  value={releaseVer}
                  onChange={(e) => setReleaseVer(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !name.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Saving...' : editingMilestone ? 'Save Changes' : 'Create Milestone'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
