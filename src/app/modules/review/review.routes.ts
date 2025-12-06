import { Router } from 'express';

import { checkAuth } from '../../middlewares/checkAuth';
import { Role } from '../user/user.interface';
import { ReviewController } from './review.controller';

const router = Router();

router.post('/', checkAuth(Role.TOURIST, Role.ADMIN), ReviewController.createReview);
router.get('/guide/:guideId', ReviewController.getReviewsByGuide);
router.get('/tourist/:touristId', ReviewController.getReviewsByTourist);
router.get('/', checkAuth(Role.ADMIN), ReviewController.getAllReviews);


export const ReviewRoutes = router;