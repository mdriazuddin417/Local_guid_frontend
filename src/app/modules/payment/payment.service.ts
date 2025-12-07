/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from "http-status-codes";
import { uploadBufferToCloudinary } from "../../config/cloudinary.config";
import AppError from "../../errorHelpers/AppError";
import { generatePdf, IInvoiceData } from "../../utils/invoice";
import QueryBuilder from "../../utils/QueryBuilder_chat";
import { sendEmail } from "../../utils/sendEmail";
import { Booking, BookingStatus } from "../booking/booking.modal";
import { ITourListing } from "../listing/listing.model";
import { ISSLCommerz } from "../sslCommerz/sslCommerz.interface";
import { SSLService } from "../sslCommerz/sslCommerz.service";
import { IUser } from "../user/user.interface";
import { PAYMENT_STATUS } from "./payment.interface";
import { Payment } from "./payment.model";



const initPayment = async (bookingId: string) => {
    const payment = await Payment.findOne({ booking: bookingId })
    if (!payment) {
        throw new AppError(httpStatus.NOT_FOUND, "Payment Not Found. You have not booked this tour")
    }
    const booking = await Booking.findById(payment.booking)

    const userAddress = (booking?.touristId as any).address
    const userEmail = (booking?.touristId as any).email
    const userPhoneNumber = (booking?.touristId as any).phone
    const userName = (booking?.touristId as any).name

    const sslPayload: ISSLCommerz = {
        address: userAddress,
        email: userEmail,
        phoneNumber: userPhoneNumber,
        name: userName,
        amount: payment.amount,
        transactionId: payment.transactionId
    }

    const sslPayment = await SSLService.sslPaymentInit(sslPayload)

    return {
        paymentUrl: sslPayment.GatewayPageURL
    }

};
const successPayment = async (query: Record<string, string>) => {

    // Update Booking Status to COnfirm 
    // Update Payment Status to PAID

    const session = await Booking.startSession();
    session.startTransaction()

    try {


        const updatedPayment = await Payment.findOneAndUpdate({ transactionId: query.transactionId }, {
            status: PAYMENT_STATUS.PAID,
        }, { new: true, runValidators: true, session: session })

        if (!updatedPayment) {
            throw new AppError(401, "Payment not found")
        }

        const updatedBooking = await Booking
            .findByIdAndUpdate(
                updatedPayment?.booking,
                { status: BookingStatus.COMPLETED },
                { new: true, runValidators: true, session }
            )
            .populate("tourListingId", "title")
            .populate("touristId", "name email")

        if (!updatedBooking) {
            throw new AppError(401, "Booking not found")
        }

        const invoiceData: IInvoiceData = {
            bookingDate: updatedBooking.createdAt as Date,
            guestCount: updatedBooking.groupSize,
            totalAmount: updatedPayment.amount,
            tourTitle: (updatedBooking.tourListingId as unknown as ITourListing).title,
            transactionId: updatedPayment.transactionId,
            userName: (updatedBooking.touristId as unknown as IUser).name
        }

        const pdfBuffer = await generatePdf(invoiceData)

        const cloudinaryResult = await uploadBufferToCloudinary(pdfBuffer, "invoice")

        if (!cloudinaryResult) {
            throw new AppError(401, "Error uploading pdf")
        }

        await Payment.findByIdAndUpdate(updatedPayment._id, { invoiceUrl: cloudinaryResult.secure_url }, { runValidators: true, session })
        const email = 'mdriazuddin417@gmail.com' //(updatedBooking.touristId as unknown as IUser).email
        if (email) {
            await sendEmail({
                to: email,
                subject: "Your Booking Invoice",
                templateName: "invoice",
                templateData: invoiceData,
                attachments: [
                    {
                        filename: "invoice.pdf",
                        content: pdfBuffer,
                        contentType: "application/pdf"
                    }
                ]
            })
        }


        await session.commitTransaction(); //transaction
        session.endSession()
        return { success: true, message: "Payment Completed Successfully" }
    } catch (error) {
        await session.abortTransaction(); // rollback
        session.endSession()
        // throw new AppError(httpStatus.BAD_REQUEST, error) ❌❌
        throw error
    }
};
const failPayment = async (query: Record<string, string>) => {

    // Update Booking Status to FAIL
    // Update Payment Status to FAIL

    const session = await Booking.startSession();
    session.startTransaction()

    try {


        const updatedPayment = await Payment.findOneAndUpdate({ transactionId: query.transactionId }, {
            status: PAYMENT_STATUS.FAILED,
        }, { new: true, runValidators: true, session: session })

        await Booking
            .findByIdAndUpdate(
                updatedPayment?.booking,
                { status: BookingStatus.FAILED },
                { runValidators: true, session }
            )

        await session.commitTransaction(); //transaction
        session.endSession()
        return { success: false, message: "Payment Failed" }
    } catch (error) {
        await session.abortTransaction(); // rollback
        session.endSession()
        // throw new AppError(httpStatus.BAD_REQUEST, error) ❌❌
        throw error
    }
};
const cancelPayment = async (query: Record<string, string>) => {

    // Update Booking Status to CANCEL
    // Update Payment Status to CANCEL

    const session = await Booking.startSession();
    session.startTransaction()

    try {
        const updatedPayment = await Payment.findOneAndUpdate({ transactionId: query.transactionId }, {
            status: PAYMENT_STATUS.CANCELLED,
        }, { runValidators: true, session: session })

        await Booking
            .findByIdAndUpdate(
                updatedPayment?.booking,
                { status: BookingStatus.CANCELLED },
                { runValidators: true, session }
            )

        await session.commitTransaction(); //transaction
        session.endSession()
        return { success: false, message: "Payment Cancelled" }
    } catch (error) {
        await session.abortTransaction(); // rollback
        session.endSession()
        // throw new AppError(httpStatus.BAD_REQUEST, error) ❌❌
        throw error
    }
};

const getInvoiceDownloadUrl = async (paymentId: string) => {
    const payment = await Payment.findById(paymentId)
        .select("invoiceUrl")

    if (!payment) {
        throw new AppError(401, "Payment not found")
    }

    if (!payment.invoiceUrl) {
        throw new AppError(401, "No invoice found")
    }

    return payment.invoiceUrl
};
// const getAllPayments = async () => {
//     const payments = await Payment.find()
//         .populate({
//             path: "booking",
//             populate: {
//                 path: "tourListingId",
//                 populate: {
//                     path: "division",
//                     populate: {
//                         path: "tourType"
//                     }
//                 }
//             }
//         })
//         .populate("touristId", "name email")
//         .populate("guideId", "name email")

//     return payments
// }

 const getAllPayments = async (query: Record<string, string>) => {
       const qb = new QueryBuilder(Payment.find(), query);

        const listings = await qb.search(['booking',"touristId","guideId"])
            .filter()
            .sort()
            .fields()
            .paginate();

        const [data, meta] = await Promise.all([listings.build(), qb.getMeta()]);

        return { data, meta };
    };

const getPaymentById = async (id: string) => {
    const payment = await Payment.findById(id);
    if (!payment) {
        throw new AppError(404, "Payment not found");
    }
    return payment;
};


export const PaymentService = {
    initPayment,
    successPayment,
    failPayment,
    cancelPayment,
    getInvoiceDownloadUrl,
    getAllPayments,
    getPaymentById
};
