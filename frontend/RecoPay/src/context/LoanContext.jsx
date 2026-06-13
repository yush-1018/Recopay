import { createContext, useState, useEffect } from "react";
import { applyLoan, getLoans, deleteLoanAPI, approveLoanAPI, rejectLoanAPI, disburseLoanAPI } from "../api/loan.api";
import { getTransactionsAPI } from "../api/transaction.api";
import { useAuth } from "./AuthContext";

export const LoanContext = createContext();

export const LoanProvider = ({ children }) => {
    const { user } = useAuth();
    const userEmail = user?.email || "";

    const [loans, setLoans] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    // 🔹 FETCH USER'S DATA FROM MONGODB
    useEffect(() => {
        if (userEmail) {
            fetchData();
        } else {
            setLoans([]);
            setTransactions([]);
            setLoading(false);
        }
    }, [userEmail]);

    const fetchData = async () => {
        try {
            setLoading(true);
            await Promise.all([fetchLoans(), fetchTransactions()]);
        } catch (err) {
            console.error("Failed to fetch data:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLoans = async () => {
        try {
            // Fetch all for context (used by dashboard/summary). Pages with pagination fetch their own.
            const result = await getLoans(userEmail, 1, 1000);
            setLoans(Array.isArray(result) ? result : (result.data || []));
        } catch (err) {
            console.error("Failed to fetch loans:", err);
        }
    };

    const fetchTransactions = async () => {
        try {
            // Fetch all for context (used by dashboard/summary). Pages with pagination fetch their own.
            const result = await getTransactionsAPI(userEmail, 1, 1000);
            setTransactions(Array.isArray(result) ? result : (result.data || []));
        } catch (err) {
            console.error("Failed to fetch transactions:", err);
        }
    };

    // ✅ ADD LOAN → MongoDB (with userEmail)
    const addLoan = async (loan) => {
        try {
            const newLoan = await applyLoan({ ...loan, userEmail });
            setLoans(prev => [newLoan, ...prev]);

            // Re-fetch transactions (backend automatically created transaction)
            await fetchTransactions();

            return newLoan;
        } catch (err) {
            console.error("Failed to add loan:", err);
            throw err;
        }
    };

    // ✅ APPROVE LOAN → Pending → Approved
    const approveLoan = async (loanId) => {
        try {
            const updated = await approveLoanAPI(loanId);
            setLoans(prev => prev.map(l => l._id === loanId ? updated : l));
            return updated;
        } catch (err) {
            console.error("Failed to approve loan:", err);
            throw err;
        }
    };

    // ✅ REJECT LOAN → Pending → Rejected
    const rejectLoan = async (loanId) => {
        try {
            const updated = await rejectLoanAPI(loanId);
            setLoans(prev => prev.map(l => l._id === loanId ? updated : l));
            return updated;
        } catch (err) {
            console.error("Failed to reject loan:", err);
            throw err;
        }
    };

    // ✅ DISBURSE LOAN → Approved → Active
    const disburseLoan = async (loanId) => {
        try {
            const updated = await disburseLoanAPI(loanId);
            setLoans(prev => prev.map(l => l._id === loanId ? updated : l));

            // Re-fetch transactions (backend created disbursement transaction)
            await fetchTransactions();

            return updated;
        } catch (err) {
            console.error("Failed to disburse loan:", err);
            throw err;
        }
    };

    // ✅ DELETE LOAN → MongoDB
    const deleteLoan = async (loanId) => {
        try {
            await deleteLoanAPI(loanId);
            setLoans(prev => prev.filter(l => l._id !== loanId));

            // Re-fetch transactions (backend automatically created cancellation transaction)
            await fetchTransactions();
        } catch (err) {
            console.error("Failed to delete loan:", err);
            throw err;
        }
    };

    // ✅ CLEAR ALL DATA
    const clearAllData = () => {
        setLoans([]);
        setTransactions([]);
    };

    return (
        <LoanContext.Provider value={{
            loans,
            loading,
            addLoan,
            approveLoan,
            rejectLoan,
            disburseLoan,
            deleteLoan,
            transactions,
            clearAllData,
            fetchLoans,
            fetchTransactions
        }}>
            {children}
        </LoanContext.Provider>
    );
};