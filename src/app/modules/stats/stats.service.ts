/* eslint-disable @typescript-eslint/no-explicit-any */
import { Booking } from "../booking/booking.modal";
import { TourListing } from "../listing/listing.model";
import { PAYMENT_STATUS } from "../payment/payment.interface";
import { Payment } from "../payment/payment.model";
import { IsActive } from "../user/user.interface";
import { User } from "../user/user.model";

const now = new Date();
const sevenDaysAgo = new Date(now).setDate(now.getDate() - 7);
const thirtyDaysAgo = new Date(now).setDate(now.getDate() - 30);

const getUserStats = async () => {
    const totalUsersPromise = User.countDocuments()

    const totalActiveUsersPromise = User.countDocuments({ isActive: IsActive.ACTIVE })
    const totalInActiveUsersPromise = User.countDocuments({ isActive: IsActive.INACTIVE })
    const totalBlockedUsersPromise = User.countDocuments({ isActive: IsActive.BLOCKED })

    const newUsersInLast7DaysPromise = User.countDocuments({
        createdAt: { $gte: sevenDaysAgo }
    })
    const newUsersInLast30DaysPromise = User.countDocuments({
        createdAt: { $gte: thirtyDaysAgo }
    })

    const usersByRolePromise = User.aggregate([
        //stage -1 : Grouping users by role and count total users in each role

        {
            $group: {
                _id: "$role",
                count: { $sum: 1 }
            }
        }
    ])


    const [totalUsers, totalActiveUsers, totalInActiveUsers, totalBlockedUsers, newUsersInLast7Days, newUsersInLast30Days, usersByRole] = await Promise.all([
        totalUsersPromise,
        totalActiveUsersPromise,
        totalInActiveUsersPromise,
        totalBlockedUsersPromise,
        newUsersInLast7DaysPromise,
        newUsersInLast30DaysPromise,
        usersByRolePromise
    ])
    return {
        totalUsers,
        totalActiveUsers,
        totalInActiveUsers,
        totalBlockedUsers,
        newUsersInLast7Days,
        newUsersInLast30Days,
        usersByRole
    }
}

const getTourStats = async () => {
    // 1. Total number of tours
    const totalTourPromise = TourListing.countDocuments();

    // 2. Total tours by category
    const totalTourByCategoryPromise = TourListing.aggregate([
        {
            $group: {
                _id: "$category",
                count: { $sum: 1 }
            }
        }
    ]);

    // 3. Average tour price
    const avgTourPricePromise = TourListing.aggregate([
        {
            $group: {
                _id: null,
                avgPrice: { $avg: "$price" }
            }
        }
    ]);

    // 4. Tours by country
    const totalTourByCountryPromise = TourListing.aggregate([
        {
            $group: {
                _id: "$country",
                count: { $sum: 1 }
            }
        }
    ]);

    // 5. Tours by city
    const totalTourByCityPromise = TourListing.aggregate([
        {
            $group: {
                _id: "$city",
                count: { $sum: 1 }
            }
        }
    ]);

    // 6. Highest booked tours (top 5)
    const totalHighestBookedTourPromise = Booking.aggregate([
        {
            $group: {
                _id: "$tourListingId",
                bookingCount: { $sum: 1 }
            }
        },
        { $sort: { bookingCount: -1 } },
        { $limit: 5 },

        {
            $lookup: {
                from: "tourlistings", // << Correct collection
                localField: "_id",
                foreignField: "_id",
                as: "tour"
            }
        },
        { $unwind: "$tour" },

        {
            $project: {
                bookingCount: 1,
                "tour.title": 1,
                "tour.price": 1,
                "tour.city": 1
            }
        }
    ]);

    // Run all in parallel
    const [
        totalTour,
        totalTourByCategory,
        avgTourPrice,
        totalTourByCountry,
        totalTourByCity,
        totalHighestBookedTour
    ] = await Promise.all([
        totalTourPromise,
        totalTourByCategoryPromise,
        avgTourPricePromise,
        totalTourByCountryPromise,
        totalTourByCityPromise,
        totalHighestBookedTourPromise
    ]);

    return {
        totalTour,
        totalTourByCategory,
        avgTourPrice: avgTourPrice?.[0]?.avgPrice || 0,
        totalTourByCountry,
        totalTourByCity,
        totalHighestBookedTour
    };
};

const getBookingStats = async () => {
    const totalBookingPromise = Booking.countDocuments()

    const totalBookingByStatusPromise = Booking.aggregate([
        //stage-1 group stage
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 }
            }
        }
    ])

    const bookingsPerTourPromise = Booking.aggregate([
        //stage1 group stage

        {
            $group: {
                _id: "$tour",
                bookingCount: { $sum: 1 }
            }
        },

        //stage-2 sort stage
        {
            $sort: { bookingCount: -1 }
        },

        //stage-3 limit stage
        {
            $limit: 10
        },

        //stage-4 lookup stage
        {
            $lookup: {
                from: "tours",
                localField: "_id",
                foreignField: "_id",
                as: "tour"
            }
        },

        // stage5 - unwind stage
        {
            $unwind: "$tour"
        },

        // stage6 project stage

        {
            $project: {
                bookingCount: 1,
                _id: 1,
                "tour.title": 1,
                "tour.slug": 1
            }
        }
    ])

    const avgGuestCountPerBookingPromise = Booking.aggregate([
        // stage 1  - group stage
        {
            $group: {
                _id: null,
                avgGuestCount: { $avg: "$guestCount" }
            }
        }
    ])

    const bookingsLast7DaysPromise = Booking.countDocuments({
        createdAt: { $gte: sevenDaysAgo }
    })
    const bookingsLast30DaysPromise = Booking.countDocuments({
        createdAt: { $gte: thirtyDaysAgo }
    })

    const totalBookingByUniqueUsersPromise = Booking.distinct("user").then((user: any) => user.length)

    const [totalBooking, totalBookingByStatus, bookingsPerTour, avgGuestCountPerBooking, bookingsLast7Days, bookingsLast30Days, totalBookingByUniqueUsers] = await Promise.all([
        totalBookingPromise,
        totalBookingByStatusPromise,
        bookingsPerTourPromise,
        avgGuestCountPerBookingPromise,
        bookingsLast7DaysPromise,
        bookingsLast30DaysPromise,
        totalBookingByStatusPromise,
        totalBookingByUniqueUsersPromise
    ])

    return { totalBooking, totalBookingByStatus, bookingsPerTour, avgGuestCountPerBooking: avgGuestCountPerBooking[0].avgGuestCount, bookingsLast7Days, bookingsLast30Days, totalBookingByUniqueUsers }
}

const getPaymentStats = async () => {

    const totalPaymentPromise = Payment.countDocuments();

    const totalPaymentByStatusPromise = Payment.aggregate([
        //stage 1 group
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 }
            }
        }
    ])

    const totalRevenuePromise = Payment.aggregate([
        //stage1 match stage
        {
            $match: { status: PAYMENT_STATUS.PAID }
        },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: "$amount" }
            }
        }
    ])

    const avgPaymentAmountPromise = Payment.aggregate([
        //stage 1 group stage
        {
            $group: {
                _id: null,
                avgPaymentAMount: { $avg: "$amount" }
            }
        }
    ])

    const paymentGatewayDataPromise = Payment.aggregate([
        //stage 1 group stage
        {
            $group: {
                _id: { $ifNull: ["$paymentGatewayData.status", "UNKNOWN"] },
                count: { $sum: 1 }
            }
        }
    ])



    const [totalPayment, totalPaymentByStatus, totalRevenue, avgPaymentAmount, paymentGatewayData] = await Promise.all([
        totalPaymentPromise,
        totalPaymentByStatusPromise,
        totalRevenuePromise,
        avgPaymentAmountPromise,
        paymentGatewayDataPromise

    ])
    return { totalPayment, totalPaymentByStatus, totalRevenue, avgPaymentAmount, paymentGatewayData }
}


export const StatsService = {
    getBookingStats,
    getPaymentStats,
    getTourStats,
    getUserStats
}
