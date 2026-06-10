import mongoose from "mongoose";

const loanSchema = new mongoose.Schema({
    userEmail: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 1
    },
    duration: {
        type: Number,
        default: 12,
        min: 1
    },
    purpose: {
        type: String,
        default: ""
    },
    paid: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ["Active", "Completed", "Cancelled"],
        default: "Active"
    },
    lastPaymentId: {
        type: String,
        default: null
    }
}, { timestamps: true });

export default mongoose.model("Loan", loanSchema);