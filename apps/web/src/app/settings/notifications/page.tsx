'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  Mail,
  ShieldAlert,
  Moon,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Save,
  ArrowLeft,
  Calendar,
  Layers,
} from 'lucide-react';
import { defaultApiClient } from '@ai-qa/api-client';
import { NotificationPreferenceDto, DigestFrequency } from '@ai-qa/shared-types';

export default function NotificationSettingsPage() {
  const [pref, setPref] = useState<NotificationPreferenceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state
  const [inAppAlerts, setInAppAlerts] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [defectUpdates, setDefectUpdates] = useState(true);
  const [testAssignment, setTestAssignment] = useState(true);
  const [executionAlerts, setExecutionAlerts] = useState(true);
  const [automationAlerts, setAutomationAlerts] = useState(true);
  const [aiAlerts, setAiAlerts] = useState(true);
  const [reportingAlerts, setReportingAlerts] = useState(true);
  const [mentionAlerts, setMentionAlerts] = useState(true);
  const [digestFrequency, setDigestFrequency] = useState<DigestFrequency | string>('NONE');
  const [digestTimezone, setDigestTimezone] = useState('UTC');
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00');

  useEffect(() => {
    async function load() {
      try {
        const data = await defaultApiClient.getNotificationPreferences();
        setPref(data);
        setInAppAlerts(data.inAppAlerts);
        setEmailAlerts(data.emailAlerts);
        setDefectUpdates(data.defectUpdates);
        setTestAssignment(data.testAssignment);
        setExecutionAlerts(data.executionAlerts);
        setAutomationAlerts(data.automationAlerts);
        setAiAlerts(data.aiAlerts);
        setReportingAlerts(data.reportingAlerts);
        setMentionAlerts(data.mentionAlerts);
        setDigestFrequency(data.digestFrequency || 'NONE');
        setDigestTimezone(data.digestTimezone || 'UTC');
        setQuietHoursEnabled(data.quietHoursEnabled);
        setQuietHoursStart(data.quietHoursStart || '22:00');
        setQuietHoursEnd(data.quietHoursEnd || '08:00');
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to load preferences');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const updated = await defaultApiClient.updateNotificationPreferences({
        inAppAlerts,
        emailAlerts,
        defectUpdates,
        testAssignment,
        executionAlerts,
        automationAlerts,
        aiAlerts,
        reportingAlerts,
        mentionAlerts,
        weeklyDigest: digestFrequency === 'WEEKLY',
        digestFrequency,
        digestTimezone,
        quietHoursEnabled,
        quietHoursStart: quietHoursEnabled ? quietHoursStart : null,
        quietHoursEnd: quietHoursEnabled ? quietHoursEnd : null,
      });

      setPref(updated);
      setSuccessMessage('Notification preferences successfully saved.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all notification preferences to defaults?')) {
      return;
    }
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const reset = await defaultApiClient.resetNotificationPreferences();
      setPref(reset);
      setInAppAlerts(reset.inAppAlerts);
      setEmailAlerts(reset.emailAlerts);
      setDefectUpdates(reset.defectUpdates);
      setTestAssignment(reset.testAssignment);
      setExecutionAlerts(reset.executionAlerts);
      setAutomationAlerts(reset.automationAlerts);
      setAiAlerts(reset.aiAlerts);
      setReportingAlerts(reset.reportingAlerts);
      setMentionAlerts(reset.mentionAlerts);
      setDigestFrequency(reset.digestFrequency || 'NONE');
      setDigestTimezone(reset.digestTimezone || 'UTC');
      setQuietHoursEnabled(reset.quietHoursEnabled);
      setQuietHoursStart('22:00');
      setQuietHoursEnd('08:00');
      setSuccessMessage('Preferences reset to default configuration.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8 flex items-center justify-center">
        <div className="text-sm text-slate-500">Loading preferences...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Link & Header */}
        <div className="space-y-2">
          <Link
            href="/notifications"
            className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            <span>Back to Notifications</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Bell className="h-6 w-6 text-blue-600" />
                <span>Notification Preferences</span>
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Customize delivery channels, categories, quiet hours schedules, and executive digests
              </p>
            </div>
            <button
              onClick={handleReset}
              disabled={saving}
              className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>

        {/* Feedback Banners */}
        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center space-x-3 text-emerald-800 dark:text-emerald-300 text-sm">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 flex items-center space-x-3 text-red-800 dark:text-red-300 text-sm">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Security Advisory Card */}
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 flex items-start space-x-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-300">
            <span className="font-semibold block text-sm mb-0.5">Mandatory Security Notifications</span>
            Critical security alerts (password resets, invitation acceptances, security anomalies) will always be delivered immediately and bypass quiet hours and custom category suppressions.
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Master Delivery Channels */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
              <Layers className="h-5 w-5 text-blue-600" />
              <span>Delivery Channels</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-start space-x-3 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={inAppAlerts}
                  onChange={(e) => setInAppAlerts(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white block">In-App Notifications</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Live notifications in the top bar bell dropdown and notification center.
                  </span>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white block">Email Notifications</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Formatted email alerts dispatched for assigned defects, completions, and alerts.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Section 2: Category Matrix */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
              <Bell className="h-5 w-5 text-purple-600" />
              <span>Event Categories</span>
            </h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {[
                {
                  id: 'defect',
                  title: 'Defect & Bug Tracking',
                  desc: 'Notifications when defects are assigned to you, status changes, or comments are added.',
                  checked: defectUpdates,
                  setter: setDefectUpdates,
                },
                {
                  id: 'assignment',
                  title: 'Test Assignments',
                  desc: 'Alerts when test runs, test suites, or execution tasks are assigned to your user.',
                  checked: testAssignment,
                  setter: setTestAssignment,
                },
                {
                  id: 'execution',
                  title: 'Test Run Executions',
                  desc: 'Summaries when test runs and execution batches finish.',
                  checked: executionAlerts,
                  setter: setExecutionAlerts,
                },
                {
                  id: 'automation',
                  title: 'Automation & CI/CD Pipelines',
                  desc: 'Alerts for Playwright/Postman test ingestion and webhook execution events.',
                  checked: automationAlerts,
                  setter: setAutomationAlerts,
                },
                {
                  id: 'ai',
                  title: 'AI Intelligence Engine',
                  desc: 'Results when AI root cause analysis, duplicate detection, or test generation completes.',
                  checked: aiAlerts,
                  setter: setAiAlerts,
                },
                {
                  id: 'reporting',
                  title: 'Quality Gates & Scheduled Reports',
                  desc: 'Alerts when quality gates evaluate to failed or scheduled report exports complete.',
                  checked: reportingAlerts,
                  setter: setReportingAlerts,
                },
                {
                  id: 'mention',
                  title: 'Team Mentions & Comments',
                  desc: 'Notifications when someone mentions you or replies to your comments.',
                  checked: mentionAlerts,
                  setter: setMentionAlerts,
                },
              ].map((item) => (
                <div key={item.id} className="py-3 flex items-start justify-between">
                  <div className="pr-4">
                    <span className="text-sm font-medium text-slate-900 dark:text-white block">
                      {item.title}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {item.desc}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => item.setter(e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Scheduled Digest */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-emerald-600" />
              <span>Executive Quality Digest</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Digest Frequency
                </label>
                <select
                  value={digestFrequency}
                  onChange={(e) => setDigestFrequency(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="NONE">No digest</option>
                  <option value="DAILY">Daily quality summary</option>
                  <option value="WEEKLY">Weekly executive digest</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Timezone
                </label>
                <select
                  value={digestTimezone}
                  onChange={(e) => setDigestTimezone(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="UTC">UTC (Universal Coordinated Time)</option>
                  <option value="America/New_York">America/New_York (EST / EDT)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST / PDT)</option>
                  <option value="Europe/London">Europe/London (GMT / BST)</option>
                  <option value="Europe/Berlin">Europe/Berlin (CET / CEST)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Quiet Hours */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                <Moon className="h-5 w-5 text-indigo-600" />
                <span>Quiet Hours Schedule</span>
              </h2>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={quietHoursEnabled}
                  onChange={(e) => setQuietHoursEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600" />
              </label>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Suppresses non-urgent email alerts during your selected time window in your timezone.
            </p>

            {quietHoursEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Start Time
                  </label>
                  <div className="relative">
                    <Clock className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="22:00"
                      value={quietHoursStart}
                      onChange={(e) => setQuietHoursStart(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">24-hour format (e.g. 22:00)</span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    End Time
                  </label>
                  <div className="relative">
                    <Clock className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="08:00"
                      value={quietHoursEnd}
                      onChange={(e) => setQuietHoursEnd(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">24-hour format (e.g. 08:00)</span>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              <span>{saving ? 'Saving...' : 'Save Notification Preferences'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
