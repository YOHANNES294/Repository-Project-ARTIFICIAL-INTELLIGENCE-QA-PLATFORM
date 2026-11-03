'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import { ProjectStatus, ProjectRole, EnvironmentDto, ProjectMemberDto } from '@ai-qa/shared-types';
import {
  FolderGit2,
  Server,
  Users,
  Activity,
  Settings,
  Plus,
  Trash2,
  Archive,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Shield,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Sparkles,
  Edit,
  CheckSquare,
  FolderTree,
  Milestone,
  ArrowRight,
  ClipboardList,
  PlayCircle,
  Bug,
  Cpu,
  BarChart3,
} from 'lucide-react';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = params.projectId as string;

  const [activeTab, setActiveTab] = useState<'overview' | 'environments' | 'members' | 'activity' | 'settings'>('overview');

  // Environment Modal State
  const [showEnvModal, setShowEnvModal] = useState(false);
  const [envName, setEnvName] = useState('');
  const [envType, setEnvType] = useState('CUSTOM');
  const [envUrl, setEnvUrl] = useState('');
  const [envDesc, setEnvDesc] = useState('');
  const [envError, setEnvError] = useState<string | null>(null);

  // Member Modal State
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberUserId, setMemberUserId] = useState('');
  const [memberRole, setMemberRole] = useState<ProjectRole>(ProjectRole.MEMBER);
  const [memberError, setMemberError] = useState<string | null>(null);

  // Edit Settings State
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editObjectives, setEditObjectives] = useState('');
  const [editStatus, setEditStatus] = useState<ProjectStatus>(ProjectStatus.ACTIVE);
  const [deleteConfirmKey, setDeleteConfirmKey] = useState('');

  // Queries
  const { data: project, isLoading: projLoading, isError: projError } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const p = await defaultApiClient.getProject(projectId);
      setEditName(p.name);
      setEditDesc(p.description || '');
      setEditObjectives(p.objectives || '');
      setEditStatus(p.status);
      return p;
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => defaultApiClient.getProjectMembers(projectId),
    enabled: activeTab === 'members' || activeTab === 'overview',
  });

  const { data: environments = [] } = useQuery({
    queryKey: ['project-environments', projectId],
    queryFn: () => defaultApiClient.getProjectEnvironments(projectId),
    enabled: activeTab === 'environments' || activeTab === 'overview',
  });

  const { data: activity = [] } = useQuery({
    queryKey: ['project-activity', projectId],
    queryFn: () => defaultApiClient.getProjectActivity(projectId),
    enabled: activeTab === 'activity',
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: (payload: any) => defaultApiClient.updateProject(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      alert('Project settings updated successfully!');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => defaultApiClient.archiveProject(projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
  });

  const restoreMutation = useMutation({
    mutationFn: () => defaultApiClient.restoreProject(projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => defaultApiClient.deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      router.push('/projects');
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to delete project');
    },
  });

  const addEnvMutation = useMutation({
    mutationFn: (payload: any) => defaultApiClient.createEnvironment(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-environments', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setShowEnvModal(false);
      setEnvName('');
      setEnvUrl('');
      setEnvDesc('');
    },
    onError: (err: any) => setEnvError(err.message || 'Failed to add environment'),
  });

  const deleteEnvMutation = useMutation({
    mutationFn: (envId: string) => defaultApiClient.deleteEnvironment(projectId, envId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-environments', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (payload: any) => defaultApiClient.addProjectMember(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setShowMemberModal(false);
      setMemberUserId('');
    },
    onError: (err: any) => setMemberError(err.message || 'Failed to add member'),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => defaultApiClient.removeProjectMember(projectId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: ProjectRole }) =>
      defaultApiClient.updateProjectMemberRole(projectId, memberId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-members', projectId] }),
  });

  if (projLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-6" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (projError || !project) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Project Not Found</h2>
        <p className="text-sm text-slate-500 mt-1 mb-6">
          The requested project does not exist or you do not have permission to view it in this organization.
        </p>
        <Link
          href="/projects"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <div className="mb-4">
        <Link
          href="/projects"
          className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Projects
        </Link>
      </div>

      {/* Project Header */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-3 rounded-xl">
              <FolderGit2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                  {project.key}
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                    project.status === ProjectStatus.ACTIVE
                      ? 'bg-emerald-100 text-emerald-800'
                      : project.status === ProjectStatus.ARCHIVED
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {project.status}
                </span>
                {project.isArchived && (
                  <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800 font-medium">
                    Archived
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{project.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {project.isArchived ? (
              <button
                onClick={() => restoreMutation.mutate()}
                className="px-3 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-950 flex items-center gap-1.5"
              >
                <RefreshCw className="h-4 w-4" /> Restore Project
              </button>
            ) : (
              <button
                onClick={() => archiveMutation.mutate()}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5"
              >
                <Archive className="h-4 w-4" /> Archive
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 mt-6 -mb-6 space-x-6 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: FolderGit2, href: null },
            { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3, href: `/projects/${projectId}/analytics` },
            { id: 'test-cases', label: 'Test Cases', icon: CheckSquare, href: `/projects/${projectId}/test-cases` },
            { id: 'suites', label: 'Test Suites', icon: FolderTree, href: `/projects/${projectId}/test-suites` },
            { id: 'milestones', label: 'Milestones', icon: Milestone, href: `/projects/${projectId}/milestones` },
            { id: 'environments', label: `Environments (${project.environments?.length || 0})`, icon: Server, href: null },
            { id: 'members', label: 'Team Members', icon: Users, href: null },
            { id: 'activity', label: 'Activity History', icon: Activity, href: null },
            { id: 'settings', label: 'Settings', icon: Settings, href: null },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            if (tab.href) {
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className="pb-3 pt-2 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-blue-600 flex items-center gap-2 transition-colors whitespace-nowrap"
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              );
            }
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 pt-2 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="mt-8">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">About Project</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {project.description || 'No detailed description set for this project yet.'}
                </p>

                {project.objectives && (
                  <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
                    <h4 className="text-xs uppercase font-bold tracking-wider text-blue-800 dark:text-blue-300 flex items-center gap-1.5 mb-1">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      Quality & Testing Objectives
                    </h4>
                    <p className="text-sm text-blue-950 dark:text-blue-200">{project.objectives}</p>
                  </div>
                )}
              </div>

              {/* QA Hub Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link
                  href={`/projects/${projectId}/test-cases`}
                  className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-500 hover:shadow-md transition-all group"
                >
                  <div className="p-2.5 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 w-fit mb-3 group-hover:scale-105 transition-transform">
                    <CheckSquare className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center justify-between">
                    Test Cases
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Repository, step editor, versioning & CSV tools
                  </p>
                </Link>

                <Link
                  href={`/projects/${projectId}/test-suites`}
                  className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-purple-500 hover:shadow-md transition-all group"
                >
                  <div className="p-2.5 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 w-fit mb-3 group-hover:scale-105 transition-transform">
                    <FolderTree className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center justify-between">
                    Test Suites
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Hierarchical folder structure & organization
                  </p>
                </Link>

                <Link
                  href={`/projects/${projectId}/milestones`}
                  className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-amber-500 hover:shadow-md transition-all group"
                >
                  <div className="p-2.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 w-fit mb-3 group-hover:scale-105 transition-transform">
                    <Milestone className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center justify-between">
                    Milestones
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Sprint tracking, release dates & QA progress
                  </p>
                </Link>

                <Link
                  href={`/projects/${projectId}/test-plans`}
                  className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-teal-500 hover:shadow-md transition-all group"
                >
                  <div className="p-2.5 rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 w-fit mb-3 group-hover:scale-105 transition-transform">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center justify-between">
                    Test Plans
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Scope, strategy, criteria & case snapshots
                  </p>
                </Link>

                <Link
                  href={`/projects/${projectId}/test-runs`}
                  className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all group"
                >
                  <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 w-fit mb-3 group-hover:scale-105 transition-transform">
                    <PlayCircle className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center justify-between">
                    Test Runs & Execution
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Workbenches, live runners, retests & metrics
                  </p>
                </Link>

                <Link
                  href={`/projects/${projectId}/defects`}
                  className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-rose-500 hover:shadow-md transition-all group"
                >
                  <div className="p-2.5 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 w-fit mb-3 group-hover:scale-105 transition-transform">
                    <Bug className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center justify-between">
                    Defects & Bug Tracking
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-rose-600 transition-colors" />
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Lifecycle states, duplicate checks & test links
                  </p>
                </Link>

                <Link
                  href={`/projects/${projectId}/ai`}
                  className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-indigo-500 hover:shadow-md transition-all group"
                >
                  <div className="p-2.5 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 w-fit mb-3 group-hover:scale-105 transition-transform">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center justify-between">
                    AI Intelligence Engine
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Test generation, failure diagnostics, duplicate detection, risk & executive QA reports
                  </p>
                </Link>

                <Link
                  href={`/projects/${projectId}/automation`}
                  className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-cyan-500 hover:shadow-md transition-all group"
                >
                  <div className="p-2.5 rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 w-fit mb-3 group-hover:scale-105 transition-transform">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center justify-between">
                    Automation & CI/CD
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-cyan-600 transition-colors" />
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Playwright reporter, Newman ingestion, API tokens, test mappings & CI webhooks
                  </p>
                </Link>

                <Link
                  href={`/projects/${projectId}/analytics`}
                  className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-500 hover:shadow-md transition-all group"
                >
                  <div className="p-2.5 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 w-fit mb-3 group-hover:scale-105 transition-transform">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center justify-between">
                    Advanced Analytics & Reports
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Executive dashboards, quality gates, flakiness, coverage, exports & historical snapshots
                  </p>
                </Link>
              </div>

              {/* Environments Quick View */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Server className="h-5 w-5 text-blue-600" />
                    Target Environments
                  </h3>
                  <button
                    onClick={() => setActiveTab('environments')}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Manage All
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {project.environments?.map((env) => (
                    <div
                      key={env.id}
                      className="p-3 border border-slate-100 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900/40"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">{env.name}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {env.type}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 truncate block">
                        {env.url || 'No Base URL specified'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Metrics Sidebar */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
                  Project Statistics
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-slate-500">Test Cases</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{project._count?.testCases || 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-slate-500">Test Runs</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{project._count?.testRuns || 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-slate-500">Defects</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{project._count?.defects || 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-slate-500">Team Members</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{project._count?.members || 1}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ENVIRONMENTS TAB */}
        {activeTab === 'environments' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Deployment & Test Environments</h2>
                <p className="text-sm text-slate-500">Define API URLs and runtime configs for testing executions.</p>
              </div>
              <button
                onClick={() => setShowEnvModal(true)}
                className="inline-flex items-center px-3.5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Environment
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {environments.map((env: EnvironmentDto) => (
                <div key={env.id} className="py-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900 dark:text-white">{env.name}</h4>
                      <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {env.type}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          env.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {env.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {env.url && (
                      <a
                        href={env.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                      >
                        {env.url} <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {env.description && <p className="text-xs text-slate-500 mt-1">{env.description}</p>}
                  </div>

                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete environment '${env.name}'?`)) {
                        deleteEnvMutation.mutate(env.id);
                      }
                    }}
                    className="text-slate-400 hover:text-red-600 p-2 rounded-lg"
                    title="Delete Environment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MEMBERS TAB */}
        {activeTab === 'members' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Project Team Members</h2>
                <p className="text-sm text-slate-500">Organization members assigned to this QA workspace.</p>
              </div>
              <button
                onClick={() => setShowMemberModal(true)}
                className="inline-flex items-center px-3.5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Assign Member
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {members.map((m: ProjectMemberDto) => (
                <div key={m.id} className="py-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                      {m.user.firstName[0]}
                      {m.user.lastName[0]}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">
                        {m.user.firstName} {m.user.lastName}
                      </h4>
                      <p className="text-xs text-slate-500">{m.user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <select
                      value={m.role}
                      onChange={(e) =>
                        updateMemberRoleMutation.mutate({
                          memberId: m.id,
                          role: e.target.value as ProjectRole,
                        })
                      }
                      className="text-xs font-semibold px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      <option value={ProjectRole.PROJECT_LEAD}>PROJECT LEAD</option>
                      <option value={ProjectRole.MEMBER}>MEMBER</option>
                      <option value={ProjectRole.VIEWER}>VIEWER</option>
                    </select>

                    <button
                      onClick={() => {
                        if (confirm(`Remove ${m.user.firstName} from this project?`)) {
                          removeMemberMutation.mutate(m.id);
                        }
                      }}
                      className="text-slate-400 hover:text-red-600 p-1.5 rounded"
                      title="Remove Member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Project Activity Log</h2>
            {activity.length === 0 ? (
              <p className="text-sm text-slate-500">No activity recorded for this project yet.</p>
            ) : (
              <div className="space-y-4">
                {activity.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-3 text-sm py-2 border-b border-slate-100 dark:border-slate-700">
                    <Clock className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white mr-1.5">
                        {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                      </span>
                      <span className="text-slate-600 dark:text-slate-300 font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 mr-2">
                        {log.action}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">General Settings</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateMutation.mutate({
                    name: editName,
                    description: editDesc,
                    objectives: editObjectives,
                    status: editStatus,
                  });
                }}
                className="space-y-4 max-w-xl"
              >
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as ProjectStatus)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                  >
                    <option value={ProjectStatus.ACTIVE}>ACTIVE</option>
                    <option value={ProjectStatus.ON_HOLD}>ON HOLD</option>
                    <option value={ProjectStatus.COMPLETED}>COMPLETED</option>
                    <option value={ProjectStatus.ARCHIVED}>ARCHIVED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Quality Objectives
                  </label>
                  <input
                    type="text"
                    value={editObjectives}
                    onChange={(e) => setEditObjectives(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </form>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-red-900 dark:text-red-200 mb-2">Danger Zone</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                Deleting a project is irreversible and cascades to all test cases, plans, runs, and defect links.
                {` Projects must be archived before permanent deletion.`}
              </p>

              {project.isArchived ? (
                <div className="max-w-md space-y-3">
                  <p className="text-xs text-red-800 dark:text-red-300 font-semibold">
                    Type project key <span className="font-mono">{project.key}</span> to confirm permanent deletion:
                  </p>
                  <input
                    type="text"
                    placeholder={project.key}
                    value={deleteConfirmKey}
                    onChange={(e) => setDeleteConfirmKey(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-red-300 dark:border-red-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                  <button
                    disabled={deleteConfirmKey !== project.key || deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-40"
                  >
                    Permanently Delete Project
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => archiveMutation.mutate()}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
                >
                  Archive Project First
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ADD ENVIRONMENT MODAL */}
      {showEnvModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Add Target Environment</h3>
            {envError && <p className="text-sm text-red-600 mb-3">{envError}</p>}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addEnvMutation.mutate({
                  name: envName,
                  type: envType,
                  url: envUrl || undefined,
                  description: envDesc || undefined,
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Environment Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UAT or Staging EU"
                  value={envName}
                  onChange={(e) => setEnvName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Type
                </label>
                <select
                  value={envType}
                  onChange={(e) => setEnvType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="DEVELOPMENT">DEVELOPMENT</option>
                  <option value="TESTING">TESTING</option>
                  <option value="STAGING">STAGING</option>
                  <option value="PRODUCTION">PRODUCTION</option>
                  <option value="CUSTOM">CUSTOM</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Base URL
                </label>
                <input
                  type="url"
                  placeholder="https://staging.app.example.com"
                  value={envUrl}
                  onChange={(e) => setEnvUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEnvModal(false)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addEnvMutation.isPending}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Save Environment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD MEMBER MODAL */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Assign Project Member</h3>
            {memberError && <p className="text-sm text-red-600 mb-3">{memberError}</p>}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addMemberMutation.mutate({
                  userId: memberUserId,
                  role: memberRole,
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  User UUID (Organization Member) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Paste user UUID from Organization Members"
                  value={memberUserId}
                  onChange={(e) => setMemberUserId(e.target.value)}
                  className="w-full px-3 py-2 font-mono border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Role
                </label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as ProjectRole)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value={ProjectRole.PROJECT_LEAD}>PROJECT LEAD</option>
                  <option value={ProjectRole.MEMBER}>MEMBER</option>
                  <option value={ProjectRole.VIEWER}>VIEWER</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMemberMutation.isPending}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Assign to Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
