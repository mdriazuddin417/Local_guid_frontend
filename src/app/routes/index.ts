import { Router } from "express"
import { AuthRoutes } from "../modules/auth/auth.route"
import { BookingRoutes } from "../modules/booking/booking.routes"
import { ListingRoutes } from "../modules/listing/listing.routes"
import { PaymentRoutes } from "../modules/payment/payment.route"
import { ReviewRoutes } from "../modules/review/review.routes"
import { StatsRoutes } from "../modules/stats/stats.route"
import { TourTypeRoutes } from "../modules/tourType/tourType.routes"
import { UserRoutes } from "../modules/user/user.route"

export const router = Router()

const moduleRoutes = [
    {
        path: "/user",
        route: UserRoutes
    },
    {
        path: "/auth",
        route: AuthRoutes
    },
    {
        path: "/tour-type",
        route: TourTypeRoutes
    },
    {
        path: "/listing",
        route: ListingRoutes
    },
    {
        path: "/booking",
        route: BookingRoutes
    },
    {
        path: "/payment",
        route: PaymentRoutes
    },
    {
        path: "/review",
        route: ReviewRoutes
    },
    // {
    //     path: "/otp",
    //     route: OtpRoutes
    // },
    {
        path: "/stats",
        route: StatsRoutes
    },

]

moduleRoutes.forEach((route) => {
    router.use(route.path, route.route)
})


// router.use('/auth', authRoutes);
// router.use('/users', userRoutes);
// router.use('/listings', listingRoutes);
// router.use('/bookings', bookingRoutes);
// router.use('/reviews', reviewRoutes);
// router.use('/payments', paymentRoutes);
// router.use('/tour-types', tourTypeRoutes);

