'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  FolderGit2,
  Users,
  FileCheck2,
  PlayCircle,
  Cpu,
  Bot,
  HardDrive,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { defaultApiClient } from '@ai-qa/api-client';
import { SubscriptionDto, UsageSummaryDto } from '@ai-qa/shared-types';

export default function BillingOverviewPage() {
  const [subscription, setSubscription] = useState<SubscriptionDto | null>(null);
  const [usage, setUsage] = useState<UsageSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelImmediate, setCancelImmediate] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [reactivating, setReactivating] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [subData, usageData] = await Promise.all([
        defaultApiClient.getSubscription(),
        defaultApiClient.getUsageSummary(),
      ]);
      setSubscription(subData);
      setUsage(usageData);
    } catch (err: any) {
      setError(err.message || 'Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCancelSubscription = async () => {
    try {
      setCancelling(true);
      await defaultApiClient.cancelSubscription({
        immediately: cancelImmediate,
        reason: cancelReason || undefined,
      });
      setShowCancelModal(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  const handleReactivateSubscription = async () => {
    try {
      setReactivating(true);
      await defaultApiClient.reactivateSubscription();
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to reactivate subscription');
    } finally {
      setReactivating(false);
    }
  };

  const formatStorage = (bytes: number): string => {
    if (bytes >= 1073741824) {
      return `${(bytes / 1073741824).toFixed(1)} GB`;
    }
    return `${(bytes / 1048576).toFixed(0)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-sm text-slate-500 font-medium">Loading subscription and quota metrics...</p>
        </div>
      </div>
    );
  }

  if (error || !subscription || !usage) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center space-y-4 max-w-2xl mx-auto my-8">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
        <h3 className="text-base font-semibold text-red-800">Billing Information Unavailable</h3>
        <p className="text-sm text-red-600">{error || 'Unable to retrieve subscription context.'}</p>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  const plan = subscription.plan;
  const isCancelled = subscription.status === 'CANCELLED';
  const isScheduledCancel = subscription.cancelAtPeriodEnd;
  const isTestMode = subscription.paymentProvider === 'LOCAL_TEST';

  return (
    <div className="space-y-8">
      {/* Test Mode Notification Banner */}
      {isTestMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between text-amber-800">
          <div className="flex items-center gap-3">
            <span className="p-1.5 bg-amber-100 rounded-md text-amber-700">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <div>
              <h4 className="text-sm font-semibold">Test Mode Active (Simulated Provider)</h4>
              <p className="text-xs text-amber-700">
                All subscriptions, checkouts, and invoices are executed in simulated development mode. Real cards are not charged.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono bg-amber-200/80 px-2.5 py-1 rounded font-semibold text-amber-900 uppercase">
            LOCAL_TEST
          </span>
        </div>
      )}

      {/* Subscription Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-slate-100 bg-gradient-to-r from-white via-indigo-50/20 to-white">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {plan?.name || 'Current'} Plan
              </span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  subscription.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : subscription.status === 'TRIALING'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                {subscription.status}
              </span>
              {isScheduledCancel && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                  <Clock className="w-3.5 h-3.5" /> Cancels at period end
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 max-w-xl">
              {plan?.description || 'AI-Powered Quality Assurance platform subscription.'}
            </p>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-500 pt-1">
              <span>Billing Interval: <strong className="text-slate-700">{subscription.billingInterval}</strong></span>
              <span>•</span>
              <span>
                Current Period Ends:{' '}
                <strong className="text-slate-700">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-3">
            {isScheduledCancel ? (
              <button
                onClick={handleReactivateSubscription}
                disabled={reactivating}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {reactivating ? 'Reactivating...' : 'Keep Subscription'}
              </button>
            ) : (
              <Link
                href="/settings/billing/plans"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition"
              >
                <Sparkles className="w-4 h-4" />
                Change / Upgrade Plan
              </Link>
            )}

            {!isCancelled && !isScheduledCancel && plan?.tier !== 'FREE' && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition"
              >
                Cancel Subscription
              </button>
            )}
          </div>
        </div>

        {/* Features Checklist */}
        <div className="p-6 bg-slate-50/50 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`w-4 h-4 ${plan?.allowCustomReports ? 'text-indigo-600' : 'text-slate-300'}`} />
            <span className={plan?.allowCustomReports ? 'text-slate-700 font-medium' : 'text-slate-400 line-through'}>
              Custom Reports
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`w-4 h-4 ${plan?.allowIntegrations ? 'text-indigo-600' : 'text-slate-300'}`} />
            <span className={plan?.allowIntegrations ? 'text-slate-700 font-medium' : 'text-slate-400 line-through'}>
              Slack & Teams
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`w-4 h-4 ${plan?.allowAdvancedAnalytics ? 'text-indigo-600' : 'text-slate-300'}`} />
            <span className={plan?.allowAdvancedAnalytics ? 'text-slate-700 font-medium' : 'text-slate-400 line-through'}>
              Advanced Analytics
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`w-4 h-4 ${plan?.allowAuditExport ? 'text-indigo-600' : 'text-slate-300'}`} />
            <span className={plan?.allowAuditExport ? 'text-slate-700 font-medium' : 'text-slate-400 line-through'}>
              Audit Log Exports
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`w-4 h-4 ${plan?.allowSso ? 'text-indigo-600' : 'text-slate-300'}`} />
            <span className={plan?.allowSso ? 'text-slate-700 font-medium' : 'text-slate-400 line-through'}>
              Enterprise SSO
            </span>
          </div>
        </div>
      </div>

      {/* Resource Quotas & Usage Meters */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Current Resource Consumption</h2>
            <p className="text-xs text-slate-500">Live meters against your plan allowance for this billing cycle</p>
          </div>
          <Link
            href="/settings/billing/usage"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            Detailed Analytics <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Projects Meter */}
          {usage.meters.PROJECTS && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <FolderGit2 className="w-4 h-4 text-indigo-500" /> Projects
                </span>
                <span className="text-xs font-mono font-bold text-slate-600">
                  {usage.meters.PROJECTS.current} / {usage.meters.PROJECTS.limit === -1 ? '∞' : usage.meters.PROJECTS.limit}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    usage.meters.PROJECTS.isExceeded
                      ? 'bg-rose-500'
                      : usage.meters.PROJECTS.usagePercentage > 80
                      ? 'bg-amber-500'
                      : 'bg-indigo-600'
                  }`}
                  style={{ width: `${Math.min(100, usage.meters.PROJECTS.usagePercentage)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>{usage.meters.PROJECTS.limit === -1 ? 'Unlimited' : `${usage.meters.PROJECTS.usagePercentage}% used`}</span>
                {usage.meters.PROJECTS.isExceeded && <span className="text-rose-600 font-semibold">Limit Reached</span>}
              </div>
            </div>
          )}

          {/* Members Meter */}
          {usage.meters.MEMBERS && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Users className="w-4 h-4 text-indigo-500" /> Team Members
                </span>
                <span className="text-xs font-mono font-bold text-slate-600">
                  {usage.meters.MEMBERS.current} / {usage.meters.MEMBERS.limit === -1 ? '∞' : usage.meters.MEMBERS.limit}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    usage.meters.MEMBERS.isExceeded
                      ? 'bg-rose-500'
                      : usage.meters.MEMBERS.usagePercentage > 80
                      ? 'bg-amber-500'
                      : 'bg-indigo-600'
                  }`}
                  style={{ width: `${Math.min(100, usage.meters.MEMBERS.usagePercentage)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>{usage.meters.MEMBERS.limit === -1 ? 'Unlimited' : `${usage.meters.MEMBERS.usagePercentage}% used`}</span>
                {usage.meters.MEMBERS.isExceeded && <span className="text-rose-600 font-semibold">Limit Reached</span>}
              </div>
            </div>
          )}

          {/* Test Cases Meter */}
          {usage.meters.TEST_CASES && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <FileCheck2 className="w-4 h-4 text-indigo-500" /> Test Cases
                </span>
                <span className="text-xs font-mono font-bold text-slate-600">
                  {usage.meters.TEST_CASES.current} / {usage.meters.TEST_CASES.limit === -1 ? '∞' : usage.meters.TEST_CASES.limit}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    usage.meters.TEST_CASES.isExceeded
                      ? 'bg-rose-500'
                      : usage.meters.TEST_CASES.usagePercentage > 80
                      ? 'bg-amber-500'
                      : 'bg-indigo-600'
                  }`}
                  style={{ width: `${Math.min(100, usage.meters.TEST_CASES.usagePercentage)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>{usage.meters.TEST_CASES.limit === -1 ? 'Unlimited' : `${usage.meters.TEST_CASES.usagePercentage}% used`}</span>
                {usage.meters.TEST_CASES.isExceeded && <span className="text-rose-600 font-semibold">Limit Reached</span>}
              </div>
            </div>
          )}

          {/* Test Runs Monthly */}
          {usage.meters.TEST_RUNS_MONTHLY && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <PlayCircle className="w-4 h-4 text-indigo-500" /> Monthly Test Runs
                </span>
                <span className="text-xs font-mono font-bold text-slate-600">
                  {usage.meters.TEST_RUNS_MONTHLY.current} / {usage.meters.TEST_RUNS_MONTHLY.limit === -1 ? '∞' : usage.meters.TEST_RUNS_MONTHLY.limit}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    usage.meters.TEST_RUNS_MONTHLY.isExceeded
                      ? 'bg-rose-500'
                      : usage.meters.TEST_RUNS_MONTHLY.usagePercentage > 80
                      ? 'bg-amber-500'
                      : 'bg-indigo-600'
                  }`}
                  style={{ width: `${Math.min(100, usage.meters.TEST_RUNS_MONTHLY.usagePercentage)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>{usage.meters.TEST_RUNS_MONTHLY.limit === -1 ? 'Unlimited' : `${usage.meters.TEST_RUNS_MONTHLY.usagePercentage}% used`}</span>
                {usage.meters.TEST_RUNS_MONTHLY.isExceeded && <span className="text-rose-600 font-semibold">Quota Exhausted</span>}
              </div>
            </div>
          )}

          {/* Automation Runs Monthly */}
          {usage.meters.AUTOMATION_RUNS_MONTHLY && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Cpu className="w-4 h-4 text-indigo-500" /> Automation Runs
                </span>
                <span className="text-xs font-mono font-bold text-slate-600">
                  {usage.meters.AUTOMATION_RUNS_MONTHLY.current} / {usage.meters.AUTOMATION_RUNS_MONTHLY.limit === -1 ? '∞' : usage.meters.AUTOMATION_RUNS_MONTHLY.limit}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    usage.meters.AUTOMATION_RUNS_MONTHLY.isExceeded
                      ? 'bg-rose-500'
                      : usage.meters.AUTOMATION_RUNS_MONTHLY.usagePercentage > 80
                      ? 'bg-amber-500'
                      : 'bg-indigo-600'
                  }`}
                  style={{ width: `${Math.min(100, usage.meters.AUTOMATION_RUNS_MONTHLY.usagePercentage)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>{usage.meters.AUTOMATION_RUNS_MONTHLY.limit === -1 ? 'Unlimited' : `${usage.meters.AUTOMATION_RUNS_MONTHLY.usagePercentage}% used`}</span>
                {usage.meters.AUTOMATION_RUNS_MONTHLY.isExceeded && <span className="text-rose-600 font-semibold">Quota Exhausted</span>}
              </div>
            </div>
          )}

          {/* AI Tokens Allowance */}
          {usage.meters.AI_TOKENS_MONTHLY && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Bot className="w-4 h-4 text-indigo-500" /> AI Tokens (Monthly)
                </span>
                <span className="text-xs font-mono font-bold text-slate-600">
                  {usage.meters.AI_TOKENS_MONTHLY.current.toLocaleString()} / {usage.meters.AI_TOKENS_MONTHLY.limit === -1 ? '∞' : usage.meters.AI_TOKENS_MONTHLY.limit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    usage.meters.AI_TOKENS_MONTHLY.isExceeded
                      ? 'bg-rose-500'
                      : usage.meters.AI_TOKENS_MONTHLY.usagePercentage > 80
                      ? 'bg-amber-500'
                      : 'bg-indigo-600'
                  }`}
                  style={{ width: `${Math.min(100, usage.meters.AI_TOKENS_MONTHLY.usagePercentage)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>{usage.meters.AI_TOKENS_MONTHLY.limit === -1 ? 'Unlimited' : `${usage.meters.AI_TOKENS_MONTHLY.usagePercentage}% used`}</span>
                {usage.meters.AI_TOKENS_MONTHLY.isExceeded && <span className="text-rose-600 font-semibold">Allowance Depleted</span>}
              </div>
            </div>
          )}

          {/* Storage Bytes */}
          {usage.meters.STORAGE_BYTES && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 md:col-span-2 lg:col-span-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <HardDrive className="w-4 h-4 text-indigo-500" /> File & Artifact Storage
                </span>
                <span className="text-xs font-mono font-bold text-slate-600">
                  {formatStorage(usage.meters.STORAGE_BYTES.current)} / {usage.meters.STORAGE_BYTES.limit === -1 ? 'Unlimited' : formatStorage(usage.meters.STORAGE_BYTES.limit)}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    usage.meters.STORAGE_BYTES.isExceeded
                      ? 'bg-rose-500'
                      : usage.meters.STORAGE_BYTES.usagePercentage > 80
                      ? 'bg-amber-500'
                      : 'bg-indigo-600'
                  }`}
                  style={{ width: `${Math.min(100, usage.meters.STORAGE_BYTES.usagePercentage)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Storage includes defect evidence, attachments, and export snapshot binaries.</span>
                <span>{usage.meters.STORAGE_BYTES.usagePercentage}% utilized</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Cancel Subscription
              </h3>
              <button
                onClick={() => setShowCancelModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600">
              We are sorry to see you go. Your existing data, projects, and test cases will remain safe and accessible.
            </p>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-700 block">Cancellation Timing</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 transition">
                  <input
                    type="radio"
                    name="timing"
                    checked={!cancelImmediate}
                    onChange={() => setCancelImmediate(false)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-800 block">At end of current billing period (Recommended)</span>
                    <span className="text-slate-500">
                      Retain full access until {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
                    </span>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 transition">
                  <input
                    type="radio"
                    name="timing"
                    checked={cancelImmediate}
                    onChange={() => setCancelImmediate(true)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-800 block">Immediately</span>
                    <span className="text-slate-500">Downgrades immediately to Free tier quotas.</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Reason for cancellation (optional)</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Help us improve: what could we have done better?"
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none h-20"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Keep Subscription
              </button>
              <button
                type="button"
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {cancelling ? 'Processing...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
