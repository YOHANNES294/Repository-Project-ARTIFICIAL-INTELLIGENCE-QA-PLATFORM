'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Database,
  Server,
  RefreshCw,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
} from 'lucide-react';
import { defaultApiClient } from '@ai-qa/api-client';

export default function PlatformSystemHealthPage() {
  const [health, setHealth] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await defaultApiClient.getPlatformSystemHealth();
      setHealth(data);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve system health metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  };

  const formatMB = (bytes: number): string => {
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
          <p className="text-sm text-slate-400 font-medium">Checking platform system telemetry...</p>
        </div>
      </div>
    );
  }

  if (error || !health) {
    return (
      <div className="bg-red-950/40 border border-red-800 text-red-300 p-8 rounded-2xl text-center space-y-4 max-w-xl mx-auto my-12">
        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
        <h3 className="text-lg font-bold">Telemetry Unavailable</h3>
        <p className="text-xs text-red-300/80">{error || 'Could not connect to health monitoring endpoint.'}</p>
        <button
          onClick={fetchHealth}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  const isHealthy = health.status === 'HEALTHY';

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Infrastructure & Cluster Telemetry
          </h2>
          <p className="text-xs text-slate-400">
            Real-time process status, database connectivity, and resource allocation
          </p>
        </div>
        <button
          onClick={fetchHealth}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Re-probe Services
        </button>
      </div>

      {/* Main Status Banner */}
      <div
        className={`p-6 rounded-2xl border flex items-center justify-between ${
          isHealthy
            ? 'bg-emerald-950/20 border-emerald-800/80 text-emerald-300'
            : 'bg-rose-950/20 border-rose-800/80 text-rose-300'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className={`p-2.5 rounded-xl ${isHealthy ? 'bg-emerald-900/50' : 'bg-rose-900/50'}`}>
            {isHealthy ? <CheckCircle2 className="w-7 h-7 text-emerald-400" /> : <AlertTriangle className="w-7 h-7 text-rose-400" />}
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight text-white">
              System Status: {health.status}
            </h3>
            <p className="text-xs opacity-80 mt-0.5">
              Probe timestamp: {new Date(health.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
            isHealthy
              ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
              : 'bg-rose-950 text-rose-400 border-rose-700'
          }`}
        >
          {isHealthy ? 'ALL SYSTEMS OPERATIONAL' : 'DEGRADED PERFORMANCE'}
        </span>
      </div>

      {/* Diagnostic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Database Status */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">PostgreSQL Database</span>
            <Database className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            {health.database?.status?.toUpperCase() || 'OK'}
          </div>
          <p className="text-xs text-slate-400 pt-2 border-t border-slate-700/60">
            Query ping: SELECT 1 succeeded via Prisma connection pool
          </p>
        </div>

        {/* Process Uptime */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Process Uptime</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {formatUptime(health.uptimeSeconds || 0)}
          </div>
          <p className="text-xs text-slate-400 pt-2 border-t border-slate-700/60">
            Node environment: {health.nodeVersion || process.version}
          </p>
        </div>

        {/* Memory Footprint */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Memory Footprint</span>
            <Cpu className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {health.memory ? formatMB(health.memory.heapUsed) : 'N/A'}
          </div>
          <p className="text-xs text-slate-400 pt-2 border-t border-slate-700/60">
            Heap Total: {health.memory ? formatMB(health.memory.heapTotal) : 'N/A'} • RSS: {health.memory ? formatMB(health.memory.rss) : 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
}
