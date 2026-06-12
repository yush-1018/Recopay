import rateLimit from "express-rate-limit";

// Auth rate limiter: Max 10 requests per 15 minutes per IP
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { message: "Too many requests from this IP, please try again after 15 minutes" },
    standardHeaders: true,
    legacyHeaders: false,
});

// Payment rate limiter: Max 20 requests per 15 minutes per IP
export const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: { message: "Too many payment requests from this IP, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
});
