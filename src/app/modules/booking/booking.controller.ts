import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { IUser } from '../user/user.interface';
import { BookingService } from './booking.service';


export const BookingController = {
  createBooking: catchAsync(async (req: Request, res: Response) => {
    const payload = { ...req.body };
    const data = await BookingService.createBooking(payload);
    return sendResponse(res, { statusCode: 201, success: true, message: 'Booking created', data });
  }),

  updateBooking: catchAsync(async (req: Request, res: Response) => {
    const data = await BookingService.updateBooking(req.params.id, req.body, (req as unknown as { user: IUser }).user as IUser);
    return sendResponse(res, { statusCode: 200, success: true, message: 'Booking updated', data });
  }),

  getBookingById: catchAsync(async (req: Request, res: Response) => {
    const data = await BookingService.getBookingById(req.params.id);
    return sendResponse(res, { statusCode: 200, success: true, message: 'Booking', data });
  }),

  getBookings: catchAsync(async (req: Request, res: Response) => {
    const data = await BookingService.getBookings(req.query as unknown as Record<string, string>, (req as unknown as { user: IUser }).user as IUser);

    return sendResponse(res, { statusCode: 200, success: true, message: 'Bookings', data: data });
  }),

  cancelBooking: catchAsync(async (req: Request, res: Response) => {
    const data = await BookingService.cancelBooking(req.params.id);
    return sendResponse(res, { statusCode: 200, success: true, message: 'Booking cancelled', data });
  })
};