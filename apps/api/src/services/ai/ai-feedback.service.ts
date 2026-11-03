import { prisma } from '../../prisma';
import {
  AIFeedbackDto,
  AIFeedbackRating,
  SubmitAIFeedbackInput,
} from '@ai-qa/shared-types';
import { NotFoundError } from '../../errors';

export class AIFeedbackService {
  /**
   * Submit feedback on an AI generation
   */
  static async submitFeedback(
    generationId: string,
    userId: string,
    input: SubmitAIFeedbackInput
  ): Promise<AIFeedbackDto> {
    const generation = await prisma.aIGeneration.findUnique({
      where: { id: generationId },
    });

    if (!generation) {
      throw new NotFoundError('AI Generation record not found');
    }

    const feedback = await prisma.aIFeedback.create({
      data: {
        generationId,
        userId,
        rating: input.rating || 5,
        ratingCategory: (input.ratingCategory as AIFeedbackRating) || null,
        comments: input.comments || null,
      },
    });

    return {
      id: feedback.id,
      generationId: feedback.generationId,
      userId: feedback.userId,
      rating: feedback.rating,
      ratingCategory: (feedback.ratingCategory as AIFeedbackRating) || null,
      comments: feedback.comments || null,
      createdAt: feedback.createdAt.toISOString(),
    };
  }

  /**
   * Get feedback list for a generation
   */
  static async getFeedback(generationId: string): Promise<AIFeedbackDto[]> {
    const feedbacks = await prisma.aIFeedback.findMany({
      where: { generationId },
      orderBy: { createdAt: 'desc' },
    });

    return feedbacks.map((f) => ({
      id: f.id,
      generationId: f.generationId,
      userId: f.userId,
      rating: f.rating,
      ratingCategory: (f.ratingCategory as AIFeedbackRating) || null,
      comments: f.comments || null,
      createdAt: f.createdAt.toISOString(),
    }));
  }
}
