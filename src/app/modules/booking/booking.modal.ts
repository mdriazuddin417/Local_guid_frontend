// src/models/Booking.ts
import { Document, Schema, Types, model } from "mongoose";

export enum BookingStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  FAILED = "FAILED"
}

export interface IBooking extends Document {
  touristId: Types.ObjectId;
  guideId: Types.ObjectId;
  tourListingId: Types.ObjectId;
  status: BookingStatus;
  requestedDate: Date;
  groupSize: number;
  totalPrice: number;
  notes?: string;
  paymentId?: Types.ObjectId;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>({
  touristId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  guideId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tourListingId: { type: Schema.Types.ObjectId, ref: "TourListing", required: true },
  status: { type: String, enum: Object.values(BookingStatus), default: BookingStatus.PENDING },
  requestedDate: { type: Date, required: true },
  groupSize: { type: Number, default: 1 },
  totalPrice: { type: Number, required: true },
  notes: String,
  paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
  completedAt: Date
}, { timestamps: true });

export const Booking = model<IBooking>("Booking", BookingSchema);
