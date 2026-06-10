import Razorpay from "razorpay";
import crypto from "crypto";
import Loan from "../models/loan.js";
import Transaction from "../models/transaction.js";

const getRazorpayInstance = () => {
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_SECRET,
    });
};

// POST /api/payments/order
// Creates a Razorpay order for an EMI payment
export const createOrder = async (req, res) => {
    try {
        const { loanId } = req.body;

        if (!loanId) {
            return res.status(400).json({ message: "loanId is required" });
        }

        const loan = await Loan.findById(loanId);
        if (!loan) {
            return res.status(404).json({ message: "Loan not found" });
        }

        if ((loan.paid || 0) >= loan.amount) {
            return res.status(400).json({ message: "Loan is already fully paid" });
        }

        const emi = Math.ceil(loan.amount / (loan.duration || 12));

        const razorpay = getRazorpayInstance();
        const order = await razorpay.orders.create({
            amount: emi * 100, // Razorpay expects amount in paise (INR cents)
            currency: "INR",
            receipt: `receipt_loan_${loanId}_${Date.now()}`,
            notes: {
                loanId: loanId,
                userEmail: loan.userEmail,
                emi: emi
            }
        });

        res.status(200).json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
            loanType: loan.type,
            emi
        });

    } catch (error) {
        console.error("createOrder error:", error);
        res.status(500).json({ message: error.message });
    }
};

// POST /api/payments/verify
// Verifies Razorpay signature, then applies EMI to the loan record
export const verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            loanId
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !loanId) {
            return res.status(400).json({ message: "Missing payment verification fields" });
        }

        // Cryptographic signature verification
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ message: "Payment signature verification failed" });
        }

        // Signature valid — apply the EMI to the loan
        const loan = await Loan.findById(loanId);
        if (!loan) {
            return res.status(404).json({ message: "Loan not found" });
        }

        const emi = Math.ceil(loan.amount / (loan.duration || 12));
        let newPaid = (loan.paid || 0) + emi;
        if (newPaid >= loan.amount) {
            newPaid = loan.amount;
        }

        loan.paid = newPaid;
        loan.status = newPaid >= loan.amount ? "Completed" : "Active";
        loan.lastPaymentId = razorpay_payment_id;
        await loan.save();

        // Record the transaction
        await Transaction.create({
            userEmail: loan.userEmail,
            type: loan.type,
            amount: emi,
            status: "Success",
            category: "EMI Payment"
        });

        res.status(200).json({ message: "Payment verified and EMI applied", loan });

    } catch (error) {
        console.error("verifyPayment error:", error);
        res.status(500).json({ message: error.message });
    }
};

// POST /api/payments/webhook
// Razorpay webhook listener for async payment events (fallback)
export const webhookListener = async (req, res) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        const signature = req.headers["x-razorpay-signature"];

        if (webhookSecret && signature) {
            const expectedSignature = crypto
                .createHmac("sha256", webhookSecret)
                .update(JSON.stringify(req.body))
                .digest("hex");

            if (expectedSignature !== signature) {
                return res.status(400).json({ message: "Invalid webhook signature" });
            }
        }

        const event = req.body.event;
        const paymentEntity = req.body.payload?.payment?.entity;

        if (event === "payment.captured" && paymentEntity) {
            const loanId = paymentEntity.notes?.loanId;
            const paymentId = paymentEntity.id;

            if (loanId) {
                const loan = await Loan.findById(loanId);
                // Only apply if not already processed by the verify route
                if (loan && loan.lastPaymentId !== paymentId) {
                    const emi = Math.ceil(loan.amount / (loan.duration || 12));
                    let newPaid = (loan.paid || 0) + emi;
                    if (newPaid >= loan.amount) newPaid = loan.amount;

                    loan.paid = newPaid;
                    loan.status = newPaid >= loan.amount ? "Completed" : "Active";
                    loan.lastPaymentId = paymentId;
                    await loan.save();

                    await Transaction.create({
                        userEmail: loan.userEmail,
                        type: loan.type,
                        amount: emi,
                        status: "Success",
                        category: "EMI Payment"
                    });

                    console.log(`Webhook: EMI applied to loan ${loanId} via payment ${paymentId}`);
                }
            }
        }

        res.status(200).json({ received: true });

    } catch (error) {
        console.error("webhookListener error:", error);
        res.status(500).json({ message: error.message });
    }
};
