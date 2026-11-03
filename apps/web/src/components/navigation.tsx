'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldCheck,
  FolderGit2,
  LayoutDashboard,
  Milestone,
  CheckSquare,
  PlayCircle,
  Bug,
  Settings,
  CreditCard,
  ShieldAlert,
} from 'lucide-react';
import { NotificationBell } from './notification-bell';

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Projects', href: '/projects', icon: FolderGit2 },
    { name: 'Milestones', href: '/milestones', icon: Milestone },
    { name: 'Test Cases', href: '/test-cases', icon: CheckSquare },
    { name: 'Test Runs', href: '/test-runs', icon: PlayCircle },
    { name: 'Defects', href: '/defects', icon: Bug },
    { name: 'Billing', href: '/settings/billing', icon: CreditCard },
    { name: 'Platform', href: '/platform', icon: ShieldAlert },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex-shrink-0 flex items-center space-x-3">
              <div className="bg-blue-600 text-white p-2 rounded-lg">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="font-bold text-lg text-slate-900 dark:text-white">AI QA Platform</span>
            </Link>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-4 items-center">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <NotificationBell />
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
              Active Organization: Default
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}
