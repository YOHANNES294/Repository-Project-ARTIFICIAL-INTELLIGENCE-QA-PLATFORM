'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import { TestSuiteDto } from '@ai-qa/shared-types';
import {
  FolderTree,
  Folder,
  FolderOpen,
  Plus,
  ChevronRight,
  ChevronDown,
  Edit,
  Trash2,
  CheckSquare,
  FileText,
  Target,
  ArrowRight,
  X,
} from 'lucide-react';

export default function TestSuitesPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const projectId = params.projectId as string;

  // Selected suite in tree
  const [selectedSuite, setSelectedSuite] = useState<TestSuiteDto | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create_root' | 'create_child' | 'edit'>('create_root');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [objectives, setObjectives] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Project Info
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => defaultApiClient.getProject(projectId),
  });

  // Suites Tree Query
  const { data: suites = [], isLoading } = useQuery({
    queryKey: ['test-suites', projectId],
    queryFn: () => defaultApiClient.getTestSuites(projectId),
  });

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name,
        description: description || undefined,
        objectives: objectives || undefined,
        parentId: parentId || undefined,
      };

      if (modalMode === 'edit' && selectedSuite) {
        return defaultApiClient.updateTestSuite(projectId, selectedSuite.id, payload);
      } else {
        return defaultApiClient.createTestSuite(projectId, payload);
      }
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['test-suites', projectId] });
      closeModal();
      if (saved) {
        setSelectedSuite(saved);
        if (saved.parentId) {
          setExpandedNodes((prev) => ({ ...prev, [saved.parentId!]: true }));
        }
      }
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to save test suite');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (suiteId: string) => defaultApiClient.deleteTestSuite(projectId, suiteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-suites', projectId] });
      setSelectedSuite(null);
    },
  });

  const openCreateRoot = () => {
    setModalMode('create_root');
    setName('');
    setDescription('');
    setObjectives('');
    setParentId(null);
    setFormError(null);
    setShowModal(true);
  };

  const openCreateChild = (parent: TestSuiteDto) => {
    setModalMode('create_child');
    setName('');
    setDescription('');
    setObjectives('');
    setParentId(parent.id);
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (suite: TestSuiteDto) => {
    setModalMode('edit');
    setName(suite.name);
    setDescription(suite.description || '');
    setObjectives(suite.objectives || '');
    setParentId(suite.parentId || null);
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormError(null);
  };

  // Recursive Tree Node Renderer
  const renderTreeNode = (suite: TestSuiteDto, depth: number = 0) => {
    const isExpanded = !!expandedNodes[suite.id];
    const isSelected = selectedSuite?.id === suite.id;
    const hasChildren = suite.children && suite.children.length > 0;

    return (
      <div key={suite.id} className="select-none">
        <div
          onClick={() => setSelectedSuite(suite)}
          className={`flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer transition-colors text-sm ${
            isSelected
              ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 font-semibold'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
          style={{ paddingLeft: `${Math.max(12, depth * 20 + 12)}px` }}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {hasChildren ? (
              <button
                onClick={(e) => toggleExpand(suite.id, e)}
                className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400"
              >
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            ) : (
              <span className="w-4.5" />
            )}

            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-blue-600 flex-shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-slate-400 flex-shrink-0" />
            )}

            <span className="truncate">{suite.name}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">
              {suite._count?.testCases || 0} cases
            </span>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-0.5">
            {suite.children!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/projects" className="hover:text-blue-600">Projects</Link>
            <span>/</span>
            <Link href={`/projects/${projectId}`} className="hover:text-blue-600">{project?.name || 'Project'}</Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 font-medium">Test Suites</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <FolderTree className="h-6 w-6 text-blue-600" />
            Hierarchical Test Suites
          </h1>
        </div>

        <button
          onClick={openCreateRoot}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm"
        >
          <Plus className="h-4 w-4" /> New Root Suite
        </button>
      </div>

      {/* Explorer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Folder Hierarchy Tree */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Folder Structure ({suites.length} Root Suites)
            </span>
            <button
              onClick={openCreateRoot}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Add Suite
            </button>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-slate-400 text-sm">Loading suites hierarchy...</div>
          ) : suites.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <Folder className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">No test suites created yet.</p>
              <button
                onClick={openCreateRoot}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Create your first test suite
              </button>
            </div>
          ) : (
            <div className="space-y-0.5 overflow-y-auto max-h-[600px]">
              {suites.map((s) => renderTreeNode(s, 0))}
            </div>
          )}
        </div>

        {/* Right: Selected Suite Details */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          {selectedSuite ? (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <Folder className="h-3.5 w-3.5 text-blue-600" />
                    <span>Test Suite Details</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedSuite.name}</h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openCreateChild(selectedSuite)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium flex items-center gap-1 text-slate-700 dark:text-slate-300"
                  >
                    <Plus className="h-3.5 w-3.5" /> Sub-folder
                  </button>
                  <button
                    onClick={() => openEdit(selectedSuite)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium flex items-center gap-1 text-slate-700 dark:text-slate-300"
                  >
                    <Edit className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete test suite "${selectedSuite.name}"? Test cases will become unassigned.`)) {
                        deleteMutation.mutate(selectedSuite.id);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-medium flex items-center gap-1 text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>

              {selectedSuite.description && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase text-slate-400">Description</span>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{selectedSuite.description}</p>
                </div>
              )}

              {selectedSuite.objectives && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase text-slate-400">Objectives & Coverage Goals</span>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{selectedSuite.objectives}</p>
                </div>
              )}

              {/* Metrics Card */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    <CheckSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white">
                      {selectedSuite._count?.testCases || 0}
                    </div>
                    <div className="text-xs text-slate-500">Test Cases Inside</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                    <FolderTree className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white">
                      {selectedSuite.children?.length || 0}
                    </div>
                    <div className="text-xs text-slate-500">Nested Sub-Suites</div>
                  </div>
                </div>
              </div>

              {/* Link to view cases inside this suite */}
              <div className="pt-2">
                <Link
                  href={`/projects/${projectId}/test-cases?suiteId=${selectedSuite.id}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                >
                  <CheckSquare className="h-4 w-4" />
                  View All Test Cases in &quot;{selectedSuite.name}&quot;
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center space-y-3">
              <FolderOpen className="h-12 w-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">No Suite Selected</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Select a test suite folder on the left to inspect its details, add subfolders, or manage test cases.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {modalMode === 'edit'
                  ? 'Edit Test Suite'
                  : modalMode === 'create_child'
                  ? `New Sub-suite under "${selectedSuite?.name}"`
                  : 'New Root Test Suite'}
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
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Suite Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Authentication & Authorization"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Overview of scenarios covered in this suite..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Objectives</label>
                <textarea
                  rows={2}
                  placeholder="Exit benchmarks, verification scope..."
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none"
                />
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
                {saveMutation.isPending ? 'Saving...' : modalMode === 'edit' ? 'Save Changes' : 'Create Suite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
