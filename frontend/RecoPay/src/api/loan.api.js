const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// RETRY WRAPPER — Render free tier sleeps, so retry on failure
const fetchWithRetry = async (url, options = {}, retries = 3) => {
    const token = localStorage.getItem("recopay_token");
    const headers = {
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const finalOptions = { ...options, headers };

    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, finalOptions);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res;
        } catch (err) {
            if (i === retries - 1) throw err;
            await new Promise(r => setTimeout(r, 2000));
        }
    }
};

// CREATE LOAN
export const applyLoan = async (data) => {
    const res = await fetchWithRetry(`${API_URL}/loans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
};

// GET LOANS (filtered by email)
export const getLoans = async (email, page = 1, limit = 1000) => {
    const params = new URLSearchParams();
    if (email) params.append("email", email);
    params.append("page", page);
    params.append("limit", limit);
    
    const url = `${API_URL}/loans?${params.toString()}`;
    const res = await fetchWithRetry(url);
    const json = await res.json();
    return Array.isArray(json) ? json : (json.data || []);
};

// PAY EMI
export const payEMI = async (id) => {
    const res = await fetchWithRetry(`${API_URL}/loans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
    });
    return res.json();
};

// APPROVE LOAN (Pending → Approved)
export const approveLoanAPI = async (id) => {
    const res = await fetchWithRetry(`${API_URL}/loans/${id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
    });
    return res.json();
};

// DISBURSE LOAN (Approved → Active)
export const disburseLoanAPI = async (id) => {
    const res = await fetchWithRetry(`${API_URL}/loans/${id}/disburse`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
    });
    return res.json();
};

// REJECT LOAN (Pending → Rejected)
export const rejectLoanAPI = async (id) => {
    const res = await fetchWithRetry(`${API_URL}/loans/${id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
    });
    return res.json();
};

// DELETE LOAN
export const deleteLoanAPI = async (id) => {
    const res = await fetchWithRetry(`${API_URL}/loans/${id}`, {
        method: "DELETE",
    });
    return res.json();
};
