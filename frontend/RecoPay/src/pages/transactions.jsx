import { useContext, useState, useEffect, useCallback } from "react";
import { LoanContext } from "../context/LoanContext";
import { getTransactionsAPI } from "../api/transaction.api";
import { useAuth } from "../context/AuthContext";
import "./transactions.css";

const PAGE_SIZE = 10;

function Transactions() {

    const context = useContext(LoanContext);
    const { user } = useAuth();
    if (!context) return <h2>Loading...</h2>;

    // 🔍 SEARCH & FILTER
    const [search, setSearch] = useState("");
    const [filterCategory, setFilterCategory] = useState("All");

    // 📄 PAGINATION STATE
    const [transactions, setTransactions] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    const userEmail = user?.email || "";

    // Fetch a specific page from the server
    const fetchPage = useCallback(async (page) => {
        if (!userEmail) return;
        setLoading(true);
        try {
            const result = await getTransactionsAPI(userEmail, page, PAGE_SIZE);
            setTransactions(result.data || []);
            setCurrentPage(result.page || page);
            setTotalPages(result.totalPages || 1);
            setTotal(result.total || 0);
        } catch (err) {
            console.error("Failed to fetch transactions:", err);
        } finally {
            setLoading(false);
        }
    }, [userEmail]);

    useEffect(() => {
        fetchPage(1);
    }, [fetchPage]);

    // Refresh whenever the context signals a change (e.g., after a payment)
    const { transactions: ctxTransactions } = context;
    useEffect(() => {
        if (ctxTransactions) fetchPage(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ctxTransactions]);

    // Client-side filter on the current page's rows
    const filtered = transactions.filter(tx => {
        const matchSearch = tx.type.toLowerCase().includes(search.toLowerCase()) ||
            tx.category.toLowerCase().includes(search.toLowerCase());
        const matchCategory = filterCategory === "All" || tx.category === filterCategory;
        return matchSearch && matchCategory;
    });

    // 📊 CSV EXPORT (exports the current page)
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

    const handlePageChange = (page) => {
        if (page < 1 || page > totalPages) return;
        fetchPage(page);
        // Reset client-side filters on page change
        setSearch("");
        setFilterCategory("All");
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
                    <option value="EMI Payment">EMI Payment</option>
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
                <span>
                    {total} transaction{total !== 1 ? "s" : ""} total
                    {search || filterCategory !== "All" ? ` · ${filtered.length} shown` : ""}
                </span>
                <span>Page {currentPage} of {totalPages}</span>
            </div>

            {loading ? (
                <div className="tx-loading">
                    <div className="tx-spinner" />
                    <p>Loading transactions...</p>
                </div>
            ) : filtered.length === 0 ? (
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
                        {filtered.map((tx) => (
                            <tr key={tx._id || tx.id}>
                                <td>{tx.date || new Date(tx.createdAt).toLocaleDateString()}</td>
                                <td>{tx.type}</td>
                                <td>
                                    <span className={`tx-badge ${tx.category.toLowerCase().replace(" ", "-")}`}>
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

            {/* ── PAGINATION ── */}
            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        className="page-btn"
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                        title="First page"
                    >
                        «
                    </button>
                    <button
                        className="page-btn"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        title="Previous page"
                    >
                        ‹
                    </button>

                    {/* Page number buttons */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => Math.abs(p - currentPage) <= 2)
                        .map(p => (
                            <button
                                key={p}
                                className={`page-btn ${p === currentPage ? "active" : ""}`}
                                onClick={() => handlePageChange(p)}
                            >
                                {p}
                            </button>
                        ))}

                    <button
                        className="page-btn"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        title="Next page"
                    >
                        ›
                    </button>
                    <button
                        className="page-btn"
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        title="Last page"
                    >
                        »
                    </button>
                </div>
            )}
        </div>
    );
}

export default Transactions;