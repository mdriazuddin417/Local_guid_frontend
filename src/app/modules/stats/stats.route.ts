import express from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";
import { StatsController } from "./stats.controller";

const router = express.Router();

router.get(
    "/booking",
    checkAuth(Role.ADMIN),
    StatsController.getBookingStats
);
router.get(
    "/payment",
    checkAuth(Role.ADMIN),
    StatsController.getPaymentStats
);
router.get(
    "/user",
    checkAuth(Role.ADMIN),
    StatsController.getUserStats
);
router.get(
    "/listing",
    checkAuth(Role.ADMIN),
    StatsController.getTourStats
);

export const StatsRoutes = router;
