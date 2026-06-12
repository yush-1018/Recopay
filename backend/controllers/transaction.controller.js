import Transaction from "../models/transaction.js";

// GET TRANSACTIONS
export const getTransactions = async (req, res) => {
    try {
        const { email, page = 1, limit = 1000 } = req.query;
        const userEmail = email || req.user.email;
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const total = await Transaction.countDocuments({ userEmail });
        const transactions = await Transaction.find({ userEmail })
                                              .sort({ createdAt: -1 })
                                              .skip(skip)
                                              .limit(limitNum);

        res.status(200).json({
            data: transactions,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum)
        });
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
