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

// ─────────────────────────────────────────────────────────────────────────────
// SHARED: Apply EMI to loan
// Single source of truth for EMI application — used by both verifyPayment
// and webhookListener. Fixes Issue #13 (inconsistent payment flows).
// ─────────────────────────────────────────────────────────────────────────────
async function applyEMI(loan, paymentId) {
    // Use stored EMI; fall back to flat division for legacy loans
    const emi = loan.emiAmount > 0
        ? loan.emiAmount
        : Math.ceil(loan.amount / (loan.duration || 12));

    // Mark the first pending installment as Paid (if schedule exists)
    if (loan.repaymentSchedule?.length > 0) {
        const pendingIdx = loan.repaymentSchedule.findIndex(i => i.status === "Pending");
        if (pendingIdx !== -1) {
            loan.repaymentSchedule[pendingIdx].status  = "Paid";
            loan.repaymentSchedule[pendingIdx].paidDate = new Date();
        }

        // Advance nextDueDate
        const nextPending = loan.repaymentSchedule.find(i => i.status === "Pending");
        loan.nextDueDate = nextPending?.dueDate || null;
        loan.markModified("repaymentSchedule");
    }

    // Update paid amount and overall status
    let newPaid = (loan.paid || 0) + emi;
    if (newPaid >= loan.amount) newPaid = loan.amount;

    loan.paid   = newPaid;
    loan.status = newPaid >= loan.amount ? "Completed" : "Active";
    loan.lastPaymentId = paymentId;
    await loan.save();

    // Record transaction
    await Transaction.create({
        userEmail: loan.userEmail,
        type:      loan.type,
        amount:    emi,
        status:    "Success",
        category:  "EMI Payment"
    });

    return { emi, newPaid };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/order
// Creates a Razorpay order for an EMI payment
// ─────────────────────────────────────────────────────────────────────────────
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

        if (loan.status !== "Active") {
            return res.status(400).json({ message: "Only Active loans can receive EMI payments" });
        }

        if ((loan.paid || 0) >= loan.amount) {
            return res.status(400).json({ message: "Loan is already fully paid" });
        }

        // Use stored EMI amount (with interest); fall back for legacy loans
        const emi = loan.emiAmount > 0
            ? loan.emiAmount
            : Math.ceil(loan.amount / (loan.duration || 12));

        const razorpay = getRazorpayInstance();
        const order = await razorpay.orders.create({
            amount: emi * 100, // Razorpay expects amount in paise (INR cents)
            currency: "INR",
            receipt: `receipt_loan_${loanId}_${Date.now()}`,
            notes: {
                loanId:    loanId,
                userEmail: loan.userEmail,
                emi:       emi
            }
        });

        res.status(200).json({
            orderId:  order.id,
            amount:   order.amount,
            currency: order.currency,
            keyId:    process.env.RAZORPAY_KEY_ID,
            loanType: loan.type,
            emi
        });

    } catch (error) {
        console.error("createOrder error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/verify
// Verifies Razorpay signature, then applies EMI via shared applyEMI()
// ─────────────────────────────────────────────────────────────────────────────
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

        // Signature valid — apply the EMI using shared logic
        const loan = await Loan.findById(loanId);
        if (!loan) {
            return res.status(404).json({ message: "Loan not found" });
        }

        const { emi, newPaid } = await applyEMI(loan, razorpay_payment_id);

        res.status(200).json({ message: "Payment verified and EMI applied", loan, emi, newPaid });

    } catch (error) {
        console.error("verifyPayment error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/webhook
// Razorpay webhook listener — fallback for async payment events
// Also uses shared applyEMI() to avoid duplication (Issue #13 fix)
// ─────────────────────────────────────────────────────────────────────────────
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
            const loanId   = paymentEntity.notes?.loanId;
            const paymentId = paymentEntity.id;

            if (loanId) {
                const loan = await Loan.findById(loanId);
                // Only apply if not already processed by the verify route
                if (loan && loan.lastPaymentId !== paymentId) {
                    await applyEMI(loan, paymentId);
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
