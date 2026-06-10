import Loan from "../models/loan.js";
import Transaction from "../models/transaction.js";

// CREATE LOAN
export const createLoan = async (req, res) => {
    try {
        const { type, amount, duration, purpose, userEmail } = req.body;

        if (!type || !amount || !userEmail) {
            return res.status(400).json({ message: "Type, amount, and userEmail are required" });
        }

        if (Number(amount) <= 0) {
            return res.status(400).json({ message: "Amount must be greater than 0" });
        }

        const loan = await Loan.create({
            userEmail,
            type,
            amount: Number(amount),
            duration: Number(duration) || 12,
            purpose: purpose || "",
            paid: 0,
            status: "Active"
        });

        // Automatically create a transaction for the new loan
        await Transaction.create({
            userEmail,
            type,
            amount: Number(amount),
            status: "Success",
            category: "Loan"
        });

        res.status(201).json(loan);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET LOANS (filtered by userEmail)
export const getLoans = async (req, res) => {
    try {
        const { email } = req.query;
        const filter = email ? { userEmail: email } : {};
        const loans = await Loan.find(filter).sort({ createdAt: -1 });
        res.status(200).json(loans);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// UPDATE LOAN (pay EMI)
export const updateLoan = async (req, res) => {
    try {
        const { id } = req.params;
        const loan = await Loan.findById(id);

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
        await loan.save();

        // Automatically create a transaction for the EMI payment
        await Transaction.create({
            userEmail: loan.userEmail,
            type: loan.type,
            amount: emi,
            status: "Success",
            category: "EMI Payment"
        });

        res.status(200).json(loan);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE LOAN
export const deleteLoan = async (req, res) => {
    try {
        const { id } = req.params;
        const loan = await Loan.findByIdAndDelete(id);

        if (!loan) {
            return res.status(404).json({ message: "Loan not found" });
        }

        // Automatically create a cancellation transaction for any unpaid amount
        const remainingAmount = loan.amount - (loan.paid || 0);
        if (remainingAmount > 0) {
            await Transaction.create({
                userEmail: loan.userEmail,
                type: loan.type,
                amount: remainingAmount,
                status: "Cancelled",
                category: "Cancelled"
            });
        }

        res.status(200).json({ message: "Loan deleted", loan });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};