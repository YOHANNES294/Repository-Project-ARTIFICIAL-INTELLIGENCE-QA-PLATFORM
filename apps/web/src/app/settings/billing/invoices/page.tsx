'use client';

import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Download,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Printer,
  X,
} from 'lucide-react';
import { defaultApiClient } from '@ai-qa/api-client';
import { InvoiceDto } from '@ai-qa/shared-types';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invoice HTML preview modal
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceDto | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loadingHtml, setLoadingHtml] = useState(false);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await defaultApiClient.getInvoices();
      setInvoices(data);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve invoice history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleOpenInvoicePreview = async (inv: InvoiceDto) => {
    setPreviewInvoice(inv);
    setLoadingHtml(true);
    try {
      const res = await fetch(`http://localhost:4000/api/v1/billing/invoices/${inv.id}/html`, {
        credentials: 'include',
      });
      if (res.ok) {
        const text = await res.text();
        setHtmlContent(text);
      } else {
        setHtmlContent('<p>Unable to load invoice document.</p>');
      }
    } catch {
      setHtmlContent('<p>Network error loading invoice.</p>');
    } finally {
      setLoadingHtml(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-sm text-slate-500 font-medium">Loading billing history & invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Billing History & Invoices</h2>
          <p className="text-xs text-slate-500">View and download statements and receipts for your subscription</p>
        </div>
        <button
          onClick={fetchInvoices}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs">
          {error}
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-xl mx-auto space-y-3">
          <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800">No Invoices Yet</h3>
          <p className="text-xs text-slate-500">
            Invoices and receipts will appear here automatically when payments are processed or your subscription renews.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-6">Invoice Number</th>
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-6">Billing Period</th>
                  <th className="py-3 px-6">Amount</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-mono font-medium text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      {inv.invoiceNumber}
                      {inv.isTestMode && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                          TEST
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-slate-500">
                      {new Date(inv.billingPeriodStart).toLocaleDateString()} –{' '}
                      {new Date(inv.billingPeriodEnd).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-900">
                      ${(inv.totalCents / 100).toFixed(2)} {inv.currency}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : inv.status === 'OPEN'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {inv.status === 'PAID' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleOpenInvoicePreview(inv)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 py-1 px-2.5 rounded-lg hover:bg-indigo-50 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View / Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HTML Invoice Viewer Modal */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600" />
                <span className="font-bold text-slate-900 text-sm">
                  Invoice {previewInvoice.invoiceNumber}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button
                  onClick={() => setPreviewInvoice(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto bg-white">
              {loadingHtml ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                  Rendering invoice statement...
                </div>
              ) : (
                <div
                  className="prose max-w-none text-slate-900"
                  dangerouslySetInnerHTML={{ __html: htmlContent || '' }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
