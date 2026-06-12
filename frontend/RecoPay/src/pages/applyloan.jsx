import { useState, useContext } from "react";
import { LoanContext } from "../context/LoanContext";
import { useToast } from "../context/ToastContext";
import "./applyloan.css";

// Mirror of the backend default rates (used for client-side EMI preview)
const INTEREST_RATES = {
    Personal:  12,
    Education:  9,
    Business:  14,
    Housing:    8.5,
    Vehicle:   10.5,
};

/** Reducing-balance EMI formula — same as backend */
function calcEMI(principal, annualRate, months) {
    if (!principal || !months || months <= 0) return 0;
    const r = annualRate / 12 / 100;
    if (r === 0) return Math.ceil(principal / months);
    const factor = Math.pow(1 + r, months);
    return Math.ceil((principal * r * factor) / (factor - 1));
}

function ApplyLoan() {

    const { addLoan } = useContext(LoanContext);
    const toast = useToast();

    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        amount:   "",
        type:     "Personal",
        duration: "",
        purpose:  ""
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const validateStep = () => {
        if (step === 1) {
            if (!formData.amount || Number(formData.amount) <= 0) {
                toast.error("Please enter a valid amount");
                return false;
            }
            return true;
        }

        if (step === 2) {
            if (!formData.duration || Number(formData.duration) <= 0) {
                toast.error("Please enter a valid duration");
                return false;
            }
            if (!formData.purpose.trim()) {
                toast.error("Please enter the purpose");
                return false;
            }
            return true;
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!validateStep()) return;

        try {
            setSubmitting(true);
            await addLoan(formData);
            toast.success("Loan Application Submitted! Awaiting approval 🎉");

            setFormData({
                amount:   "",
                type:     "Personal",
                duration: "",
                purpose:  ""
            });
            setStep(1);
        } catch (err) {
            toast.error("Failed to submit loan. Try again.");
        } finally {
            setSubmitting(false);
        }
    };

    // Derived preview values for review step
    const rate   = INTEREST_RATES[formData.type] ?? 12;
    const emi    = calcEMI(Number(formData.amount), rate, Number(formData.duration));
    const total  = emi * Number(formData.duration || 0);
    const interest = Math.max(0, total - Number(formData.amount || 0));

    return (
        <div className="apply-container">
            <div className="loan-form">

                <h1 className="form-title">Apply for a Loan</h1>

                {step === 1 && (
                    <>
                        <h2>Step 1 — Basic Information</h2>

                        <label>Amount (₹)</label>
                        <input
                            type="number"
                            name="amount"
                            value={formData.amount}
                            onChange={handleChange}
                            placeholder="e.g. 50000"
                        />

                        <label>Loan Type</label>
                        <select name="type" value={formData.type} onChange={handleChange}>
                            <option>Personal</option>
                            <option>Education</option>
                            <option>Business</option>
                            <option>Housing</option>
                            <option>Vehicle</option>
                        </select>

                        <div className="form-buttons">
                            <button className="btn primary" onClick={() => {
                                if (validateStep()) setStep(2);
                            }}>
                                Next →
                            </button>
                        </div>
                    </>
                )}

                {step === 2 && (
                    <>
                        <h2>Step 2 — Loan Details</h2>

                        <label>Duration (Months)</label>
                        <input
                            type="number"
                            name="duration"
                            value={formData.duration}
                            onChange={handleChange}
                            placeholder="e.g. 12"
                        />

                        <label>Purpose</label>
                        <textarea
                            name="purpose"
                            value={formData.purpose}
                            onChange={handleChange}
                            placeholder="Describe the purpose of this loan..."
                        ></textarea>

                        <div className="form-buttons">
                            <button className="btn secondary" onClick={() => setStep(1)}>
                                ← Back
                            </button>
                            <button className="btn primary" onClick={() => {
                                if (validateStep()) setStep(3);
                            }}>
                                Review →
                            </button>
                        </div>
                    </>
                )}

                {step === 3 && (
                    <>
                        <h2>Step 3 — Review &amp; Submit</h2>

                        <div className="review-box">
                            <p><b>Amount</b> ₹{Number(formData.amount).toLocaleString()}</p>
                            <p><b>Type</b> {formData.type}</p>
                            <p><b>Duration</b> {formData.duration} months</p>
                            <p><b>Purpose</b> {formData.purpose}</p>
                            <hr style={{ margin: "10px 0", opacity: 0.2 }} />
                            <p><b>Interest Rate</b> {rate}% p.a. (reducing balance)</p>
                            <p><b>Monthly EMI</b> <span className="emi-highlight">₹{emi.toLocaleString()}</span></p>
                            <p><b>Total Interest</b> ₹{interest.toLocaleString()}</p>
                            <p><b>Total Payable</b> ₹{total.toLocaleString()}</p>
                            <p className="review-note">📋 Application will be reviewed before disbursement.</p>
                        </div>

                        <div className="form-buttons">
                            <button className="btn secondary" onClick={() => setStep(2)}>
                                ← Back
                            </button>
                            <button className="btn primary" onClick={handleSubmit} disabled={submitting}>
                                {submitting ? "Submitting..." : "Submit Application ✓"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default ApplyLoan;