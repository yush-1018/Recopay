import Transaction from "../models/transaction.js";

// GET TRANSACTIONS
export const getTransactions = async (req, res) => {
    try {
        const { email } = req.query;
        const userEmail = email || req.user.email;
        const transactions = await Transaction.find({ userEmail }).sort({ createdAt: -1 });
        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// CREATE TRANSACTION (Manual)
export const createTransaction = async (req, res) => {
    try {
        const { type, amount, status, category, date, userEmail } = req.body;
        const email = userEmail || req.user.email;

        if (!type || amount === undefined || !status || !category) {
            return res.status(400).json({ message: "type, amount, status, and category are required" });
        }

        const transaction = await Transaction.create({
            userEmail: email,
            type,
            amount: Number(amount),
            status,
            category,
            date: date ? new Date(date) : Date.now()
        });

        res.status(201).json(transaction);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
