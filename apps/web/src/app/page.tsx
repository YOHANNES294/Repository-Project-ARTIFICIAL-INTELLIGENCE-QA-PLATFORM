'use client';

import { useQuery } from '@tanstack/react-query';
import { defaultApiClient } from '@ai-qa/api-client';
import { ShieldCheck, Activity, Database, Cpu, Layers, CheckCircle2 } from 'lucide-react';

export default function HomePage() {
  const { data: health, isLoading, isError } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => defaultApiClient.getHealth(),
    refetchInterval: 10000,
    retry: 1,
  });

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">AI QA Platform</h1>
              <p className="text-sm text-slate-500">Enterprise Quality Assurance & Test Management SaaS</p>
            </div>
          </div>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-2">
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Environment:</span>
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
            Development / Phase 1
          </span>
        </div>
      </header>

      {/* Real-time System Status Probe */}
      <section className="mt-8 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" />
          Foundation Architecture & Health Status
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <Database className="h-4 w-4 text-slate-500" /> Database
              </span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                health?.services.database === 'connected' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {isLoading ? 'Checking...' : health?.services.database || 'Offline (Awaiting container)'}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <Cpu className="h-4 w-4 text-slate-500" /> Redis Queue
              </span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                health?.services.redis === 'connected' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {isLoading ? 'Checking...' : health?.services.redis || 'Offline (Awaiting container)'}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <Layers className="h-4 w-4 text-slate-500" /> API Gateway
              </span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                !isError && health?.status ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-800'
              }`}>
                {isLoading ? 'Probing...' : !isError && health ? 'Online' : 'Standby'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Core Platform Modules Map */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Core Platform Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: 'Multi-Tenant Auth', desc: 'Organizations, RBAC, session isolation, member roles', phase: 'Milestone 02' },
            { title: 'Project Management', desc: 'Project keys, environments, members, audit history', phase: 'Milestone 03' },
            { title: 'Test Case Repository', desc: 'Hierarchical suites, versioning, steps, preconditions', phase: 'Milestone 04' },
            { title: 'Execution Engine', desc: 'Test runs, step-level results, durations, attachments', phase: 'Milestone 05' },
            { title: 'Defect Tracking', desc: 'Defect lifecycle, reproduction steps, execution linkage', phase: 'Milestone 06' },
            { title: 'AI Intelligence Engine', desc: 'Test case generation, failure root-cause analysis', phase: 'Milestone 07' },
          ].map((mod, i) => (
            <div key={i} className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{mod.title}</h3>
                  <span className="text-xs font-mono text-slate-400">{mod.phase}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">{mod.desc}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center text-xs text-slate-400">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-blue-500" /> Architecture Schema Ready
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
