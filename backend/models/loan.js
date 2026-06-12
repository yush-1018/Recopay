import mongoose from "mongoose";

// Sub-schema for individual repayment installments
const installmentSchema = new mongoose.Schema({
    installmentNo: { type: Number, required: true },
    dueDate:       { type: Date, required: true },
    amount:        { type: Number, required: true },
    status:        { type: String, enum: ["Pending", "Paid", "Overdue"], default: "Pending" },
    paidDate:      { type: Date, default: null }
}, { _id: false });

const loanSchema = new mongoose.Schema({
    userEmail: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 1
    },
    duration: {
        type: Number,
        default: 12,
        min: 1
    },
    purpose: {
        type: String,
        default: ""
    },

    // ── NEW: Interest & EMI ──────────────────────────────────────────
    interestRate: {
        type: Number,
        default: 12,       // annual %, e.g. 12 means 12% p.a.
        min: 0
    },
    emiAmount: {
        type: Number,
        default: 0         // pre-computed on creation
    },

    // ── NEW: Repayment Schedule ──────────────────────────────────────
    repaymentSchedule: {
        type: [installmentSchema],
        default: []
    },
    nextDueDate: {
        type: Date,
        default: null
    },

    // ── Payment tracking ─────────────────────────────────────────────
    paid: {
        type: Number,
        default: 0
    },

    // ── NEW: Approval Workflow ────────────────────────────────────────
    // Pending → Approved → Active → Completed | Cancelled | Rejected
    status: {
        type: String,
        enum: ["Pending", "Approved", "Active", "Completed", "Cancelled", "Rejected"],
        default: "Pending"
    },
    disbursedAt: {
        type: Date,
        default: null
    },

    lastPaymentId: {
        type: String,
        default: null
    }
}, { timestamps: true });

loanSchema.index({ userEmail: 1 });

export default mongoose.model("Loan", loanSchema);