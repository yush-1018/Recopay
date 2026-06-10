import { createContext, useState, useEffect } from "react";
import { applyLoan, getLoans, payEMI, deleteLoanAPI } from "../api/loan.api";
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
            const data = await getLoans(userEmail);
            setLoans(data);
        } catch (err) {
            console.error("Failed to fetch loans:", err);
        }
    };

    const fetchTransactions = async () => {
        try {
            const data = await getTransactionsAPI(userEmail);
            setTransactions(data);
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

    // ✅ PAY EMI → MongoDB
    const payLoan = async (loanId) => {
        try {
            const updatedLoan = await payEMI(loanId);
            setLoans(prev =>
                prev.map(l => l._id === loanId ? updatedLoan : l)
            );

            // Re-fetch transactions (backend automatically created transaction)
            await fetchTransactions();

            return updatedLoan;
        } catch (err) {
            console.error("Failed to pay EMI:", err);
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
            payLoan,
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