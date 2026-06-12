import { z } from "zod";

/**
 * Zod schema for POST /api/loans
 * Enforces: type, amount (>0), optional duration, optional purpose, valid userEmail
 * New: optional interestRate (1–36%)
 */
export const loanSchema = z.object({
    type: z
        .string({ required_error: "Loan type is required" })
        .trim()
        .min(1, "Loan type cannot be empty"),

    amount: z.preprocess(
        (val) => Number(val),
        z
            .number({ invalid_type_error: "Amount must be a number" })
            .positive("Amount must be greater than 0")
            .max(10_000_000, "Amount cannot exceed 1,00,00,000")
    ),

    duration: z
        .preprocess(
            (val) => (val === undefined || val === "" ? undefined : Number(val)),
            z
                .number()
                .int("Duration must be a whole number")
                .positive("Duration must be greater than 0")
                .max(360, "Duration cannot exceed 360 months")
                .optional()
        )
        .optional(),

    purpose: z
        .string()
        .trim()
        .max(500, "Purpose cannot exceed 500 characters")
        .optional()
        .default(""),

    userEmail: z
        .string({ required_error: "User email is required" })
        .email("Invalid email address"),

    // Optional override — backend auto-assigns by loan type if omitted
    interestRate: z
        .preprocess(
            (val) => (val === undefined || val === "" ? undefined : Number(val)),
            z
                .number()
                .min(0,  "Interest rate cannot be negative")
                .max(36, "Interest rate cannot exceed 36%")
                .optional()
        )
        .optional(),
});
