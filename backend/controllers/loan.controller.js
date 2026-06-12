import Loan from "../models/loan.js";
import Transaction from "../models/transaction.js";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Default annual interest rates (%) by loan type */
const INTEREST_RATES = {
    Personal:  12,
    Education:  9,
    Business:  14,
    Housing:    8.5,
    Vehicle:   10.5,
};

/**
 * Reducing-Balance EMI Formula:
 *   r = annualRate / 12 / 100
 *   EMI = P * r * (1+r)^n / ((1+r)^n - 1)
 * Falls back to flat division when r = 0.
 */
function calcEMI(principal, annualRate, months) {
    const r = annualRate / 12 / 100;
    if (r === 0) return Math.ceil(principal / months);
    const factor = Math.pow(1 + r, months);
    return Math.ceil((principal * r * factor) / (factor - 1));
}

/**
 * Generate a full repayment schedule starting from the 1st of next month.
 * Returns array of installment objects.
 */
function generateSchedule(principal, emi, months) {
    const schedule = [];
    const start = new Date();
    start.setDate(1);                       // normalise to 1st
    start.setMonth(start.getMonth() + 1);   // start next month
    start.setHours(0, 0, 0, 0);

    for (let i = 0; i < months; i++) {
        const due = new Date(start);
        due.setMonth(start.getMonth() + i);
        // Last installment may differ due to rounding
        const amount = (i === months - 1)
            ? Math.max(0, principal - emi * (months - 1))
            : emi;
        schedule.push({
            installmentNo: i + 1,
            dueDate:       due,
            amount,
            status:        "Pending",
            paidDate:      null
        });
    }
    return schedule;
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE LOAN
// ─────────────────────────────────────────────────────────────────────────────
export const createLoan = async (req, res) => {
    try {
        const { type, amount, duration, purpose, userEmail } = req.body;

        const principal    = Number(amount);
        const months       = Number(duration) || 12;
        const interestRate = INTEREST_RATES[type] ?? 12;
        const emiAmount    = calcEMI(principal, interestRate, months);
        const schedule     = generateSchedule(principal, emiAmount, months);

        const loan = await Loan.create({
            userEmail,
            type,
            amount:             principal,
            duration:           months,
            purpose:            purpose || "",
            interestRate,
            emiAmount,
            repaymentSchedule:  schedule,
            nextDueDate:        schedule[0]?.dueDate || null,
            paid:               0,
            status:             "Pending"       // awaits approval
        });

        // No disbursement transaction yet — created on Approve/Disburse
        res.status(201).json(loan);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET LOANS (filtered by userEmail)
// ─────────────────────────────────────────────────────────────────────────────
export const getLoans = async (req, res) => {
    try {
        const { email, page = 1, limit = 1000 } = req.query;
        const filter = email ? { userEmail: email } : {};
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const total = await Loan.countDocuments(filter);
        const loans = await Loan.find(filter)
                                .sort({ createdAt: -1 })
                                .skip(skip)
                                .limit(limitNum);

        res.status(200).json({
            data: loans,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// APPROVE LOAN  (Pending → Approved)
// ─────────────────────────────────────────────────────────────────────────────
export const approveLoan = async (req, res) => {
    try {
        const { id } = req.params;
        const loan = await Loan.findById(id);

        if (!loan) return res.status(404).json({ message: "Loan not found" });
        if (loan.status !== "Pending") {
            return res.status(400).json({ message: `Loan cannot be approved from status: ${loan.status}` });
        }

        loan.status = "Approved";
        await loan.save();

        // Send mock notification
        console.log(`[NOTIFICATION]: Loan ${id} for ${loan.userEmail} has been APPROVED.`);

        res.status(200).json(loan);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// REJECT LOAN  (Pending → Rejected)
// ─────────────────────────────────────────────────────────────────────────────
export const rejectLoan = async (req, res) => {
    try {
        const { id } = req.params;
        const loan = await Loan.findById(id);

        if (!loan) return res.status(404).json({ message: "Loan not found" });
        if (loan.status !== "Pending") {
            return res.status(400).json({ message: `Loan cannot be rejected from status: ${loan.status}` });
        }

        loan.status = "Rejected";
        await loan.save();

        // Send mock notification
        console.log(`[NOTIFICATION]: Loan ${id} for ${loan.userEmail} has been REJECTED.`);

        res.status(200).json(loan);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DISBURSE LOAN  (Approved → Active)
// Simulates fund disbursement; creates a "Loan Disbursed" transaction.
// ─────────────────────────────────────────────────────────────────────────────
export const disburseLoan = async (req, res) => {
    try {
        const { id } = req.params;
        const loan = await Loan.findById(id);

        if (!loan) return res.status(404).json({ message: "Loan not found" });
        if (loan.status !== "Approved") {
            return res.status(400).json({ message: `Loan cannot be disbursed from status: ${loan.status}` });
        }

        loan.status = "Active";
        loan.disbursedAt = new Date();
        await loan.save();

        // Create disbursement transaction record
        await Transaction.create({
            userEmail: loan.userEmail,
            type:      "Disbursement",
            amount:    loan.amount,
            status:    "Success",
            category:  "Disbursement"
        });

        res.status(200).json(loan);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PAY EMI  (PATCH /:id)
// Uses stored emiAmount; marks the next pending installment as Paid.
// ─────────────────────────────────────────────────────────────────────────────
export const updateLoan = async (req, res) => {
    try {
        const { id } = req.params;
        const loan = await Loan.findById(id);

        if (!loan) return res.status(404).json({ message: "Loan not found" });
        if (loan.status !== "Active") {
            return res.status(400).json({ message: "Only Active loans can receive EMI payments" });
        }

        // Use stored EMI; fall back to flat division for legacy loans
        const emi = loan.emiAmount > 0
            ? loan.emiAmount
            : Math.ceil(loan.amount / (loan.duration || 12));

        // Mark the first pending installment as Paid
        const pendingIdx = loan.repaymentSchedule.findIndex(i => i.status === "Pending");
        if (pendingIdx !== -1) {
            loan.repaymentSchedule[pendingIdx].status  = "Paid";
            loan.repaymentSchedule[pendingIdx].paidDate = new Date();
        }

        // Advance nextDueDate to the next pending installment
        const nextPending = loan.repaymentSchedule.find(i => i.status === "Pending");
        loan.nextDueDate = nextPending?.dueDate || null;

        // Update paid amount and overall status
        let newPaid = (loan.paid || 0) + emi;
        if (newPaid >= loan.amount) {
            newPaid = loan.amount;
            loan.status = "Completed";
        }
        loan.paid = newPaid;
        loan.markModified("repaymentSchedule");
        await loan.save();

        // Create EMI payment transaction
        await Transaction.create({
            userEmail: loan.userEmail,
            type:      loan.type,
            amount:    emi,
            status:    "Success",
            category:  "EMI Payment"
        });

        res.status(200).json(loan);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE LOAN
// ─────────────────────────────────────────────────────────────────────────────
export const deleteLoan = async (req, res) => {
    try {
        const { id } = req.params;
        const loan = await Loan.findByIdAndDelete(id);

        if (!loan) return res.status(404).json({ message: "Loan not found" });

        const remainingAmount = loan.amount - (loan.paid || 0);
        if (remainingAmount > 0) {
            await Transaction.create({
                userEmail: loan.userEmail,
                type:      loan.type,
                amount:    remainingAmount,
                status:    "Cancelled",
                category:  "Cancelled"
            });
        }

        res.status(200).json({ message: "Loan deleted", loan });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};