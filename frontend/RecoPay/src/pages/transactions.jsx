import { useContext, useState } from "react";
import { LoanContext } from "../context/LoanContext";
import "./transactions.css";

function Transactions() {

    const context = useContext(LoanContext);
    if (!context) return <h2>Loading...</h2>;

    const { transactions = [] } = context;

    // 🔍 SEARCH & FILTER
    const [search, setSearch] = useState("");
    const [filterCategory, setFilterCategory] = useState("All");

    const filtered = transactions.filter(tx => {
        const matchSearch = tx.type.toLowerCase().includes(search.toLowerCase()) ||
            tx.category.toLowerCase().includes(search.toLowerCase());
        const matchCategory = filterCategory === "All" || tx.category === filterCategory;
        return matchSearch && matchCategory;
    });

    // 📊 CSV EXPORT
    const downloadCSV = () => {
        const headers = ["Date", "ID", "Type", "Category", "Amount", "Status"];
        const rows = filtered.map(tx =>
            [tx.date, tx.id, tx.type, tx.category, tx.amount, tx.status].join(",")
        );

        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "RecoPay_Transactions.csv";
        link.click();

        URL.revokeObjectURL(url);
    };

    // 🖨️ PRINT / PDF
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="transactions-container">

            <h1>Transaction History</h1>

            {/* ── CONTROLS ── */}
            <div className="tx-controls">
                <input
                    className="tx-search"
                    type="text"
                    placeholder="Search transactions..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <select
                    className="tx-filter"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                >
                    <option value="All">All Categories</option>
                    <option value="Disbursement">Disbursement</option>
                    <option value="Loan">Loan</option>
                    <option value="Repayment">Repayment</option>
                    <option value="Cancelled">Cancelled</option>
                </select>

                <button className="download-btn" onClick={handlePrint}>
                    PDF
                </button>
                <button className="download-btn csv-btn" onClick={downloadCSV}>
                    CSV
                </button>
            </div>

            {/* ── SUMMARY ── */}
            <div className="tx-summary">
                <span>{filtered.length} transaction{filtered.length !== 1 ? "s" : ""}</span>
                <span>Total: ₹{filtered.reduce((s, tx) => s + Number(tx.amount), 0).toLocaleString()}</span>
            </div>

            {filtered.length === 0 ? (
                <p>No transactions found</p>
            ) : (
                <div className="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Category</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>

                    <tbody>
                        {[...filtered].reverse().map((tx) => (
                            <tr key={tx.id}>
                                <td>{tx.date}</td>
                                <td>{tx.type}</td>
                                <td>
                                    <span className={`tx-badge ${tx.category.toLowerCase()}`}>
                                        {tx.category}
                                    </span>
                                </td>
                                <td style={{
                                    color: (tx.category === "Loan" || tx.category === "Disbursement")
                                        ? "var(--accent-green)"
                                        : tx.category === "Cancelled"
                                            ? "var(--accent-red)"
                                            : "var(--accent-orange)",
                                    fontWeight: "600"
                                }}>
                                    {(tx.category === "Loan" || tx.category === "Disbursement") ? "+" : "−"}₹{Number(tx.amount).toLocaleString()}
                                </td>
                                <td style={{
                                    color: tx.status === "Success"
                                        ? "var(--accent-green)"
                                        : "var(--accent-red)",
                                    fontWeight: "600",
                                    fontSize: "12px"
                                }}>
                                    {tx.status}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            )}
        </div>
    );
}

export default Transactions;