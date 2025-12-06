import { z } from 'zod';

export const createBookingSchema = z.object({
  tourListingId: z.string().min(1), // this is the id of the tour listing that the tourist is booking
  requestedDate: z.string(),
  groupSize: z.number().min(1),
  notes: z.string().optional(),
  guideId: z.string().min(1),
  touristId: z.string(),
});