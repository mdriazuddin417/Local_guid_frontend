import QueryBuilder from "../../utils/QueryBuilder_chat";
import { Booking } from "../booking/booking.modal";
import { User } from "../user/user.model";
import { IReview, Review } from "./review.modal";


export const reviewSortableFields = ['rating', 'comment'];

export const ReviewService = {
  createReview: async (payload: IReview) => {
    const booking = await Booking.findById(payload.bookingId);
    if (!booking) throw new Error('Booking not found');
    if (String(booking.touristId) !== String(payload.touristId)) throw new Error('Booking does not belong to user');
    if (booking.status !== 'COMPLETED') throw new Error('Cannot review before completion');
    const review = await Review.create({
      bookingId: booking._id,
      touristId: payload.touristId,
      guideId: booking.guideId,
      rating: payload.rating,
      comment: payload.comment || '' as string | undefined | null
    });
    const agg = await Review.aggregate([{ $match: { guideId: booking.guideId } }, { $group: { _id: '$guideId', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }]);
    if (agg[0]) {
      await User.findByIdAndUpdate(booking.guideId, { averageRating: agg[0].avgRating, totalToursGiven: agg[0].count });
    }
    return review;
  },

  getReviewsByGuide: async (guideId: string, query: Record<string, string>) => {
    const qb = new QueryBuilder(Review.find({ guideId }), query);
    const docs = await qb.search(reviewSortableFields).filter().sort().paginate().fields().build();
    const meta = await qb.getMeta();
    return { data: docs, meta };
  },
  getReviewsByTourist: async (touristId: string, query: Record<string, string>) => {
    const qb = new QueryBuilder(Review.find({ touristId }), query);
    const docs = await qb.search(reviewSortableFields).filter().sort().paginate().fields().build();
    const meta = await qb.getMeta();
    return { data: docs, meta };
  },

  getAllReviews: async (query: Record<string, string>) => {
    const qb = new QueryBuilder(Review.find(), query);
    const docs = await qb.search(reviewSortableFields).filter().sort().paginate().fields().build();
    const meta = await qb.getMeta();
    return { data: docs, meta };
  }
};