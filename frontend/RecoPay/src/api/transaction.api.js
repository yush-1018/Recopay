const API_URL = "https://recopay.onrender.com/api";

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

// GET TRANSACTIONS
export const getTransactionsAPI = async (email) => {
    const url = email ? `${API_URL}/transactions?email=${encodeURIComponent(email)}` : `${API_URL}/transactions`;
    const res = await fetchWithRetry(url);
    return res.json();
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
