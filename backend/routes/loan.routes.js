import express from "express";
import { createLoan, getLoans, deleteLoan } from "../controllers/loan.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// CREATE LOAN
router.post("/", protect, createLoan);

// GET ALL LOANS
router.get("/", protect, getLoans);

// DELETE LOAN
router.delete("/:id", protect, deleteLoan);

export default router;