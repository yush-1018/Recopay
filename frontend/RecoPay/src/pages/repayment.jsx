import { useContext } from "react";
import { LoanContext } from "../context/LoanContext";
import { useToast } from "../context/ToastContext";
import "./repayment.css";

function Repayment() {

    const { loans, loading, payLoan, deleteLoan } = useContext(LoanContext);
    const toast = useToast();

    // 🔥 HANDLE EMI PAYMENT
    const handlePayEMI = async (loan) => {
        if (!loan.amount || loan.amount <= 0) {
            toast.error("Invalid loan");
            return;
        }

        if ((loan.paid || 0) >= loan.amount) {
            toast.info("Loan already fully paid!");
            return;
        }

        try {
            const duration = Number(loan.duration) || 12;
            const emi = Math.ceil(loan.amount / duration);

            await payLoan(loan._id);

            toast.success(`EMI of ₹${emi.toLocaleString()} paid successfully!`);
        } catch (err) {
            toast.error("Failed to pay EMI");
        }
    };

    // 🗑️ HANDLE DELETE
    const handleDelete = async (loan) => {
        if (window.confirm("Are you sure you want to cancel this loan?")) {
            try {
                await deleteLoan(loan._id);
                toast.info("Loan cancelled");
            } catch (err) {
                toast.error("Failed to cancel loan");
            }
        }
    };

    // STATS
    const totalLoaned = loans.reduce((s, l) => s + Number(l.amount || 0), 0);
    const totalPaid = loans.reduce((s, l) => s + Number(l.paid || 0), 0);
    const totalRemaining = totalLoaned - totalPaid;

    if (loading) {
        return <div style={{ color: "var(--text-muted)", padding: "40px", textAlign: "center" }}>Loading loans...</div>;
    }

    return (
        <div className="repayment-container">

            <h1>Repayment</h1>

            {/* SUMMARY CARDS */}
            <div className="cards">
                <div className="card">
                    <p>Total Loaned</p>
                    <h2>₹{totalLoaned.toLocaleString()}</h2>
                </div>
                <div className="card">
                    <p>Total Paid</p>
                    <h2>₹{totalPaid.toLocaleString()}</h2>
                </div>
                <div className="card">
                    <p>Remaining</p>
                    <h2>₹{totalRemaining.toLocaleString()}</h2>
                </div>
            </div>

            <h3>Active Loans</h3>

            {loans.length === 0 ? (
                <p style={{ color: "var(--text-muted)", padding: "20px 0" }}>
                    No loans yet — apply for a loan first
                </p>
            ) : (
                <div className="table-responsive">
                    <table>
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Duration</th>
                            <th>EMI</th>
                            <th>Progress</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loans.map((loan) => {

                            const duration = Number(loan.duration) || 12;
                            const emi = Math.ceil(loan.amount / duration);
                            const paid = loan.paid || 0;
                            const percent = Math.round((paid / loan.amount) * 100);
                            const isFullyPaid = paid >= loan.amount;

                            return (
                                <tr key={loan._id}>
                                    <td style={{ fontWeight: "600", color: "var(--text-primary)" }}>{loan.type}</td>
                                    <td>₹{Number(loan.amount).toLocaleString()}</td>
                                    <td>{duration} mo</td>
                                    <td style={{ color: "var(--primary-light)", fontWeight: "600" }}>
                                        ₹{emi.toLocaleString()}
                                    </td>
                                    <td>
                                        <div className="progress-bar">
                                            <div className="progress" style={{ width: `${percent}%` }} />
                                        </div>
                                        <small>{percent}% — ₹{paid.toLocaleString()} / ₹{Number(loan.amount).toLocaleString()}</small>
                                    </td>
                                    <td>
                                        <span style={{
                                            display: "inline-block",
                                            padding: "3px 12px",
                                            borderRadius: "100px",
                                            fontSize: "11px",
                                            fontWeight: "600",
                                            background: isFullyPaid
                                                ? "var(--accent-green-subtle)"
                                                : "var(--primary-subtle)",
                                            color: isFullyPaid
                                                ? "var(--accent-green)"
                                                : "var(--primary-light)"
                                        }}>
                                            {loan.status || (isFullyPaid ? "Completed" : "Active")}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", gap: "6px" }}>
                                            {isFullyPaid ? (
                                                <button className="paid-btn">Paid ✓</button>
                                            ) : (
                                                <button
                                                    className="pay-btn"
                                                    onClick={() => handlePayEMI(loan)}
                                                >
                                                    Pay EMI
                                                </button>
                                            )}
                                            <button
                                                className="delete-btn"
                                                onClick={() => handleDelete(loan)}
                                                title="Cancel Loan"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                </div>
            )}
        </div>
    );
}

export default Repayment;