'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import Link from 'next/link';
import {
  FileText,
  ArrowLeft,
  Calendar,
  Save,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Bug,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

export default function NewReportDefinitionPage() {
  const params = useParams();
  const projectId = (params?.projectId as string) || '';
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [reportType, setReportType] = useState<any>('EXECUTIVE_SUMMARY');
  const [metrics, setMetrics] = useState<string[]>([
    'passRate',
    'coverage',
    'openDefects',
    'resolutionRate',
  ]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [enableSchedule, setEnableSchedule] = useState(false);
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [recipients, setRecipients] = useState('');

  const toggleMetric = (key: string) => {
    if (metrics.includes(key)) {
      setMetrics(metrics.filter((m) => m !== key));
    } else {
      setMetrics([...metrics, key]);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const filters: Record<string, unknown> = {};
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const report = await defaultApiClient.createReportDefinition(projectId, {
        name,
        description,
        type: reportType,
        metrics,
        filters,
      });

      if (enableSchedule && report.id) {
        const emailList = recipients
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean);
        await defaultApiClient.createReportSchedule(projectId, {
          reportDefId: report.id,
          name: `${name} Schedule`,
          frequency,
          recipients: emailList,
        });
      }

      return report;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-definitions', projectId] });
      queryClient.invalidateQueries({ queryKey: ['report-schedules', projectId] });
      router.push(`/projects/${projectId}/analytics/reports`);
    },
  });

  const availableMetrics = [
    { key: 'passRate', label: 'Overall Pass Rate %', icon: CheckCircle2 },
    { key: 'failRate', label: 'Failure Rate %', icon: CheckCircle2 },
    { key: 'coverage', label: 'Execution & Spec Coverage %', icon: ShieldCheck },
    { key: 'openDefects', label: 'Open Defects Count & Severity', icon: Bug },
    { key: 'resolutionRate', label: 'Defect Resolution Rate & MTTR', icon: Clock },
    { key: 'flakiness', label: 'Flaky Tests & Flip Scores', icon: Layers },
    { key: 'automationPassRate', label: 'Automated Test Pass Rate', icon: Cpu },
    { key: 'aiTokensAndCost', label: 'AI Token Usage & Cost ($)', icon: Sparkles },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/projects/${projectId}/analytics/reports`}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Reports Hub
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Create Custom Report Definition
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Build a tailored QA scorecard with specific aggregations, filters, and automated recurrence.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-6"
        >
          {/* Basic Details */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Report Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Sprint 44 Executive Quality Summary"
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Detailed objectives, intended audience, or sign-off criteria..."
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Report Archetype *
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
              >
                <option value="EXECUTIVE_SUMMARY">Executive Summary (High-Level KPIs & Health)</option>
                <option value="TEST_EXECUTION">Test Execution Report (Runs, Outcomes, Flakiness)</option>
                <option value="DEFECT_SUMMARY">Defect & Bug Report (Aging, Traceability, MTTR)</option>
                <option value="COVERAGE_MATRIX">Coverage Matrix (Suites, Requirements, Milestones)</option>
                <option value="AUTOMATION_METRICS">Automation CI/CD Report (Playwright, Newman)</option>
                <option value="QUALITY_GATE_AUDIT">Quality Gate Compliance Audit (Governance Rules)</option>
                <option value="AI_USAGE">AI Intelligence Usage & Cost Telemetry</option>
              </select>
            </div>
          </div>

          {/* Metrics Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Include Specific Key Metrics
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableMetrics.map((m) => {
                const Icon = m.icon;
                const isSelected = metrics.includes(m.key);
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => toggleMetric(m.key)}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className={`p-1.5 rounded-md ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-700'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Window Filters */}
          <div className="p-4 bg-slate-50 dark:bg-slate-700/40 rounded-xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Default Date Filters (Optional)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-xs"
                />
              </div>
            </div>
          </div>

          {/* Schedule Configuration */}
          <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Automate with Recurring Schedule
                </h4>
                <p className="text-xs text-slate-500">
                  Automatically freeze historical snapshots at regular cadences
                </p>
              </div>
              <input
                type="checkbox"
                checked={enableSchedule}
                onChange={(e) => setEnableSchedule(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </div>

            {enableSchedule && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Recurrence Cadence
                  </label>
                  <select
                    value={frequency}
                    onChange={(e: any) => setFrequency(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-xs"
                  >
                    <option value="DAILY">Daily at midnight</option>
                    <option value="WEEKLY">Weekly on Mondays</option>
                    <option value="MONTHLY">Monthly on the 1st</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Notification Recipients
                  </label>
                  <input
                    type="text"
                    value={recipients}
                    onChange={(e) => setRecipients(e.target.value)}
                    placeholder="qa@example.com, leads@example.com"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Link
              href={`/projects/${projectId}/analytics/reports`}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createMutation.isPending || !name}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {createMutation.isPending ? 'Saving...' : 'Save Report Definition'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
