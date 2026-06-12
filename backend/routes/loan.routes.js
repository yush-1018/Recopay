import express from "express";
import {
    createLoan,
    getLoans,
    updateLoan,
    approveLoan,
    rejectLoan,
    disburseLoan,
    deleteLoan
} from "../controllers/loan.controller.js";
import { protect } from "../middleware/authMiddleware.js";
import validate from "../middleware/validate.js";
import { loanSchema } from "../validators/loan.validator.js";

const router = express.Router();

// CREATE LOAN (validated)
router.post("/", protect, validate(loanSchema), createLoan);

// GET ALL LOANS
router.get("/", protect, getLoans);

// PAY EMI — was missing, now registered
router.patch("/:id", protect, updateLoan);

// APPROVAL WORKFLOW
router.patch("/:id/approve",  protect, approveLoan);
router.patch("/:id/reject",   protect, rejectLoan);
router.patch("/:id/disburse", protect, disburseLoan);

// DELETE LOAN
router.delete("/:id", protect, deleteLoan);

export default router;