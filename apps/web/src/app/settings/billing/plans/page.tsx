'use client';

import React, { useState, useEffect } from 'react';
import {
  Check,
  X,
  Sparkles,
  Zap,
  Shield,
  CreditCard,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { defaultApiClient } from '@ai-qa/api-client';
import {
  BillingPlanDto,
  SubscriptionDto,
  BillingTier,
  BillingInterval,
  PaymentProviderType,
} from '@ai-qa/shared-types';

export default function PlansPricingPage() {
  const [plans, setPlans] = useState<BillingPlanDto[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionDto | null>(null);
  const [interval, setInterval] = useState<BillingInterval>(BillingInterval.MONTHLY);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Checkout modal
  const [selectedPlan, setSelectedPlan] = useState<BillingPlanDto | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProviderType>(PaymentProviderType.LOCAL_TEST);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [plansData, subData] = await Promise.all([
        defaultApiClient.getBillingPlans(),
        defaultApiClient.getSubscription(),
      ]);
      setPlans(plansData);
      setSubscription(subData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch plan catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectPlan = (plan: BillingPlanDto) => {
    if (plan.tier === subscription?.plan?.tier) return;
    setSelectedPlan(plan);
  };

  const handleExecuteUpgrade = async () => {
    if (!selectedPlan) return;
    try {
      setActionLoading(selectedPlan.id);

      // If test provider or free tier, update directly
      if (selectedPlan.tier === BillingTier.FREE) {
        await defaultApiClient.changeSubscription({
          planTier: BillingTier.FREE,
          interval,
          paymentProvider: PaymentProviderType.LOCAL_TEST,
        });
        setSelectedPlan(null);
        await fetchData();
        alert('Plan updated successfully.');
        return;
      }

      // Create checkout session
      const checkout = await defaultApiClient.createCheckoutSession({
        planTier: selectedPlan.tier,
        interval,
        provider: selectedProvider,
      });

      setSelectedPlan(null);

      // If test checkout or simulated URL
      if (checkout.checkoutUrl) {
        window.location.href = checkout.checkoutUrl;
      } else {
        await fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to initiate plan change');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-sm text-slate-500 font-medium">Loading subscription plans & pricing...</p>
        </div>
      </div>
    );
  }

  const isYearly = interval === BillingInterval.YEARLY;

  return (
    <div className="space-y-10">
      {/* Header and Toggle */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Sparkles className="w-3.5 h-3.5" /> Transparent, Predictable Pricing
        </span>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight sm:text-4xl">
          Choose the right plan for your quality engineering team
        </h2>
        <p className="text-base text-slate-600">
          Scale effortlessly from individual projects to enterprise multi-team test operations. No hidden fees.
        </p>

        {/* Interval Switcher */}
        <div className="pt-2 flex items-center justify-center">
          <div className="bg-slate-200/80 p-1 rounded-xl flex items-center space-x-1 border border-slate-300/50">
            <button
              onClick={() => setInterval(BillingInterval.MONTHLY)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                !isYearly ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setInterval(BillingInterval.YEARLY)}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                isYearly ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Annual Billing
              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                SAVE ~17%
              </span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center text-sm">
          {error}
        </div>
      )}

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        {plans.map((p) => {
          const isCurrent = subscription?.plan?.tier === p.tier;
          const isPopular = p.tier === BillingTier.PROFESSIONAL;
          const displayPrice = isYearly
            ? Math.round(p.priceCentsYear / 12 / 100)
            : Math.round(p.priceCentsMonth / 100);

          return (
            <div
              key={p.id}
              className={`relative bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between p-6 ${
                isCurrent
                  ? 'border-indigo-600 ring-2 ring-indigo-600/20 shadow-md'
                  : isPopular
                  ? 'border-indigo-300 shadow-lg scale-102 z-10'
                  : 'border-slate-200 shadow-sm hover:shadow-md'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-white" /> Most Popular
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">{p.name}</h3>
                  {isCurrent && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                      CURRENT
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2 min-h-[32px]">{p.description}</p>

                {/* Price Display */}
                <div className="mt-5 pb-5 border-b border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900">
                      ${displayPrice}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">/ month</span>
                  </div>
                  {isYearly && p.priceCentsYear > 0 && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Billed annually (${(p.priceCentsYear / 100).toFixed(0)}/yr)
                    </p>
                  )}
                  {p.priceCentsMonth === 0 && (
                    <p className="text-[11px] text-emerald-600 font-medium mt-1">Free forever</p>
                  )}
                </div>

                {/* Quotas & Features */}
                <ul className="mt-6 space-y-3 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      <strong>{p.maxProjects === -1 ? 'Unlimited' : p.maxProjects}</strong> Projects
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      <strong>{p.maxMembers === -1 ? 'Unlimited' : p.maxMembers}</strong> Team Members
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      <strong>{p.maxTestCases === -1 ? 'Unlimited' : p.maxTestCases.toLocaleString()}</strong> Test Cases
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      <strong>{p.maxTestRunsPerMonth === -1 ? 'Unlimited' : p.maxTestRunsPerMonth.toLocaleString()}</strong> Test Runs / mo
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      <strong>{p.maxAutomationRunsPerMonth === -1 ? 'Unlimited' : p.maxAutomationRunsPerMonth.toLocaleString()}</strong> Automation Runs / mo
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      <strong>{(p.aiTokenAllowance / 1000).toFixed(0)}k</strong> AI Tokens / mo
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      <strong>{Number(p.storageBytes) >= 1073741824 ? `${Number(p.storageBytes) / 1073741824} GB` : '1 GB'}</strong> Storage
                    </span>
                  </li>
                  <li className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    {p.allowCustomReports ? (
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    )}
                    <span className={p.allowCustomReports ? 'font-medium' : 'text-slate-400'}>
                      Custom Reports & Dashboards
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    {p.allowIntegrations ? (
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    )}
                    <span className={p.allowIntegrations ? 'font-medium' : 'text-slate-400'}>
                      Slack & Teams Integrations
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    {p.allowAdvancedAnalytics ? (
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    )}
                    <span className={p.allowAdvancedAnalytics ? 'font-medium' : 'text-slate-400'}>
                      Predictive Quality Analytics
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    {p.allowSso ? (
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    )}
                    <span className={p.allowSso ? 'font-medium' : 'text-slate-400'}>
                      SAML SSO & Custom Roles
                    </span>
                  </li>
                </ul>
              </div>

              {/* Action Button */}
              <div className="mt-8">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-100 text-slate-500 cursor-default border border-slate-200"
                  >
                    Your Current Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handleSelectPlan(p)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm ${
                      isPopular
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    Switch to {p.name}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upgrade Checkout Dialog */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                Confirm Plan Change
              </h3>
              <button
                onClick={() => setSelectedPlan(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <div>
              <p className="text-sm text-slate-600">
                You are switching to the <strong>{selectedPlan.name}</strong> plan (
                {isYearly ? 'Annual' : 'Monthly'}).
              </p>
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Selected Plan:</span>
                  <span className="font-bold">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Billing Interval:</span>
                  <span>{interval}</span>
                </div>
                <div className="flex justify-between font-bold text-indigo-600 text-sm pt-1 border-t border-slate-200">
                  <span>Total Due Today:</span>
                  <span>
                    $
                    {isYearly
                      ? (selectedPlan.priceCentsYear / 100).toFixed(2)
                      : (selectedPlan.priceCentsMonth / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Provider Selector */}
            {selectedPlan.priceCentsMonth > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 block">Select Payment Gateway</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedProvider(PaymentProviderType.LOCAL_TEST)}
                    className={`p-3 rounded-xl border text-center text-xs font-bold transition ${
                      selectedProvider === PaymentProviderType.LOCAL_TEST
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-600/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    Test Sandbox
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedProvider(PaymentProviderType.STRIPE)}
                    className={`p-3 rounded-xl border text-center text-xs font-bold transition ${
                      selectedProvider === PaymentProviderType.STRIPE
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-600/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    Stripe
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedProvider(PaymentProviderType.CHAPA)}
                    className={`p-3 rounded-xl border text-center text-xs font-bold transition ${
                      selectedProvider === PaymentProviderType.CHAPA
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-600/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    Chapa (ETB)
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteUpgrade}
                disabled={Boolean(actionLoading)}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {actionLoading ? 'Connecting Gateway...' : 'Proceed to Checkout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
