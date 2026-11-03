'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldAlert,
  Building2,
  Users,
  Layers,
  Activity,
  ArrowLeft,
  LayoutDashboard,
  Sparkles,
} from 'lucide-react';

export default function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: '/platform', label: 'Platform Overview', icon: LayoutDashboard, exact: true },
    { href: '/platform/organizations', label: 'Organizations & Tenants', icon: Building2 },
    { href: '/platform/users', label: 'Users & Accounts', icon: Users },
    { href: '/platform/plans', label: 'Plan Catalog', icon: Layers },
    { href: '/platform/system', label: 'System Health', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-16">
      {/* Top Super Admin Header */}
      <div className="border-b border-slate-800 bg-slate-950/80 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Link
                href="/projects"
                className="text-slate-400 hover:text-white transition p-1.5 rounded-lg hover:bg-slate-800"
                title="Return to Application"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
                    <ShieldAlert className="w-5 h-5" />
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Platform Super Administration
                  </h1>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Multi-tenant governance, subscription lifecycles, and global telemetry
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                <ShieldAlert className="w-3.5 h-3.5" /> Super Admin Authority
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 sm:space-x-8 overflow-x-auto border-t border-slate-800/80">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + '/');

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 py-3 px-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">{children}</main>
    </div>
  );
}
