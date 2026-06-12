import jwt from "jsonwebtoken";
import User from "../models/user.js";

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || "secret", {
        expiresIn: "30d",
    });
};

// @desc    Register new user
// @route   POST /api/auth/signup
export const signup = async (req, res) => {
    try {
        const { name, email, password, avatar } = req.body;

        // Check if user exists
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Create user (password hashing is done in pre-save hook)
        const user = await User.create({
            name,
            email,
            password,
            method: "manual",
            avatar: avatar || name.charAt(0).toUpperCase()
        });

        if (user) {
            res.status(201).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                method: user.method,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: "Invalid user data" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check for user email
        const user = await User.findOne({ email });

        if (user && user.method === "manual" && (await user.matchPassword(password))) {
            res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                method: user.method,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: "Invalid credentials" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Authenticate with Google
// @route   POST /api/auth/google
export const googleLogin = async (req, res) => {
    try {
        const { email, name, picture } = req.body;

        let user = await User.findOne({ email });

        if (!user) {
            // Create user without password since they use Google
            user = await User.create({
                name,
                email,
                method: "google",
                avatar: picture || name.charAt(0).toUpperCase()
            });
        }

        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            method: user.method,
            token: generateToken(user._id),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
