'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  Check,
  Trash2,
  ExternalLink,
  Settings,
  Filter,
  Search,
  Bug,
  PlayCircle,
  UserCheck,
  Bot,
  Sparkles,
  ShieldAlert,
  BarChart2,
  Clock,
  Send,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { defaultApiClient } from '@ai-qa/api-client';
import { NotificationDto } from '@ai-qa/shared-types';

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'false' | 'true'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTestDispatching, setIsTestDispatching] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await defaultApiClient.getNotifications({
        page,
        limit: 15,
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
        isRead: statusFilter,
        search: searchQuery.trim() || undefined,
      });
      setNotifications(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [page, selectedCategory, statusFilter, searchQuery]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await defaultApiClient.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await defaultApiClient.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  const handleDelete = async (id: string) => {
    try {
      await defaultApiClient.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch {}
  };

  const handleTestDispatch = async () => {
    setIsTestDispatching(true);
    try {
      await defaultApiClient.testNotificationDispatch({
        title: 'Platform Quality Alert (Test)',
        message: 'This is a test notification verifying the multi-channel delivery pipeline.',
        category: 'REPORTING',
        priority: 'NORMAL',
      });
      loadNotifications();
    } catch {} finally {
      setIsTestDispatching(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'DEFECT':
        return <Bug className="h-4 w-4 text-red-500" />;
      case 'EXECUTION':
        return <PlayCircle className="h-4 w-4 text-blue-500" />;
      case 'ASSIGNMENT':
        return <UserCheck className="h-4 w-4 text-purple-500" />;
      case 'AUTOMATION':
        return <Bot className="h-4 w-4 text-emerald-500" />;
      case 'AI':
        return <Sparkles className="h-4 w-4 text-amber-500" />;
      case 'SECURITY':
        return <ShieldAlert className="h-4 w-4 text-rose-600" />;
      case 'REPORTING':
        return <BarChart2 className="h-4 w-4 text-indigo-500" />;
      default:
        return <Clock className="h-4 w-4 text-slate-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">URGENT</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">HIGH</span>;
      case 'NORMAL':
        return <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">NORMAL</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">LOW</span>;
      default:
        return null;
    }
  };

  const categories = [
    { id: 'ALL', label: 'All Categories' },
    { id: 'DEFECT', label: 'Defects' },
    { id: 'ASSIGNMENT', label: 'Assignments' },
    { id: 'EXECUTION', label: 'Executions' },
    { id: 'AUTOMATION', label: 'Automation' },
    { id: 'AI', label: 'AI Intelligence' },
    { id: 'REPORTING', label: 'Reporting & Gates' },
    { id: 'SECURITY', label: 'Security' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Bell className="h-6 w-6 text-blue-600" />
              <span>Notification Center</span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Real-time QA alerts, defect assignments, CI/CD webhooks, and executive digests
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleTestDispatch}
              disabled={isTestDispatching}
              className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-colors"
            >
              <Send className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
              <span>{isTestDispatching ? 'Dispatching...' : 'Test Alert'}</span>
            </button>
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
              <span>Mark All Read</span>
            </button>
            <Link
              href="/settings/notifications"
              className="inline-flex items-center px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-medium text-white shadow-sm transition-colors"
            >
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              <span>Preferences</span>
            </Link>
          </div>
        </div>

        {/* Filters Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Read Status Switch */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-800/60 text-xs">
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => {
                    setStatusFilter('false');
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    statusFilter === 'false'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Unread
                </button>
                <button
                  onClick={() => {
                    setStatusFilter('true');
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    statusFilter === 'true'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Read
                </button>
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedCategory(c.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === c.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="p-16 text-center">
              <Bell className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">No notifications</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                There are no notifications matching your active filters.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors ${
                    !n.isRead ? 'bg-blue-50/40 dark:bg-blue-950/20' : 'hover:bg-slate-50/60 dark:hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 flex-shrink-0 mt-0.5">
                      {getCategoryIcon(n.category)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">
                          {n.title}
                        </span>
                        {getPriorityBadge(n.priority)}
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                          {n.category}
                        </span>
                        {!n.isRead && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                        {n.message}
                      </p>
                      <div className="flex items-center space-x-4 pt-1 text-xs text-slate-400">
                        <span>{new Date(n.createdAt).toLocaleString()}</span>
                        {n.deliveries && n.deliveries.length > 0 && (
                          <span className="hidden sm:inline-flex items-center space-x-1">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                            <span>Delivered via {n.deliveries.map((d) => d.channel).join(', ')}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {n.link && (
                      <button
                        onClick={() => {
                          if (!n.isRead) handleMarkAsRead(n.id);
                          router.push(n.link!);
                        }}
                        className="p-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Open entity link"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    )}
                    {!n.isRead ? (
                      <button
                        onClick={() => handleMarkAsRead(n.id)}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="p-1.5 text-slate-300 dark:text-slate-600" title="Read">
                        <CheckCheck className="h-4 w-4" />
                      </span>
                    )}
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="Dismiss notification"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              <div>
                Showing page {page} of {totalPages} ({total} total notifications)
              </div>
              <div className="flex items-center space-x-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 hover:bg-slate-50 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 hover:bg-slate-50 transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
