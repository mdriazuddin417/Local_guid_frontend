import { Router } from 'express';
import { checkAuth } from '../../middlewares/checkAuth';
import { validateRequest } from '../../middlewares/validateRequest';
import { Role } from '../user/user.interface';
import { BookingController } from './booking.controller';
import { createBookingSchema } from './booking.validation';


const router = Router();

router.post('/create', checkAuth(Role.TOURIST, Role.ADMIN), validateRequest(createBookingSchema), BookingController.createBooking);
router.patch('/:id', BookingController.updateBooking);
router.get('/:id',  BookingController.getBookingById);
router.delete('/:id', BookingController.cancelBooking);
router.get('/',  BookingController.getBookings);

export const BookingRoutes = router;