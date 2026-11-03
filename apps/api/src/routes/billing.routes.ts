import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireTenant, requireRole } from '../middleware/auth.js';
import {
  OrganizationRole,
  ApiResponse,
  ChangeSubscriptionInput,
  CreatePaymentCheckoutInput,
  CreateUsageAdjustmentInput,
} from '@ai-qa/shared-types';
import {
  changeSubscriptionSchema,
  cancelSubscriptionSchema,
  createCheckoutSessionSchema,
  createUsageAdjustmentSchema,
} from '@ai-qa/validation';
import {
  getSubscription,
  changeSubscription,
  cancelSubscription,
  reactivateSubscription,
  getPlans,
  getUsageSummary,
  createAdjustment,
  createCheckout,
  getInvoices,
  getInvoiceById,
  generateInvoiceHtml,
} from '../services/billing/index.js';
import { prisma } from '../prisma.js';

export const billingRouter: Router = Router({ mergeParams: true });

// Require authentication and tenant resolution for all billing routes
billingRouter.use(authenticate, requireTenant);

// GET /api/v1/organizations/:orgId/billing - Current subscription & plan
billingRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.organizationId!;
    const subscription = await getSubscription(orgId);

    const response: ApiResponse = {
      success: true,
      data: subscription,
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/organizations/:orgId/billing/plans - Public plans catalog
billingRouter.get('/plans', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await getPlans();
    const response: ApiResponse = {
      success: true,
      data: plans,
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/organizations/:orgId/billing/usage - Real-time usage meters against plan quotas
billingRouter.get('/usage', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.organizationId!;
    const usage = await getUsageSummary(orgId);

    const response: ApiResponse = {
      success: true,
      data: usage,
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/organizations/:orgId/billing/subscription - Upgrade or change subscription tier
billingRouter.post(
  '/subscription',
  requireRole(OrganizationRole.OWNER, OrganizationRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId!;
      const validated = changeSubscriptionSchema.parse(req.body);

      const updated = await changeSubscription(orgId, validated as unknown as ChangeSubscriptionInput, req.user!.id);

      const response: ApiResponse = {
        success: true,
        data: updated,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/organizations/:orgId/billing/subscription/cancel - Cancel subscription
billingRouter.post(
  '/subscription/cancel',
  requireRole(OrganizationRole.OWNER, OrganizationRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId!;
      const validated = cancelSubscriptionSchema.parse(req.body);

      const cancelled = await cancelSubscription(orgId, validated, req.user!.id);

      const response: ApiResponse = {
        success: true,
        data: cancelled,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/organizations/:orgId/billing/subscription/reactivate - Revoke cancellation
billingRouter.post(
  '/subscription/reactivate',
  requireRole(OrganizationRole.OWNER, OrganizationRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId!;
      const reactivated = await reactivateSubscription(orgId, req.user!.id);

      const response: ApiResponse = {
        success: true,
        data: reactivated,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/organizations/:orgId/billing/checkout - Create checkout session
billingRouter.post(
  '/checkout',
  requireRole(OrganizationRole.OWNER, OrganizationRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId!;
      const validated = createCheckoutSessionSchema.parse(req.body);

      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true },
      });

      const session = await createCheckout({
        ...(validated as unknown as CreatePaymentCheckoutInput),
        organizationId: orgId,
        organizationName: org?.name || 'Organization',
        userEmail: req.user!.email,
      });

      const response: ApiResponse = {
        success: true,
        data: session,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/organizations/:orgId/billing/invoices - Invoice history
billingRouter.get('/invoices', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.organizationId!;
    const invoices = await getInvoices(orgId);

    const response: ApiResponse = {
      success: true,
      data: invoices,
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/organizations/:orgId/billing/invoices/:invoiceId - Single invoice details
billingRouter.get('/invoices/:invoiceId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await getInvoiceById(req.params.invoiceId as string);
    if (!invoice || invoice.organizationId !== req.organizationId) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: invoice,
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/organizations/:orgId/billing/invoices/:invoiceId/html - Render printable HTML
billingRouter.get('/invoices/:invoiceId/html', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await getInvoiceById(req.params.invoiceId as string);
    if (!invoice || invoice.organizationId !== req.organizationId) {
      res.status(404).send('Invoice not found');
      return;
    }

    const org = await prisma.organization.findUnique({
      where: { id: req.organizationId! },
      select: { name: true },
    });

    const html = generateInvoiceHtml(invoice, org?.name || 'Customer');
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/organizations/:orgId/billing/usage/adjust - Auditable usage adjustment
billingRouter.post(
  '/usage/adjust',
  requireRole(OrganizationRole.OWNER, OrganizationRole.ADMINISTRATOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId!;
      const validated = createUsageAdjustmentSchema.parse(req.body);

      const adjustment = await createAdjustment({
        ...(validated as unknown as CreateUsageAdjustmentInput),
        organizationId: orgId,
        adjustedById: req.user!.id,
      });

      const response: ApiResponse = {
        success: true,
        data: adjustment,
      };
      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }
);
