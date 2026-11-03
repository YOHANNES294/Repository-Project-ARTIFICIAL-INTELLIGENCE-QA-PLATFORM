'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CreditCard, Sparkles, Receipt, BarChart3, ArrowLeft } from 'lucide-react';

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: '/settings/billing', label: 'Subscription Overview', icon: CreditCard, exact: true },
    { href: '/settings/billing/plans', label: 'Plans & Pricing', icon: Sparkles },
    { href: '/settings/billing/invoices', label: 'Invoices & Receipts', icon: Receipt },
    { href: '/settings/billing/usage', label: 'Usage & Quotas', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Header */}
      <div className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Link
                href="/projects"
                className="text-slate-500 hover:text-slate-700 transition p-1.5 rounded-md hover:bg-slate-100"
                title="Back to Projects"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-indigo-600" />
                  Billing & Subscription Management
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Manage your organization plan, resource quotas, invoices, and payment methods
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                Self-Service SaaS
              </span>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex space-x-1 sm:space-x-8 overflow-x-auto border-t border-slate-100">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + '/');

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 py-3 px-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
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

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">{children}</main>
    </div>
  );
}
