'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  PlayCircle,
  ShieldCheck,
  Bug,
  Cpu,
  Target,
  Sparkles,
  FileText,
} from 'lucide-react';

interface AnalyticsNavProps {
  projectId: string;
}

export function AnalyticsNav({ projectId }: AnalyticsNavProps) {
  const pathname = usePathname();

  const tabs = [
    {
      name: 'Executive Dashboard',
      href: `/projects/${projectId}/analytics`,
      icon: BarChart3,
      exact: true,
    },
    {
      name: 'Executions',
      href: `/projects/${projectId}/analytics/executions`,
      icon: PlayCircle,
    },
    {
      name: 'Coverage',
      href: `/projects/${projectId}/analytics/coverage`,
      icon: ShieldCheck,
    },
    {
      name: 'Defects',
      href: `/projects/${projectId}/analytics/defects`,
      icon: Bug,
    },
    {
      name: 'Automation',
      href: `/projects/${projectId}/analytics/automation`,
      icon: Cpu,
    },
    {
      name: 'Milestones & Gates',
      href: `/projects/${projectId}/analytics/milestones`,
      icon: Target,
    },
    {
      name: 'AI Intelligence',
      href: `/projects/${projectId}/analytics/ai`,
      icon: Sparkles,
    },
    {
      name: 'Reports & Exports',
      href: `/projects/${projectId}/analytics/reports`,
      icon: FileText,
    },
  ];

  return (
    <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-t-xl px-4">
      <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto py-2 scrollbar-none" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
