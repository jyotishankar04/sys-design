import { Router } from "express";
import healthRoutes from "../modules/health/health.route";
import shortensRoutes from "../modules/shorten/shorten.route";

const router = Router();

router.use("/health", healthRoutes);

router.use("/shorten", shortensRoutes);

export default router;
