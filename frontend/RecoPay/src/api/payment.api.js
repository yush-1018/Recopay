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
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || `HTTP ${res.status}`);
            }
            return res;
        } catch (err) {
            if (i === retries - 1) throw err;
            await new Promise(r => setTimeout(r, 2000));
        }
    }
};

// Create a Razorpay order
export const createPaymentOrder = async (loanId) => {
    const res = await fetchWithRetry(`${API_URL}/payments/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanId }),
    });
    return res.json();
};

// Verify payment after Razorpay checkout success
export const verifyPayment = async (paymentData) => {
    const res = await fetchWithRetry(`${API_URL}/payments/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData),
    });
    return res.json();
};
