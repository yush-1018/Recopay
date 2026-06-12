import express from "express";
import { createOrder, verifyPayment, webhookListener } from "../controllers/payment.controller.js";
import { protect } from "../middleware/authMiddleware.js";
import validate from "../middleware/validate.js";
import { createOrderSchema, verifyPaymentSchema } from "../validators/payment.validator.js";
import { paymentLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.use("/order", paymentLimiter);
router.use("/verify", paymentLimiter);

// Create a Razorpay order for EMI payment (authenticated)
router.post("/order", protect, validate(createOrderSchema), createOrder);

// Verify Razorpay payment signature and apply EMI (authenticated)
router.post("/verify", protect, validate(verifyPaymentSchema), verifyPayment);

// Razorpay webhook - no JWT auth, verified by Razorpay signature
router.post("/webhook", webhookListener);

export default router;
