import { z } from "zod";

export const createOrderSchema = z.object({
    loanId: z.string({ required_error: "Loan ID is required" }).trim().min(1, "Loan ID cannot be empty"),
});

export const verifyPaymentSchema = z.object({
    razorpay_order_id: z.string({ required_error: "Razorpay order ID is required" }).trim().min(1),
    razorpay_payment_id: z.string({ required_error: "Razorpay payment ID is required" }).trim().min(1),
    razorpay_signature: z.string({ required_error: "Razorpay signature is required" }).trim().min(1),
    loanId: z.string({ required_error: "Loan ID is required" }).trim().min(1),
});
