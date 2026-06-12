import express from "express";
import { getTransactions, createTransaction } from "../controllers/transaction.controller.js";
import { protect } from "../middleware/authMiddleware.js";
import validate from "../middleware/validate.js";
import { transactionSchema } from "../validators/transaction.validator.js";

const router = express.Router();

router.get("/", protect, getTransactions);
router.post("/", protect, validate(transactionSchema), createTransaction);

export default router;
