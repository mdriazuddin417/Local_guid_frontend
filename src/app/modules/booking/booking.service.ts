/* eslint-disable @typescript-eslint/no-unused-vars */

import mongoose, { Types } from 'mongoose';
import AppError from '../../errorHelpers/AppError';
import { QueryBuilder } from '../../utils/QueryBuilder';
import { TourListing } from '../listing/listing.model';
import { PAYMENT_STATUS } from '../payment/payment.interface';

import { getTransactionId } from '../../utils/getTransactionId';
import { Payment } from '../payment/payment.model';
import { ISSLCommerz } from '../sslCommerz/sslCommerz.interface';
import { SSLService } from '../sslCommerz/sslCommerz.service';
import { IUser, Role } from '../user/user.interface';
import { User } from '../user/user.model';
import { Booking, BookingStatus, IBooking } from './booking.modal';

export const BookingService = {
  createBooking: async (payload: IBooking) => {
    // 1. Start the Session
    const session = await mongoose.startSession();

    try {
      // 2. Start Transaction
      session.startTransaction();

      // --- Step A: Validation (Read operations inside session) ---
      const tour = await TourListing.findById({ _id: new Types.ObjectId(payload.tourListingId) }).session(session); // convert string to ObjectId
      if (!tour) {
        throw new AppError(404, 'Listing not found');
      }
      const touristExists = await User.findById({ _id: new Types.ObjectId(payload.touristId) }).session(session); // convert string to ObjectId
      if (!touristExists) {
        throw new AppError(404, 'Tourist/User not found');
      }

      const transactionId = getTransactionId();
      const totalPrice = (tour.price || 0) * (Number(payload.groupSize) || 1);

      const [booking] = await Booking.create([{
        touristId: new Types.ObjectId(payload.touristId),
        guideId: new Types.ObjectId(tour.guideId),
        tourListingId: new Types.ObjectId(tour._id as string),
        requestedDate: new Date(payload.requestedDate),
        groupSize: Number(payload.groupSize) || 1,
        totalPrice,
        notes: payload.notes || '',
        status: BookingStatus.PENDING as BookingStatus,
        paymentStatus: PAYMENT_STATUS.UNPAID as PAYMENT_STATUS | 'UNPAID',
        paymentId: payload.paymentId ? new Types.ObjectId(payload.paymentId as string) : undefined
      }], { session });


      const [payment] = await Payment.create([{
        booking: booking._id,
        status: PAYMENT_STATUS.UNPAID,
        transactionId: transactionId,
        amount: totalPrice
      }], { session });


      const updatedBooking = await Booking
        .findByIdAndUpdate(
          booking._id,
          { paymentId: payment._id },
          { new: true, runValidators: true, session }
        )
        .populate("tourListingId", "title price")
        .populate("touristId", "name email phone address")
        .populate("paymentId", "status transactionId amount");


      const touristDetails = updatedBooking?.touristId as unknown as IUser;

      const sslPayload: ISSLCommerz = {
        address: touristDetails?.address || 'Address not provided',
        email: touristDetails?.email || 'no-email@example.com',
        phoneNumber: touristDetails?.phone || '0000000000',
        name: touristDetails?.name || 'Guest',
        amount: totalPrice,
        transactionId: transactionId
      };
      const sslPayment = await SSLService.sslPaymentInit(sslPayload);
      await session.commitTransaction();
      await session.endSession();

      return {
        paymentUrl: sslPayment.GatewayPageURL,
        booking: updatedBooking
      };

    } catch (error) {

      await session.abortTransaction();
      await session.endSession();
      throw error;
    }
  },

  updateBooking: async (id: string, payload: Record<string, string>, user: IUser) => {
    const booking = await Booking.findById(id);
    if (!booking) throw new Error('Booking not found');
    if (payload.status === BookingStatus.CONFIRMED) {
      if (!user || (String(user._id) !== String(booking.guideId) && user.role !== Role.ADMIN)) {
        throw new Error('Not authorized to confirm');
      }
    }
    if (payload.status === BookingStatus.CANCELLED) {
      if (!user || (String(user._id) !== String(booking.touristId) && user.role !== Role.ADMIN)) {
        throw new Error('Not authorized to cancel');
      }
    }
    if (payload.status === BookingStatus.COMPLETED) {
      if (!user || (String(user._id) !== String(booking.guideId) && user.role !== Role.ADMIN)) {
        throw new Error('Not authorized to complete');
      }
    }

    const tour = await TourListing.findById(booking.tourListingId);
    if (!tour) {
      throw new AppError(404, 'Listing not found');
    };
    const totalPrice = (tour.price || 0) * (Number(payload.groupSize) || 1);
    payload.totalPrice = Number(totalPrice) as unknown as string;
    const updatedBooking = await Booking.findByIdAndUpdate(id, payload, { new: true });
    if (!updatedBooking) {
      throw new AppError(404, 'Booking not found');
    }
    return updatedBooking;
  },

  getBookingById: async (id: string) => {
    const booking = await Booking.findById(id)
      .populate('tourListingId')
      .populate({ path: 'guideId', select: '-password' })
      .populate({ path: 'touristId', select: '-password' });

    if (!booking) {
      throw new AppError(404, 'Booking not found');
    }
    return booking;
  },

  getBookings: async (query: Record<string, string>, user: IUser) => {

    const filter: Record<string, string> = {};
    // if (user?.role === Role.GUIDE) {
    //   filter.guideId = String(user._id);
    // } else if (user?.role === Role.TOURIST) {
    //   filter.touristId = String(user._id);
    // }
    if (query.status) {
      filter.status = query.status as string;
    }
    if (query.tourListingId) {
      filter.tourListingId = query.tourListingId as string;
    }

    if (query.fromDate || query.toDate) {
      (filter.requestedDate as unknown as Record<string, Date>) = {};
      if (query.fromDate) {
        (filter.requestedDate as unknown as Record<string, Date>).$gte = new Date(query.fromDate) as unknown as Date;
      }
      if (query.toDate) {
        (filter.requestedDate as unknown as Record<string, Date>).$lte = new Date(query.toDate) as unknown as Date;
      }
    }
    const initialModelQuery = Booking.find(filter).populate('tourListingId','title price category city').populate({ path: 'guideId', select: 'name email' }).populate({ path: 'touristId', select: 'name email' }).populate({path: 'paymentId', select: 'status transactionId amount'});
    const qb = new QueryBuilder(initialModelQuery, query as Record<string, string>);

    const docs = await qb
      .search(['notes'])
      .filter() // This applies any remaining general filters from the URL query
      .sort()
      .paginate()
      .fields()
      .build();

    // 5. --- Get Metadata ---
    const meta = await qb.getMeta();
    return { data: docs, meta };
  },

  cancelBooking: async (id: string) => {

    const booking = await Booking.findById(id);
    if (!booking) throw new Error('Booking not found');
    return Booking

    
  }

};