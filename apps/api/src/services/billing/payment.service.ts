import {
  BillingInterval,
  PaymentProviderType,
  PaymentStatus,
  InvoiceStatus,
  PaymentDto,
  InvoiceDto,
  CreatePaymentCheckoutInput,
  CheckoutSessionResultDto,
} from '@ai-qa/shared-types';
import { prisma } from '../../prisma.js';
import { getPlanByTier } from './plan.service.js';
import { getPaymentProvider } from './payment/index.js';

export function mapPaymentToDto(payment: any): PaymentDto {
  return {
    id: payment.id,
    organizationId: payment.organizationId,
    invoiceId: payment.invoiceId,
    amountCents: payment.amountCents,
    currency: payment.currency,
    status: payment.status as PaymentStatus,
    provider: payment.provider as PaymentProviderType,
    providerPaymentId: payment.providerPaymentId,
    isTestMode: payment.isTestMode,
    receiptUrl: payment.receiptUrl,
    errorMessage: payment.errorMessage,
    metadata: payment.metadata as Record<string, unknown> | null,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt?.toISOString(),
  };
}

export function mapInvoiceToDto(invoice: any): InvoiceDto {
  return {
    id: invoice.id,
    organizationId: invoice.organizationId,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status as InvoiceStatus,
    subtotalCents: invoice.subtotalCents,
    taxCents: invoice.taxCents,
    discountCents: invoice.discountCents,
    totalCents: invoice.totalCents,
    currency: invoice.currency,
    billingPeriodStart: invoice.billingPeriodStart.toISOString(),
    billingPeriodEnd: invoice.billingPeriodEnd.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
    pdfFileKey: invoice.pdfFileKey,
    isTestMode: invoice.isTestMode,
    metadata: invoice.metadata as Record<string, unknown> | null,
    payments: invoice.payments ? invoice.payments.map(mapPaymentToDto) : undefined,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt?.toISOString(),
  };
}

export async function createCheckout(
  params: CreatePaymentCheckoutInput & {
    organizationId: string;
    userEmail: string;
    organizationName: string;
  }
): Promise<CheckoutSessionResultDto> {
  const plan = await getPlanByTier(params.planTier);
  if (!plan) {
    throw new Error(`Billing plan for tier ${params.planTier} not found`);
  }

  const isYearly = params.interval === BillingInterval.YEARLY;
  const amountCents = isYearly ? plan.priceCentsYear : plan.priceCentsMonth;

  const provider = getPaymentProvider(params.provider);
  const checkout = await provider.createCheckoutSession({
    organizationId: params.organizationId,
    organizationName: params.organizationName,
    billingPlanId: plan.id,
    planName: plan.name,
    tier: plan.tier,
    amountCents,
    currency: plan.currency,
    interval: params.interval,
    customerEmail: params.userEmail,
    successUrl: params.successUrl,
    cancelUrl: params.cancelUrl,
  });

  // Create an initial invoice and pending payment record
  const now = new Date();
  const periodEnd = new Date(now.getTime() + (isYearly ? 365 : 30) * 24 * 60 * 60 * 1000);
  const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const invoice = await prisma.invoice.create({
    data: {
      organizationId: params.organizationId,
      invoiceNumber,
      status: InvoiceStatus.OPEN as any,
      subtotalCents: amountCents,
      taxCents: 0,
      discountCents: 0,
      totalCents: amountCents,
      currency: plan.currency,
      billingPeriodStart: now,
      billingPeriodEnd: periodEnd,
      dueDate: now,
      isTestMode: checkout.isTestMode,
      metadata: {
        planTier: plan.tier,
        planName: plan.name,
        interval: params.interval,
        sessionId: checkout.sessionId,
      },
    },
  });

  await prisma.payment.create({
    data: {
      organizationId: params.organizationId,
      invoiceId: invoice.id,
      amountCents,
      currency: plan.currency,
      status: PaymentStatus.PENDING as any,
      provider: params.provider as any,
      providerPaymentId: checkout.sessionId,
      isTestMode: checkout.isTestMode,
      metadata: {
        sessionId: checkout.sessionId,
        planTier: plan.tier,
        interval: params.interval,
      },
    },
  });

  return checkout;
}

export async function getInvoices(organizationId: string): Promise<InvoiceDto[]> {
  const invoices = await prisma.invoice.findMany({
    where: { organizationId },
    include: { payments: true },
    orderBy: { createdAt: 'desc' },
  });
  return invoices.map(mapInvoiceToDto);
}

export async function getInvoiceById(invoiceId: string): Promise<InvoiceDto | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });
  return invoice ? mapInvoiceToDto(invoice) : null;
}

export function generateInvoiceHtml(invoice: InvoiceDto, orgName: string): string {
  const testModeBanner = invoice.isTestMode
    ? `<div style="background-color: #fef2f2; border: 2px dashed #ef4444; color: #b91c1c; padding: 12px; text-align: center; font-weight: bold; margin-bottom: 24px; border-radius: 6px;">
        ⚠️ [TEST MODE - NOT A REAL INVOICE / SIMULATED TRANSACTION]
      </div>`
    : '';

  const formattedTotal = (invoice.totalCents / 100).toFixed(2);
  const formattedSubtotal = (invoice.subtotalCents / 100).toFixed(2);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 1px solid #e2e8f0; padding-bottom: 24px; }
    .logo { font-size: 24px; font-weight: 800; color: #4f46e5; }
    .invoice-details { text-align: right; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; background-color: ${invoice.status === 'PAID' ? '#dcfce7' : '#fef3c7'}; color: ${invoice.status === 'PAID' ? '#166534' : '#92400e'}; }
    .table { width: 100%; border-collapse: collapse; margin-top: 32px; margin-bottom: 32px; }
    .table th, .table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    .table th { background-color: #f8fafc; font-size: 12px; text-transform: uppercase; color: #64748b; }
    .table td.amount, .table th.amount { text-align: right; }
    .totals { margin-left: auto; width: 300px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .totals-row.grand-total { border-top: 2px solid #e2e8f0; font-weight: bold; font-size: 18px; margin-top: 8px; padding-top: 12px; color: #0f172a; }
    .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 24px; }
  </style>
</head>
<body>
  ${testModeBanner}
  <div class="header">
    <div>
      <div class="logo">AI QA Platform</div>
      <p style="margin-top: 4px; color: #64748b;">Enterprise Quality Engineering Platform</p>
      <div style="margin-top: 16px;">
        <strong>Billed To:</strong><br>
        ${orgName}<br>
        Organization ID: ${invoice.organizationId}
      </div>
    </div>
    <div class="invoice-details">
      <h1 style="margin: 0; font-size: 28px; color: #0f172a;">INVOICE</h1>
      <p style="margin: 4px 0 12px 0; color: #64748b;">${invoice.invoiceNumber}</p>
      <div><span class="status-badge">${invoice.status}</span></div>
      <p style="margin-top: 12px; font-size: 14px;">
        <strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString()}<br>
        <strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}
      </p>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Description</th>
        <th>Period</th>
        <th class="amount">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <strong>SaaS Subscription</strong><br>
          <span style="font-size: 12px; color: #64748b;">${(invoice.metadata as any)?.planName || 'Plan Subscription'} (${(invoice.metadata as any)?.interval || 'MONTHLY'})</span>
        </td>
        <td>
          ${new Date(invoice.billingPeriodStart).toLocaleDateString()} – ${new Date(invoice.billingPeriodEnd).toLocaleDateString()}
        </td>
        <td class="amount">$${formattedSubtotal}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span>Subtotal</span>
      <span>$${formattedSubtotal}</span>
    </div>
    <div class="totals-row">
      <span>Tax</span>
      <span>$0.00</span>
    </div>
    <div class="totals-row grand-total">
      <span>Total (${invoice.currency})</span>
      <span>$${formattedTotal}</span>
    </div>
  </div>

  <div class="footer">
    <p>Thank you for choosing AI QA Platform. For billing inquiries, contact billing@aiqa.platform</p>
  </div>
</body>
</html>`;
}
