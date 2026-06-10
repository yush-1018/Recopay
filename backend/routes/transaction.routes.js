import express from "express";
import { getTransactions, createTransaction } from "../controllers/transaction.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getTransactions);
router.post("/", protect, createTransaction);

export default router;
