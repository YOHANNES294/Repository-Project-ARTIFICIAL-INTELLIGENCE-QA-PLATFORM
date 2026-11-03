'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Plug,
  Webhook as WebhookIcon,
  Plus,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Key,
  Trash2,
  Send,
  Clock,
  ArrowLeft,
  Activity,
  Layers,
} from 'lucide-react';
import { defaultApiClient } from '@ai-qa/api-client';
import {
  IntegrationDto,
  WebhookDto,
  WebhookDeliveryDto,
  IntegrationProvider,
} from '@ai-qa/shared-types';

export default function ProjectIntegrationsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [activeTab, setActiveTab] = useState<'integrations' | 'webhooks' | 'deliveries'>('integrations');
  const [integrations, setIntegrations] = useState<IntegrationDto[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookDto[]>([]);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDeliveryDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddIntegrationModal, setShowAddIntegrationModal] = useState(false);
  const [showAddWebhookModal, setShowAddWebhookModal] = useState(false);
  const [newlyCreatedSecret, setNewlyCreatedSecret] = useState<string | null>(null);
  const [rotatedSecret, setRotatedSecret] = useState<string | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<WebhookDeliveryDto | null>(null);

  // New integration form
  const [intName, setIntName] = useState('');
  const [intProvider, setIntProvider] = useState<IntegrationProvider>(IntegrationProvider.SLACK);
  const [intWebhookUrl, setIntWebhookUrl] = useState('');
  const [intEvents, setIntEvents] = useState<string[]>(['DEFECT', 'EXECUTION']);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // New webhook form
  const [whName, setWhName] = useState('');
  const [whUrl, setWhUrl] = useState('');
  const [whEvents, setWhEvents] = useState<string[]>(['*']);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ints, whs] = await Promise.all([
        defaultApiClient.getProjectIntegrations(projectId),
        defaultApiClient.getProjectWebhooks(projectId),
      ]);
      setIntegrations(ints);
      setWebhooks(whs);

      if (whs.length > 0 && !selectedWebhookId) {
        setSelectedWebhookId(whs[0].id);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedWebhookId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadDeliveries = useCallback(async (webhookId: string) => {
    try {
      const items = await defaultApiClient.getWebhookDeliveries(webhookId, projectId);
      setDeliveries(items);
    } catch {}
  }, [projectId]);

  useEffect(() => {
    if (selectedWebhookId && activeTab === 'deliveries') {
      loadDeliveries(selectedWebhookId);
    }
  }, [selectedWebhookId, activeTab, loadDeliveries]);

  const handleTestIntegration = async () => {
    if (!intWebhookUrl) {
      setTestResult({ success: false, message: 'Please provide a webhook URL to test' });
      return;
    }
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await defaultApiClient.testIntegration({
        provider: intProvider,
        config: { webhookUrl: intWebhookUrl },
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection test failed' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await defaultApiClient.createProjectIntegration(projectId, {
        name: intName.trim() || undefined,
        provider: intProvider,
        events: intEvents,
        config: { webhookUrl: intWebhookUrl },
      });
      setShowAddIntegrationModal(false);
      setIntName('');
      setIntWebhookUrl('');
      setTestResult(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create integration');
    }
  };

  const handleDeleteIntegration = async (id: string) => {
    if (!confirm('Are you sure you want to remove this integration?')) return;
    try {
      await defaultApiClient.deleteIntegration(id, projectId);
      setIntegrations((prev) => prev.filter((i) => i.id !== id));
    } catch {}
  };

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await defaultApiClient.createProjectWebhook(projectId, {
        name: whName.trim() || undefined,
        url: whUrl,
        events: whEvents,
      });
      setNewlyCreatedSecret(created.rawSecret);
      setWhName('');
      setWhUrl('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create webhook');
    }
  };

  const handleRotateSecret = async (webhookId: string) => {
    if (!confirm('Rotating the secret will immediately invalidate the current signing key. Continue?')) return;
    try {
      const res = await defaultApiClient.rotateWebhookSecret(webhookId, projectId);
      setRotatedSecret(res.newSecret);
    } catch (err: any) {
      alert(err.message || 'Failed to rotate secret');
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this outbound webhook?')) return;
    try {
      await defaultApiClient.deleteWebhook(id, projectId);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    } catch {}
  };

  const handleRetryDelivery = async (deliveryId: string) => {
    if (!selectedWebhookId) return;
    try {
      const retried = await defaultApiClient.retryWebhookDelivery(selectedWebhookId, deliveryId, projectId);
      setDeliveries((prev) => prev.map((d) => (d.id === deliveryId ? retried : d)));
    } catch (err: any) {
      alert(err.message || 'Failed to retry delivery');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 mb-1"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          <span>Back to Project Dashboard</span>
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Plug className="h-6 w-6 text-blue-600" />
              <span>Integrations & Webhooks</span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Connect QA workflows to Slack, Microsoft Teams, and secure HMAC outbound webhooks
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAddIntegrationModal(true)}
              className="inline-flex items-center px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              <span>Add Integration</span>
            </button>
            <button
              onClick={() => setShowAddWebhookModal(true)}
              className="inline-flex items-center px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-colors"
            >
              <WebhookIcon className="h-4 w-4 mr-1.5 text-blue-600" />
              <span>New Outbound Webhook</span>
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('integrations')}
            className={`pb-3 border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'integrations'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Chat & App Integrations ({integrations.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`pb-3 border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'webhooks'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <WebhookIcon className="h-4 w-4" />
            <span>Outbound Webhooks ({webhooks.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('deliveries');
              if (selectedWebhookId) loadDeliveries(selectedWebhookId);
            }}
            className={`pb-3 border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'deliveries'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Delivery Logs & Telemetry</span>
          </button>
        </div>

        {/* TAB 1: INTEGRATIONS */}
        {activeTab === 'integrations' && (
          <div className="space-y-4">
            {loading ? (
              <div className="p-12 text-center text-sm text-slate-500">Loading integrations...</div>
            ) : integrations.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
                <Plug className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">No integrations configured</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Connect Slack or Microsoft Teams to receive real-time test run and defect updates directly in your team channels.
                </p>
                <button
                  onClick={() => setShowAddIntegrationModal(true)}
                  className="mt-4 inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  <span>Connect Team Channel</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {integrations.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                          {item.provider === 'SLACK' ? (
                            <span className="text-lg">💬</span>
                          ) : item.provider === 'TEAMS' ? (
                            <span className="text-lg">👥</span>
                          ) : (
                            <WebhookIcon className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                            {item.name || item.provider}
                          </h4>
                          <span className="text-xs text-slate-400 block">
                            Provider: {item.provider}
                          </span>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                        {item.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                      <div>
                        <strong>Endpoint:</strong>{' '}
                        <code className="text-[11px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                          {String(item.config.webhookUrl || 'Configured')}
                        </code>
                      </div>
                      <div>
                        <strong>Events:</strong>{' '}
                        {item.events.length > 0 ? item.events.join(', ') : 'All events (*)'}
                      </div>
                      {item.lastSyncAt && (
                        <div>
                          <strong>Last Active:</strong> {new Date(item.lastSyncAt).toLocaleString()}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => handleDeleteIntegration(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors text-xs flex items-center space-x-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: WEBHOOKS */}
        {activeTab === 'webhooks' && (
          <div className="space-y-4">
            {loading ? (
              <div className="p-12 text-center text-sm text-slate-500">Loading webhooks...</div>
            ) : webhooks.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
                <WebhookIcon className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">No outbound webhooks configured</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Register webhooks to receive cryptographically signed HTTP payloads (HMAC-SHA256) on test completions and defect transitions.
                </p>
                <button
                  onClick={() => setShowAddWebhookModal(true)}
                  className="mt-4 inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  <span>Register Webhook</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {webhooks.map((wh) => (
                  <div
                    key={wh.id}
                    className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                          <WebhookIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                            {wh.name || 'Outbound Webhook'}
                          </h4>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            {wh.url}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                          HMAC-SHA256 Active
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-6 gap-y-1">
                      <div>
                        <strong>Signing Secret:</strong>{' '}
                        <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">
                          {wh.secretMasked || '••••••••'}
                        </code>
                      </div>
                      <div>
                        <strong>Subscribed Events:</strong> {wh.events.join(', ')}
                      </div>
                      <div>
                        <strong>Created:</strong> {new Date(wh.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs">
                      <button
                        onClick={() => {
                          setSelectedWebhookId(wh.id);
                          setActiveTab('deliveries');
                        }}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium flex items-center space-x-1"
                      >
                        <Activity className="h-3.5 w-3.5" />
                        <span>View Delivery History</span>
                      </button>

                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleRotateSecret(wh.id)}
                          className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center space-x-1"
                          title="Rotate HMAC signing secret"
                        >
                          <Key className="h-3.5 w-3.5 text-amber-500" />
                          <span>Rotate Secret</span>
                        </button>
                        <button
                          onClick={() => handleDeleteWebhook(wh.id)}
                          className="text-red-500 hover:text-red-700 flex items-center space-x-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DELIVERIES & TELEMETRY */}
        {activeTab === 'deliveries' && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <span>Webhook Delivery Logs</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Inspect payloads, HTTP status codes, latency, and execute manual retries
                </p>
              </div>

              {webhooks.length > 0 && (
                <div className="flex items-center space-x-2">
                  <label className="text-xs text-slate-500">Target Webhook:</label>
                  <select
                    value={selectedWebhookId || ''}
                    onChange={(e) => setSelectedWebhookId(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {webhooks.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name || w.url}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {deliveries.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                No deliveries recorded yet for this webhook.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-3 py-2.5">Event</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">HTTP Code</th>
                      <th className="px-3 py-2.5">Latency</th>
                      <th className="px-3 py-2.5">Attempts</th>
                      <th className="px-3 py-2.5">Timestamp</th>
                      <th className="px-3 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {deliveries.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="px-3 py-2.5 font-sans font-semibold text-slate-900 dark:text-white">
                          {d.event}
                        </td>
                        <td className="px-3 py-2.5 font-sans">
                          {d.status === 'SUCCESS' ? (
                            <span className="inline-flex items-center text-emerald-600 text-xs font-semibold">
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              SUCCESS
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-red-600 text-xs font-semibold">
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              {d.status}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {d.statusCode || <span className="text-slate-400">N/A</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          {d.durationMs ? `${d.durationMs}ms` : '-'}
                        </td>
                        <td className="px-3 py-2.5">{d.attempts}</td>
                        <td className="px-3 py-2.5 font-sans text-slate-400">
                          {new Date(d.createdAt).toLocaleTimeString()}
                        </td>
                        <td className="px-3 py-2.5 text-right font-sans space-x-2">
                          <button
                            onClick={() => setSelectedDelivery(d)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            Inspect
                          </button>
                          <button
                            onClick={() => handleRetryDelivery(d.id)}
                            className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs font-medium"
                          >
                            Retry
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* MODAL 1: ADD INTEGRATION */}
        {showAddIntegrationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Add Team Chat Integration
              </h3>
              <form onSubmit={handleSaveIntegration} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Integration Provider
                  </label>
                  <select
                    value={intProvider}
                    onChange={(e) => setIntProvider(e.target.value as IntegrationProvider)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value={IntegrationProvider.SLACK}>Slack (Incoming Webhook)</option>
                    <option value={IntegrationProvider.TEAMS}>Microsoft Teams (Connector)</option>
                    <option value={IntegrationProvider.GENERIC_WEBHOOK}>Generic Webhook</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Integration Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. #qa-alerts channel"
                    value={intName}
                    onChange={(e) => setIntName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Webhook URL (Target Endpoint)
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://hooks.slack.com/services/..."
                    value={intWebhookUrl}
                    onChange={(e) => setIntWebhookUrl(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Protected with SSRF verification; private network IPs and cloud metadata are blocked.
                  </span>
                </div>

                {/* Test Connection Button */}
                <div className="pt-1 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleTestIntegration}
                    disabled={testingConnection || !intWebhookUrl}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5 mr-1 text-blue-600" />
                    <span>{testingConnection ? 'Testing...' : 'Test Connection'}</span>
                  </button>

                  {testResult && (
                    <span
                      className={`text-xs font-medium ${
                        testResult.success ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {testResult.message}
                    </span>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddIntegrationModal(false)}
                    className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                  >
                    Save Integration
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: ADD OUTBOUND WEBHOOK */}
        {showAddWebhookModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Register Outbound Webhook
              </h3>
              {newlyCreatedSecret ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 space-y-2">
                    <div className="flex items-center space-x-2 font-semibold text-sm">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Webhook Registered Successfully</span>
                    </div>
                    <p className="text-xs">
                      Copy your signing secret now. For security, it will not be displayed again.
                    </p>
                    <div className="flex items-center justify-between p-2 rounded bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 font-mono text-xs">
                      <span className="truncate">{newlyCreatedSecret}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(newlyCreatedSecret)}
                        className="ml-2 p-1 text-emerald-700 hover:text-emerald-900"
                        title="Copy to clipboard"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setNewlyCreatedSecret(null);
                        setShowAddWebhookModal(false);
                      }}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveWebhook} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Webhook Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CI/CD Orchestrator"
                      value={whName}
                      onChange={(e) => setWhName(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Payload Destination URL
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://api.internal-infra.com/webhooks/qa"
                      value={whUrl}
                      onChange={(e) => setWhUrl(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
                    <ShieldCheck className="h-4 w-4 inline mr-1 text-blue-600" />
                    Every HTTP request includes <code className="font-mono">X-AIQA-Signature</code> generated via HMAC-SHA256, timestamp, and UUID event ID to defend against tampering and replay attacks.
                  </div>

                  <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowAddWebhookModal(false)}
                      className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                    >
                      Register & Generate Secret
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* MODAL 3: ROTATED SECRET NOTICE */}
        {rotatedSecret && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Key className="h-5 w-5 text-amber-500" />
                <span>New Signing Secret Generated</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Please update your receiving server with this new HMAC key:
              </p>
              <div className="flex items-center justify-between p-2.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-xs">
                <span className="truncate">{rotatedSecret}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(rotatedSecret)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setRotatedSecret(null)}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 text-xs font-semibold text-white"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 4: DELIVERY INSPECTOR */}
        {selectedDelivery && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[80vh] flex flex-col p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Webhook Delivery Details
                </h3>
                <span className="text-xs font-mono text-slate-400">{selectedDelivery.eventId}</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 text-xs">
                <div>
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Payload:</h4>
                  <pre className="p-3 rounded-lg bg-slate-900 text-slate-200 overflow-x-auto text-[11px] font-mono">
                    {JSON.stringify(selectedDelivery.payload, null, 2)}
                  </pre>
                </div>
                {selectedDelivery.responseBody && (
                  <div>
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Response Body (Status {selectedDelivery.statusCode}):
                    </h4>
                    <pre className="p-3 rounded-lg bg-slate-900 text-slate-200 overflow-x-auto text-[11px] font-mono">
                      {selectedDelivery.responseBody}
                    </pre>
                  </div>
                )}
                {selectedDelivery.error && (
                  <div>
                    <h4 className="font-semibold text-red-600 mb-1">Delivery Error:</h4>
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 font-mono text-[11px]">
                      {selectedDelivery.error}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setSelectedDelivery(null)}
                  className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
