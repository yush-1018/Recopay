import express from "express";
import { createOrder, verifyPayment, webhookListener } from "../controllers/payment.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Create a Razorpay order for EMI payment (authenticated)
router.post("/order", protect, createOrder);

// Verify Razorpay payment signature and apply EMI (authenticated)
router.post("/verify", protect, verifyPayment);

// Razorpay webhook - no JWT auth, verified by Razorpay signature
router.post("/webhook", webhookListener);

export default router;
