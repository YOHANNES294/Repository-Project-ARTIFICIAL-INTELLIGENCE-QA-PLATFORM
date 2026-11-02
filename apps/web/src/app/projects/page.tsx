'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import { ProjectDto, ProjectStatus } from '@ai-qa/shared-types';
import {
  FolderGit2,
  Plus,
  Search,
  Users,
  Server,
  CheckSquare,
  Archive,
  RefreshCw,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formKey, setFormKey] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formObjectives, setFormObjectives] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['projects', searchTerm, statusFilter],
    queryFn: () =>
      defaultApiClient.getProjects({
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' && statusFilter !== 'ARCHIVED' ? (statusFilter as ProjectStatus) : undefined,
        isArchived: statusFilter === 'ARCHIVED' ? true : false,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; key: string; description?: string; objectives?: string }) =>
      defaultApiClient.createProject(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowCreateModal(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create project');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (projectId: string) => defaultApiClient.archiveProject(projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const restoreMutation = useMutation({
    mutationFn: (projectId: string) => defaultApiClient.restoreProject(projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  function resetForm() {
    setFormName('');
    setFormKey('');
    setFormDesc('');
    setFormObjectives('');
    setFormError(null);
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (formName.trim().length < 2) {
      setFormError('Project name must be at least 2 characters');
      return;
    }
    const cleanKey = formKey.trim().toUpperCase();
    if (!/^[A-Z0-9]{2,10}$/.test(cleanKey)) {
      setFormError('Project key must be 2-10 uppercase alphanumeric characters (e.g. CORE, API, WEB)');
      return;
    }

    createMutation.mutate({
      name: formName.trim(),
      key: cleanKey,
      description: formDesc.trim() || undefined,
      objectives: formObjectives.trim() || undefined,
    });
  }

  const projects = data?.projects || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <FolderGit2 className="h-7 w-7 text-blue-600" />
            Project Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Organize software test repositories, target environments, and test team members.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          New Project
        </button>
      </div>

      {/* Filters and Controls */}
      <div className="mt-6 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects by name or key..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {['ALL', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
                statusFilter === st
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid / Empty State */}
      <div className="mt-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 text-center bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900">
            <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-red-900 dark:text-red-200">Failed to load projects</h3>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              {(error as Error)?.message || 'Database error occurred'}
            </p>
          </div>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <FolderGit2 className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No projects found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Try adjusting your search criteria or status filter.'
                : 'Get started by creating your first quality assurance project.'}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((proj: ProjectDto) => (
              <div
                key={proj.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                      {proj.key}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                        proj.status === ProjectStatus.ACTIVE
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : proj.status === ProjectStatus.ARCHIVED
                          ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                      }`}
                    >
                      {proj.status}
                    </span>
                  </div>

                  <Link href={`/projects/${proj.id}`} className="group">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                      {proj.name}
                    </h3>
                  </Link>

                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">
                    {proj.description || 'No description provided.'}
                  </p>

                  {proj.objectives && (
                    <div className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-1">{proj.objectives}</span>
                    </div>
                  )}
                </div>

                <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700/60 rounded-b-xl flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center" title="Project Members">
                      <Users className="h-3.5 w-3.5 mr-1" />
                      {proj._count?.members || 1}
                    </span>
                    <span className="flex items-center" title="Target Environments">
                      <Server className="h-3.5 w-3.5 mr-1" />
                      {proj._count?.environments || 3}
                    </span>
                    <span className="flex items-center" title="Test Cases">
                      <CheckSquare className="h-3.5 w-3.5 mr-1" />
                      {proj._count?.testCases || 0}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {proj.isArchived ? (
                      <button
                        onClick={() => restoreMutation.mutate(proj.id)}
                        className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
                      >
                        <RefreshCw className="h-3 w-3" /> Restore
                      </button>
                    ) : (
                      <button
                        onClick={() => archiveMutation.mutate(proj.id)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title="Archive Project"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Create New Project</h2>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Core Banking Platform"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (!formKey && e.target.value.length >= 2) {
                      setFormKey(e.target.value.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, ''));
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Project Key * (2-10 uppercase alphanumeric chars)
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder="e.g. CORE"
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 font-mono border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-400 mt-1">Used to prefix test cases and defect IDs (e.g. CORE-101).</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of the scope and testing objectives..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Quality Objectives
                </label>
                <input
                  type="text"
                  placeholder="e.g. 95% pass rate on smoke tests, zero critical defects"
                  value={formObjectives}
                  onChange={(e) => setFormObjectives(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
