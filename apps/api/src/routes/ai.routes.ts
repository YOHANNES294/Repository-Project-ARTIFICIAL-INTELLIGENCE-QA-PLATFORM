import { Router, Request, Response, NextFunction } from 'express';
import {
  updateAIProviderConfigSchema,
  generateTestCasesSchema,
  analyzeFailureSchema,
  analyzeDuplicateDefectSchema,
  analyzeRiskSchema,
  generateQAReportSchema,
  reviewAIGenerationItemSchema,
  batchReviewAIGenerationItemsSchema,
  submitAIFeedbackSchema,
} from '@ai-qa/validation';
import {
  AIGatewayService,
  AITestGenerationService,
  AIFailureAnalysisService,
  AIDuplicateIntelligenceService,
  AIRiskAnalysisService,
  AIQASummaryService,
  AIFeedbackService,
} from '../services/ai';
import { requireRole } from '../middleware/auth';
import {
  OrganizationRole,
  ApiResponse,
  UpdateAIProviderConfigInput,
  ReviewAIGenerationItemInput,
  SubmitAIFeedbackInput,
} from '@ai-qa/shared-types';

export const aiRouter: Router = Router({ mergeParams: true });

// 1. Get Provider Configuration
aiRouter.get('/provider', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await AIGatewayService.getProviderConfig(req.organizationId!);
    const response: ApiResponse = {
      success: true,
      data: config,
    };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// 2. Update Provider Configuration (Admins/Managers)
aiRouter.put(
  '/provider',
  requireRole(OrganizationRole.OWNER, OrganizationRole.ADMINISTRATOR, OrganizationRole.QA_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updateAIProviderConfigSchema.parse(req.body) as UpdateAIProviderConfigInput;
      const updated = await AIGatewayService.updateProviderConfig(req.organizationId!, validated);
      const response: ApiResponse = {
        success: true,
        data: updated,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// 3. Test Provider Connection
aiRouter.post(
  '/provider/test',
  requireRole(OrganizationRole.OWNER, OrganizationRole.ADMINISTRATOR, OrganizationRole.QA_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await AIGatewayService.testProviderConnection(req.organizationId!);
      const response: ApiResponse = {
        success: true,
        data: result,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// 4. Get AI Usage Metrics
aiRouter.get('/usage', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string | undefined;
    const metrics = await AIGatewayService.getUsageMetrics(req.organizationId!, projectId);
    const response: ApiResponse = {
      success: true,
      data: metrics,
    };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// 5. Generate Test Cases (Proposals for human review)
aiRouter.post(
  '/generate-tests',
  requireRole(
    OrganizationRole.OWNER,
    OrganizationRole.ADMINISTRATOR,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.QA_ENGINEER,
    OrganizationRole.AUTOMATION_ENGINEER
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = generateTestCasesSchema.parse(req.body);
      const generation = await AITestGenerationService.generateTestCases(
        req.params.projectId as string,
        req.organizationId!,
        req.user!.id,
        validated
      );
      const response: ApiResponse = {
        success: true,
        data: generation,
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// 6. List Generations in Project
aiRouter.get('/generations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskType = req.query.taskType as any;
    const generations = await AITestGenerationService.listGenerations(
      req.params.projectId as string,
      req.organizationId!,
      taskType
    );
    const response: ApiResponse = {
      success: true,
      data: generations,
    };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// 7. Get Single Generation by ID
aiRouter.get('/generations/:generationId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const generation = await AITestGenerationService.getGeneration(
      req.params.projectId as string,
      req.organizationId!,
      req.params.generationId as string
    );
    const response: ApiResponse = {
      success: true,
      data: generation,
    };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// 8. Review Single Generated Test Case Proposal
aiRouter.post(
  '/generations/:generationId/items/:itemId/review',
  requireRole(
    OrganizationRole.OWNER,
    OrganizationRole.ADMINISTRATOR,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.QA_ENGINEER,
    OrganizationRole.AUTOMATION_ENGINEER
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = reviewAIGenerationItemSchema.parse(req.body) as ReviewAIGenerationItemInput;
      const item = await AITestGenerationService.reviewItem(
        req.params.projectId as string,
        req.organizationId!,
        req.params.itemId as string,
        req.user!.id,
        validated
      );
      const response: ApiResponse = {
        success: true,
        data: item,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// 9. Batch Review Generated Test Case Proposals
aiRouter.post(
  '/generations/:generationId/batch-review',
  requireRole(
    OrganizationRole.OWNER,
    OrganizationRole.ADMINISTRATOR,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.QA_ENGINEER,
    OrganizationRole.AUTOMATION_ENGINEER
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = batchReviewAIGenerationItemsSchema.parse(req.body);
      const result = await AITestGenerationService.batchReview(
        req.params.projectId as string,
        req.organizationId!,
        req.user!.id,
        validated
      );
      const response: ApiResponse = {
        success: true,
        data: result,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// 10. AI Failure Analysis on Failed Execution Attempt
aiRouter.post(
  '/analyze-failure',
  requireRole(
    OrganizationRole.OWNER,
    OrganizationRole.ADMINISTRATOR,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.QA_ENGINEER,
    OrganizationRole.AUTOMATION_ENGINEER,
    OrganizationRole.DEVELOPER
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = analyzeFailureSchema.parse(req.body);
      const analysis = await AIFailureAnalysisService.analyzeFailure(
        req.params.projectId as string,
        req.organizationId!,
        req.user!.id,
        validated
      );
      const response: ApiResponse = {
        success: true,
        data: analysis,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// 11. AI Duplicate Defect Intelligence
aiRouter.post(
  '/duplicate-intelligence',
  requireRole(
    OrganizationRole.OWNER,
    OrganizationRole.ADMINISTRATOR,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.QA_ENGINEER,
    OrganizationRole.AUTOMATION_ENGINEER,
    OrganizationRole.DEVELOPER
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = analyzeDuplicateDefectSchema.parse(req.body);
      const result = await AIDuplicateIntelligenceService.analyzeDuplicate(
        req.params.projectId as string,
        req.organizationId!,
        req.user!.id,
        validated
      );
      const response: ApiResponse = {
        success: true,
        data: result,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// 12. Risk-Based Testing Intelligence
aiRouter.post(
  '/risk-analysis',
  requireRole(
    OrganizationRole.OWNER,
    OrganizationRole.ADMINISTRATOR,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.QA_ENGINEER,
    OrganizationRole.AUTOMATION_ENGINEER
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = analyzeRiskSchema.parse(req.body);
      const analysis = await AIRiskAnalysisService.analyzeRisk(
        req.params.projectId as string,
        req.organizationId!,
        req.user!.id,
        validated
      );
      const response: ApiResponse = {
        success: true,
        data: analysis,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// 13. AI QA Executive Report Summary
aiRouter.post(
  '/qa-report',
  requireRole(
    OrganizationRole.OWNER,
    OrganizationRole.ADMINISTRATOR,
    OrganizationRole.QA_MANAGER,
    OrganizationRole.QA_ENGINEER
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = generateQAReportSchema.parse(req.body);
      const report = await AIQASummaryService.generateReport(
        req.params.projectId as string,
        req.organizationId!,
        req.user!.id,
        validated
      );
      const response: ApiResponse = {
        success: true,
        data: report,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// 14. Submit Feedback for AI Generation
aiRouter.post(
  '/generations/:generationId/feedback',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = submitAIFeedbackSchema.parse(req.body) as SubmitAIFeedbackInput;
      const feedback = await AIFeedbackService.submitFeedback(
        req.params.generationId as string,
        req.user!.id,
        validated
      );
      const response: ApiResponse = {
        success: true,
        data: feedback,
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// 15. Get Feedback for AI Generation
aiRouter.get(
  '/generations/:generationId/feedback',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const feedback = await AIFeedbackService.getFeedback(req.params.generationId as string);
      const response: ApiResponse = {
        success: true,
        data: feedback,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);
