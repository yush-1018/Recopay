import express from "express";
import { signup, login, googleLogin } from "../controllers/auth.controller.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import validate from "../middleware/validate.js";
import { signupSchema, loginSchema, googleLoginSchema } from "../validators/auth.validator.js";

const router = express.Router();

router.use(authLimiter);

router.post("/signup", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login);
router.post("/google", validate(googleLoginSchema), googleLogin);

export default router;
