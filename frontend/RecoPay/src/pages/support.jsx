import { useEffect, useState } from "react";
import "./support.css";

const API_URL = import.meta.env.VITE_API_URL || "https://recopay.onrender.com/api";

function Support() {

    const [form, setForm] = useState({
        name: "",
        email: "",
        issue: ""
    });

    const [tickets, setTickets] = useState([]);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const fetchTickets = async () => {
        try {
            const token = localStorage.getItem("recopay_token");
            const res = await fetch(`${API_URL}/tickets`, {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            });
            if (!res.ok) throw new Error("Failed to fetch tickets");
            const data = await res.json();
            setTickets(data);
            setError("");
        } catch (err) {
            console.error("Fetch error:", err);
            setError("Could not load tickets. Make sure the backend server is running.");
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem("recopay_token");
            const res = await fetch(`${API_URL}/tickets`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify(form)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Failed to submit ticket");
            }

            setSuccess(true);
            setForm({ name: "", email: "", issue: "" });
            setError("");

            fetchTickets();

            // Auto-hide success message after 3 seconds
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err.message);
            setSuccess(false);
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (id) => {
        try {
            const token = localStorage.getItem("recopay_token");
            const res = await fetch(`${API_URL}/tickets/${id}`, {
                method: "PUT",
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            });

            if (!res.ok) throw new Error("Failed to resolve ticket");

            fetchTickets();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="support-container">

            <h1>Support Center</h1>

            {success && (
                <div className="success-msg">
                    ✅ Ticket submitted successfully!
                </div>
            )}

            {error && (
                <div className="error-msg" style={{
                    background: "#fef2f2",
                    color: "#dc2626",
                    padding: "10px 16px",
                    borderRadius: "8px",
                    marginBottom: "16px",
                    border: "1px solid #fecaca"
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* CARD FORM */}
            <div className="support-card">
                <form onSubmit={handleSubmit} className="form">

                    <div className="form-group">
                        <label>Name</label>
                        <input
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Issue</label>
                        <textarea
                            name="issue"
                            value={form.issue}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button type="submit" disabled={loading}>
                        {loading ? "Submitting..." : "Submit Ticket"}
                    </button>

                </form>
            </div>

            <h2>Your Tickets</h2>

            <div className="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Issue</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>

                <tbody>
                    {tickets.length === 0 ? (
                        <tr>
                            <td colSpan="6" style={{ textAlign: "center", padding: "20px" }}>
                                No tickets yet
                            </td>
                        </tr>
                    ) : (
                        tickets.map((t) => (
                            <tr key={t._id}>
                                <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                                <td>{t.name}</td>
                                <td>{t.email}</td>
                                <td>{t.issue}</td>
                                <td className={t.status === "Resolved" ? "resolved" : "open"}>
                                    {t.status}
                                </td>
                                <td>
                                    {t.status === "Open" && (
                                        <button onClick={() => handleResolve(t._id)}>
                                            Resolve
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
            </div>

        </div>
    );
}

export default Support;