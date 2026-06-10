import { useContext, useRef } from "react";
import { LoanContext } from "../context/LoanContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { createPaymentOrder, verifyPayment } from "../api/payment.api";
import "./repayment.css";

function Repayment() {

    const { loans, loading, deleteLoan, fetchLoans, fetchTransactions } = useContext(LoanContext);
    const { user } = useAuth();
    const toast = useToast();
    const payingRef = useRef(false); // prevent double clicks

    // 💳 HANDLE EMI PAYMENT — Opens Razorpay Checkout
    const handlePayEMI = async (loan) => {
        if (!loan.amount || loan.amount <= 0) {
            toast.error("Invalid loan");
            return;
        }

        if ((loan.paid || 0) >= loan.amount) {
            toast.info("Loan already fully paid!");
            return;
        }

        if (payingRef.current) return;
        payingRef.current = true;

        try {
            // 1. Create a Razorpay order via backend
            const orderData = await createPaymentOrder(loan._id);

            // 2. Build Razorpay checkout options
            const options = {
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "RecoPay",
                description: `EMI Payment — ${loan.type} Loan`,
                order_id: orderData.orderId,
                prefill: {
                    email: user?.email || "",
                    name: user?.name || "",
                },
                theme: {
                    color: "#6c63ff",
                },
                handler: async (response) => {
                    try {
                        // 3. Verify signature on backend and apply EMI
                        await verifyPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            loanId: loan._id,
                        });

                        // 4. Refresh data from MongoDB
                        await Promise.all([fetchLoans(), fetchTransactions()]);

                        toast.success(`EMI of ₹${orderData.emi.toLocaleString()} paid successfully!`);
                    } catch (err) {
                        toast.error("Payment verification failed. Contact support.");
                    } finally {
                        payingRef.current = false;
                    }
                },
                modal: {
                    ondismiss: () => {
                        payingRef.current = false;
                        toast.info("Payment cancelled");
                    }
                }
            };

            // 5. Open Razorpay Checkout modal
            const rzp = new window.Razorpay(options);
            rzp.on("payment.failed", () => {
                payingRef.current = false;
                toast.error("Payment failed. Please try again.");
            });
            rzp.open();

        } catch (err) {
            payingRef.current = false;
            toast.error(err.message || "Failed to initiate payment");
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