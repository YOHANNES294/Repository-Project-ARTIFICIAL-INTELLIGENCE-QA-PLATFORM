'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  RefreshCw,
  Info,
  Calendar,
  FolderGit2,
  Users,
  FileCheck2,
  PlayCircle,
  Cpu,
  Bot,
  HardDrive,
  ShieldAlert,
} from 'lucide-react';
import { defaultApiClient } from '@ai-qa/api-client';
import { UsageSummaryDto } from '@ai-qa/shared-types';

export default function UsageAnalyticsPage() {
  const [usage, setUsage] = useState<UsageSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await defaultApiClient.getUsageSummary();
      setUsage(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load usage summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  const formatStorage = (bytes: number): string => {
    if (bytes >= 1073741824) {
      return `${(bytes / 1073741824).toFixed(2)} GB`;
    }
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-sm text-slate-500 font-medium">Aggregating immutable usage ledger data...</p>
        </div>
      </div>
    );
  }

  if (error || !usage) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl text-center space-y-3">
        <p className="text-sm">{error || 'Could not load usage data'}</p>
        <button
          onClick={fetchUsage}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Resource Consumption & Ledger Telemetry</h2>
          <p className="text-xs text-slate-500">
            Current billing cycle:{' '}
            <strong className="text-slate-700">
              {new Date(usage.billingPeriodStart).toLocaleDateString()}
            </strong>{' '}
            –{' '}
            <strong className="text-slate-700">
              {new Date(usage.billingPeriodEnd).toLocaleDateString()}
            </strong>
          </p>
        </div>
        <button
          onClick={fetchUsage}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Re-sync Ledger
        </button>
      </div>

      {/* Quota Rules Explanation Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-blue-900 text-xs">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-semibold">How quotas are metered and enforced:</h4>
          <p className="text-blue-700">
            • <strong>Continuous Resources</strong> (Projects, Members, Test Cases, Storage): Monitored on live active counts. Downgrades will never delete existing tenant assets, but prevent creation of new items exceeding quota.
          </p>
          <p className="text-blue-700">
            • <strong>Monthly Allowances</strong> (Test Runs, Automation Executions, AI Tokens): Metered idempotently in an immutable ledger and reset at the conclusion of each billing period.
          </p>
        </div>
      </div>

      {/* Detailed Meter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(usage.meters).map(([key, meter]) => {
          const isUnlimited = meter.limit === -1;
          const isWarning = meter.usagePercentage > 80 && !meter.isExceeded;

          return (
            <div
              key={key}
              className={`bg-white rounded-xl border p-6 shadow-sm space-y-4 ${
                meter.isExceeded
                  ? 'border-rose-300 ring-1 ring-rose-300'
                  : isWarning
                  ? 'border-amber-300'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{meter.metric}</h3>
                  <span className="text-[11px] text-slate-400 capitalize">{meter.unit}</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-slate-900 font-mono">
                    {key === 'STORAGE_BYTES'
                      ? formatStorage(meter.current)
                      : meter.current.toLocaleString()}{' '}
                    <span className="text-xs text-slate-400 font-normal">
                      / {isUnlimited ? '∞' : key === 'STORAGE_BYTES' ? formatStorage(meter.limit) : meter.limit.toLocaleString()}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      meter.isExceeded
                        ? 'text-rose-600'
                        : isWarning
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    {isUnlimited ? 'Unlimited Plan' : `${meter.usagePercentage}% consumed`}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    meter.isExceeded
                      ? 'bg-rose-500'
                      : isWarning
                      ? 'bg-amber-500'
                      : 'bg-indigo-600'
                  }`}
                  style={{ width: `${isUnlimited ? 0 : Math.min(100, meter.usagePercentage)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                <span>
                  {meter.isExceeded ? (
                    <strong className="text-rose-600 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" /> Action Required: Quota Exceeded
                    </strong>
                  ) : (
                    <span>Normal consumption rate</span>
                  )}
                </span>
                <span className="text-slate-400">
                  {isUnlimited ? 'No hard limit' : `${Math.max(0, meter.limit - meter.current)} remaining`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
