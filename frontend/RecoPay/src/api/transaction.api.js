const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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

// GET TRANSACTIONS — returns { data, total, page, totalPages }
export const getTransactionsAPI = async (email, page = 1, limit = 10) => {
    const params = new URLSearchParams();
    if (email) params.append("email", email);
    params.append("page", page);
    params.append("limit", limit);
    
    const url = `${API_URL}/transactions?${params.toString()}`;
    const res = await fetchWithRetry(url);
    const json = await res.json();
    // Support both old array shape and new paginated shape
    if (Array.isArray(json)) {
        return { data: json, total: json.length, page: 1, totalPages: 1 };
    }
    return json;
};

// CREATE TRANSACTION (Manual)
export const createTransactionAPI = async (data) => {
    const res = await fetchWithRetry(`${API_URL}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
};
