import { useContext, useRef, useState } from "react";
import { LoanContext } from "../context/LoanContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { createPaymentOrder, verifyPayment } from "../api/payment.api";
import "./repayment.css";

// ── Status styling map ───────────────────────────────────────────────────────
const STATUS_STYLES = {
    Pending:   { bg: "var(--accent-orange-subtle, rgba(255,165,0,0.12))", color: "var(--accent-orange, #ffa500)" },
    Approved:  { bg: "var(--accent-cyan-subtle, rgba(0,210,255,0.12)",   color: "var(--accent-cyan, #00d2ff)" },
    Active:    { bg: "var(--primary-subtle)",                             color: "var(--primary-light)" },
    Completed: { bg: "var(--accent-green-subtle)",                        color: "var(--accent-green)" },
    Cancelled: { bg: "var(--accent-red-subtle, rgba(255,71,87,0.12))",   color: "var(--accent-red, #ff4757)" },
    Rejected:  { bg: "var(--accent-red-subtle, rgba(255,71,87,0.12))",   color: "var(--accent-red, #ff4757)" },
};

function StatusBadge({ status }) {
    const s = STATUS_STYLES[status] || STATUS_STYLES.Active;
    return (
        <span className="status-badge" style={{ background: s.bg, color: s.color }}>
            {status}
        </span>
    );
}

function Repayment() {

    const { loans, loading, deleteLoan, approveLoan, disburseLoan, fetchLoans, fetchTransactions, rejectLoan } = useContext(LoanContext);
    const { user } = useAuth();
    const toast = useToast();
    const payingRef = useRef(false);
    const [expandedLoan, setExpandedLoan] = useState(null);
    const [simulating, setSimulating] = useState(null);

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
        
        const emi = loan.emiAmount > 0 ? loan.emiAmount : Math.ceil(loan.amount / (loan.duration || 12));
        if (!window.confirm(`Are you sure you want to proceed with the EMI payment of ₹${emi.toLocaleString()}?`)) {
            return;
        }

        payingRef.current = true;

        try {
            const orderData = await createPaymentOrder(loan._id);

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
                theme: { color: "#6c63ff" },
                handler: async (response) => {
                    try {
                        await verifyPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            loanId: loan._id,
                        });
                        await Promise.all([fetchLoans(), fetchTransactions()]);
                        toast.success(`EMI of ₹${orderData.emi.toLocaleString()} paid successfully!`);
                    } catch {
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

    // 🚀 SIMULATE: Approve → Disburse (demo flow)
    const handleSimulateDisburse = async (loan) => {
        setSimulating(loan._id);
        try {
            if (loan.status === "Pending") {
                await approveLoan(loan._id);
                toast.success("Loan approved! Disbursing...");
                // Short delay to show the status change
                await new Promise(r => setTimeout(r, 600));
            }
            await disburseLoan(loan._id);
            toast.success("Loan disbursed! Now Active — you can pay EMIs.");
        } catch (err) {
            toast.error(err.message || "Simulation failed");
        } finally {
            setSimulating(null);
        }
    };

    // 🗑️ HANDLE DELETE
    const handleDelete = async (loan) => {
        if (window.confirm("Are you sure you want to cancel this loan?")) {
            try {
                await deleteLoan(loan._id);
                toast.info("Loan cancelled");
            } catch {
                toast.error("Failed to cancel loan");
            }
        }
    };

    const handleReject = async (id) => {
        try {
            await rejectLoan(id);
            toast.success("Loan rejected successfully!");
            await fetchLoans();
        } catch (err) {
            toast.error("Failed to reject loan.");
        }
    };

    // STATS
    const totalLoaned    = loans.reduce((s, l) => s + Number(l.amount || 0), 0);
    const totalPaid      = loans.reduce((s, l) => s + Number(l.paid || 0), 0);
    const totalRemaining = totalLoaned - totalPaid;

    if (loading) {
        return (
            <div className="repayment-container">
                <h1>Repayment</h1>
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading your loans...</p>
                </div>
            </div>
        );
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

            <h3>Your Loans</h3>

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
                            <th>Rate</th>
                            <th>Duration</th>
                            <th>EMI</th>
                            <th>Progress</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loans.map((loan) => {

                            const duration  = Number(loan.duration) || 12;
                            const emi       = loan.emiAmount > 0 ? loan.emiAmount : Math.ceil(loan.amount / duration);
                            const paid      = loan.paid || 0;
                            const percent   = Math.round((paid / loan.amount) * 100);
                            const isFullyPaid = paid >= loan.amount;
                            const isActive  = loan.status === "Active";
                            const isPending = loan.status === "Pending";
                            const isApproved = loan.status === "Approved";
                            const isExpanded = expandedLoan === loan._id;
                            const schedule  = loan.repaymentSchedule || [];

                            return (
                                <tr key={loan._id} className="loan-row-wrapper">
                                    <td style={{ fontWeight: "600", color: "var(--text-primary)" }}>{loan.type}</td>
                                    <td>₹{Number(loan.amount).toLocaleString()}</td>
                                    <td>{loan.interestRate ?? 0}%</td>
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
                                        <StatusBadge status={loan.status || (isFullyPaid ? "Completed" : "Active")} />
                                        {loan.disbursedAt && (
                                            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                                                Disbursed: {new Date(loan.disbursedAt).toLocaleDateString()}
                                            </div>
                                        )}
                                        {loan.nextDueDate && isActive && (
                                            <div className="next-due">
                                                Due: {new Date(loan.nextDueDate).toLocaleDateString()}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <div className="action-group">
                                            {/* Pending / Approved → Simulate Approve+Disburse */}
                                            {(isPending || isApproved) && (
                                                <button
                                                    className="simulate-btn"
                                                    onClick={() => handleSimulateDisburse(loan)}
                                                    disabled={simulating === loan._id}
                                                >
                                                    {simulating === loan._id
                                                        ? "Processing..."
                                                        : isPending ? "Approve & Disburse" : "Disburse"}
                                                </button>
                                            )}
                                            
                                            {/* Reject button for pending */}
                                            {isPending && (
                                                <button 
                                                    className="reject-btn" 
                                                    onClick={() => handleReject(loan._id)}
                                                    style={{ marginLeft: '10px', backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}
                                                >
                                                    Reject
                                                </button>
                                            )}

                                            {/* Active → Pay EMI or Paid */}
                                            {isActive && !isFullyPaid && (
                                                <button className="pay-btn" onClick={() => handlePayEMI(loan)}>
                                                    Pay EMI
                                                </button>
                                            )}
                                            {isFullyPaid && (
                                                <button className="paid-btn">Paid ✓</button>
                                            )}

                                            {/* Schedule toggle */}
                                            {schedule.length > 0 && (
                                                <button
                                                    className="schedule-toggle-btn"
                                                    onClick={() => setExpandedLoan(isExpanded ? null : loan._id)}
                                                    title="View repayment schedule"
                                                >
                                                    {isExpanded ? "Hide" : "Schedule"}
                                                </button>
                                            )}

                                            {/* Cancel */}
                                            {!isFullyPaid && loan.status !== "Completed" && (
                                                <button
                                                    className="delete-btn"
                                                    onClick={() => handleDelete(loan)}
                                                    title="Cancel Loan"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>

                                        {/* Expanded schedule */}
                                        {isExpanded && schedule.length > 0 && (
                                            <div className="schedule-panel">
                                                <table className="schedule-table">
                                                    <thead>
                                                        <tr>
                                                            <th>#</th>
                                                            <th>Due Date</th>
                                                            <th>Amount</th>
                                                            <th>Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {schedule.map((inst) => {
                                                            let displayStatus = inst.status;
                                                            if (displayStatus === "Pending" && new Date(inst.dueDate) < new Date()) {
                                                                displayStatus = "Overdue";
                                                            }
                                                            return (
                                                                <tr key={inst.installmentNo} className={displayStatus === "Paid" ? "inst-paid" : ""}>
                                                                    <td>{inst.installmentNo}</td>
                                                                    <td>{new Date(inst.dueDate).toLocaleDateString()}</td>
                                                                    <td>₹{Number(inst.amount).toLocaleString()}</td>
                                                                    <td>
                                                                        <span className={`inst-status inst-${displayStatus.toLowerCase()}`}>
                                                                            {displayStatus}
                                                                        </span>
                                                                        {inst.status === "Paid" && inst.paidDate && (
                                                                            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                                                                                Paid on: {new Date(inst.paidDate).toLocaleDateString()}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
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