import { useContext } from "react";
import { LoanContext } from "../context/LoanContext";
import { Link } from "react-router-dom";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function DashboardHome() {
    const { loans, transactions } = useContext(LoanContext);

    // ── DATA PREP: WALLET ──
    const totalCredited = loans
        .filter(loan => loan.status === "Active" || loan.status === "Completed")
        .reduce((sum, loan) => sum + Number(loan.amount || 0), 0);

    const totalPaid = loans.reduce((sum, loan) => sum + Number(loan.paid || 0), 0);
    const activeLoans = loans.filter(l => l.status === "Active");

    // ── DATA PREP: CHARTS ──
    // 1. Loan Distribution
    const loanTypeData = loans.reduce((acc, loan) => {
        const type = loan.type || "Other";
        if (!acc[type]) acc[type] = 0;
        acc[type] += Number(loan.amount || 0);
        return acc;
    }, {});
    
    const pieData = Object.keys(loanTypeData).map(k => ({ name: k, value: loanTypeData[k] }));
    const PIE_COLORS = ['#1E90FF', '#00D2FF', '#ffa500', '#2ed573', '#ff4757'];

    // 2. Payment History (last 6 months approximation by category)
    const txDataMap = {};
    transactions.forEach(tx => {
        const d = new Date(tx.date);
        if (!isNaN(d)) {
            const month = d.toLocaleString('default', { month: 'short' });
            if (!txDataMap[month]) txDataMap[month] = { name: month, Paid: 0, Credited: 0 };
            if (tx.category === "EMI Payment") txDataMap[month].Paid += Number(tx.amount || 0);
            if (tx.category === "Disbursement") txDataMap[month].Credited += Number(tx.amount || 0);
        }
    });
    // Convert to array and take last 6
    let barData = Object.values(txDataMap);
    if (barData.length > 6) barData = barData.slice(-6);

    // ── DATA PREP: UPCOMING EMIs ──
    const upcomingEMIs = [];
    loans.forEach(loan => {
        if (loan.status === "Active" && loan.repaymentSchedule) {
            const nextPending = loan.repaymentSchedule.find(i => i.status === "Pending");
            if (nextPending) {
                upcomingEMIs.push({ ...nextPending, loanType: loan.type, loanId: loan._id });
            }
        }
    });
    upcomingEMIs.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    return (
        <div style={{ animation: "fadeInUp 0.4s ease" }}>

            {/* ── HEADER ── */}
            <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: "26px", fontWeight: "800", color: "var(--text-primary)", letterSpacing: "-0.3px", marginBottom: "4px" }}>
                        Dashboard Overview
                    </h1>
                    <p style={{ color: "var(--text-muted)", fontSize: "13px", fontWeight: "500" }}>
                        Your financial insights and upcoming payments
                    </p>
                </div>
                {/* ── QUICK ACTIONS ── */}
                <div style={{ display: "flex", gap: "12px" }}>
                    <Link to="/apply" style={{
                        padding: "10px 20px", background: "var(--primary)", color: "white",
                        borderRadius: "var(--radius-full)", textDecoration: "none", fontWeight: "600",
                        fontSize: "13px", display: "flex", alignItems: "center", gap: "6px",
                        boxShadow: "0 4px 14px var(--primary-glow)"
                    }}>
                        <span>+</span> Apply for Loan
                    </Link>
                    <Link to="/repayment" style={{
                        padding: "10px 20px", background: "var(--bg-elevated)", color: "var(--text-primary)",
                        borderRadius: "var(--radius-full)", textDecoration: "none", fontWeight: "600",
                        fontSize: "13px", border: "1px solid var(--border-color)"
                    }}>
                        Pay EMIs
                    </Link>
                </div>
            </div>

            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
                
                {/* ── LEFT COLUMN: CHARTS & STATS ── */}
                <div style={{ flex: "2", display: "flex", flexDirection: "column", gap: "24px", minWidth: "400px" }}>
                    
                    {/* KEY METRICS */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                        <div className="card" style={{ padding: "20px" }}>
                            <p style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: "600", textTransform: "uppercase" }}>Wallet Balance</p>
                            <h2 style={{ color: "var(--accent-orange)", fontSize: "24px", marginTop: "8px" }}>₹{(totalCredited - totalPaid).toLocaleString()}</h2>
                        </div>
                        <div className="card" style={{ padding: "20px" }}>
                            <p style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: "600", textTransform: "uppercase" }}>Total Paid</p>
                            <h2 style={{ color: "var(--accent-green)", fontSize: "24px", marginTop: "8px" }}>₹{totalPaid.toLocaleString()}</h2>
                        </div>
                        <div className="card" style={{ padding: "20px" }}>
                            <p style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: "600", textTransform: "uppercase" }}>Active Loans</p>
                            <h2 style={{ color: "var(--text-primary)", fontSize: "24px", marginTop: "8px" }}>{activeLoans.length}</h2>
                        </div>
                    </div>

                    {/* CHARTS ROW */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        {/* PIE CHART */}
                        <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column" }}>
                            <h3 style={{ fontSize: "15px", marginBottom: "16px", color: "var(--text-primary)" }}>Loan Distribution</h3>
                            <div style={{ height: "200px", width: "100%" }}>
                                {pieData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%" cy="50%"
                                                innerRadius={60} outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-color)", borderRadius: "8px" }}
                                                itemStyle={{ color: "var(--text-primary)" }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "12px" }}>No active loans</div>
                                )}
                            </div>
                        </div>

                        {/* BAR CHART */}
                        <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column" }}>
                            <h3 style={{ fontSize: "15px", marginBottom: "16px", color: "var(--text-primary)" }}>Payment History</h3>
                            <div style={{ height: "200px", width: "100%" }}>
                                {barData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                                            <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                                            <Tooltip 
                                                contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-color)", borderRadius: "8px" }}
                                                cursor={{ fill: "rgba(255,255,255,0.05)" }}
                                            />
                                            <Bar dataKey="Paid" fill="var(--accent-green)" radius={[4, 4, 0, 0]} barSize={12} />
                                            <Bar dataKey="Credited" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={12} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "12px" }}>No transactions</div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>

                {/* ── RIGHT COLUMN: UPCOMING EMIs ── */}
                <div style={{ flex: "1", minWidth: "300px", display: "flex", flexDirection: "column", gap: "24px" }}>
                    
                    <div className="card" style={{ padding: "24px", flex: 1 }}>
                        <h3 style={{ fontSize: "16px", marginBottom: "20px", color: "var(--text-primary)" }}>Upcoming EMIs</h3>
                        
                        {upcomingEMIs.length === 0 ? (
                            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 0", fontSize: "13px" }}>
                                No upcoming payments. You're all clear!
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                {upcomingEMIs.slice(0, 4).map((emi, idx) => {
                                    const isOverdue = new Date(emi.dueDate) < new Date();
                                    return (
                                        <div key={emi.loanId || idx} style={{ 
                                            display: "flex", justifyContent: "space-between", alignItems: "center",
                                            padding: "16px", borderRadius: "12px",
                                            background: isOverdue ? "var(--accent-red-subtle)" : "rgba(255,255,255,0.03)",
                                            border: `1px solid ${isOverdue ? "rgba(255, 71, 87, 0.2)" : "rgba(255,255,255,0.05)"}`
                                        }}>
                                            <div>
                                                <p style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>{emi.loanType} Loan</p>
                                                <p style={{ fontSize: "11px", color: isOverdue ? "var(--accent-red)" : "var(--text-muted)" }}>
                                                    {isOverdue ? "Overdue: " : "Due: "} {new Date(emi.dueDate).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div style={{ textAlign: "right" }}>
                                                <p style={{ fontSize: "15px", fontWeight: "700", color: isOverdue ? "var(--accent-red)" : "var(--primary-light)" }}>
                                                    ₹{emi.amount.toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                {upcomingEMIs.length > 4 && (
                                    <Link to="/repayment" style={{ textAlign: "center", fontSize: "12px", color: "var(--primary)", marginTop: "8px", textDecoration: "none", fontWeight: "600" }}>
                                        View all {upcomingEMIs.length} pending payments →
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}

export default DashboardHome;