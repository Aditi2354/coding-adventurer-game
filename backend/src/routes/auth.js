// backend/src/routes/auth.js
// backend/src/routes/auth.js
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = Router();

const signToken = (user) =>
  // ✅ ALWAYS sign _id
  jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// normalize user object returned to client
const userOut = (u) => ({ _id: u._id, name: u.name, email: u.email, avatar: u.avatar || null });

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields required" });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });

    const token = signToken(user);
    return res.json({ token, user: userOut(user) });
  } catch (e) {
    console.error("signup error:", e);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email & password required" });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken(user);
    return res.json({ token, user: userOut(user) });
  } catch (e) {
    console.error("signin error:", e);
    return res.status(500).json({ error: "Server error" });
  }
});

// Hydrate user on app start / refresh
router.get("/me", async (req, res) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "No token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id).select("-password"); // ✅ _id
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json(userOut(user));
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized" });
  }
});

export default router;
