import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { ReviewService } from './review.service';


export const ReviewController = {
  createReview: catchAsync(async (req: Request, res: Response) => {
    const payload = { ...req.body };
    const data = await ReviewService.createReview(payload);
    return sendResponse(res, { statusCode: 201, success: true, message: 'Review created', data });
  }),

  getReviewsByGuide: catchAsync(async (req: Request, res: Response) => {
    const data = await ReviewService.getReviewsByGuide(req.params.guideId, req.query as Record<string, string>);
    return sendResponse(res, { statusCode: 200, success: true, message: 'Reviews', data });
  }),
  getReviewsByTourist: catchAsync(async (req: Request, res: Response) => {
    const data = await ReviewService.getReviewsByGuide(req.params.touristId, req.query as Record<string, string>);
    return sendResponse(res, { statusCode: 200, success: true, message: 'Reviews', data });
  }),

  getAllReviews: catchAsync(async (req: Request, res: Response) => {
    const data = await ReviewService.getAllReviews(req.query as Record<string, string>);
    return sendResponse(res, { statusCode: 200, success: true, message: 'All reviews', data });
  })
};