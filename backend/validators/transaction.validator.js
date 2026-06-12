import { z } from "zod";

export const transactionSchema = z.object({
    type: z.string({ required_error: "Type is required" }).trim().min(1),
    amount: z.preprocess((val) => Number(val), z.number().positive("Amount must be greater than 0")),
    status: z.string({ required_error: "Status is required" }).trim().min(1),
    category: z.string({ required_error: "Category is required" }).trim().min(1),
    date: z.string().optional(),
    userEmail: z.string({ required_error: "User email is required" }).trim().email("Invalid email"),
});
