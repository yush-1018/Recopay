import { z } from "zod";

export const signupSchema = z.object({
    name: z.string({ required_error: "Name is required" }).trim().min(2, "Name must be at least 2 characters"),
    email: z.string({ required_error: "Email is required" }).trim().email("Invalid email address"),
    password: z.string({ required_error: "Password is required" }).min(6, "Password must be at least 6 characters"),
    avatar: z.string().url("Invalid avatar URL").optional(),
});

export const loginSchema = z.object({
    email: z.string({ required_error: "Email is required" }).trim().email("Invalid email address"),
    password: z.string({ required_error: "Password is required" }).min(1, "Password cannot be empty"),
});

export const googleLoginSchema = z.object({
    email: z.string({ required_error: "Email is required" }).trim().email("Invalid email address"),
    name: z.string({ required_error: "Name is required" }).trim().min(1, "Name cannot be empty"),
    picture: z.string().url("Invalid picture URL").optional(),
});
