// backend/src/middleware/auth.js
// backend/src/middleware/auth.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "No token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ EXPECT _id ALWAYS
    const user = await User.findById(decoded._id).select("-password");
    if (!user) return res.status(401).json({ error: "Invalid user" });

    req.user = user;
    next();
  } catch (e) {
    res.status(401).json({ error: "Unauthorized" });
  }
}

export function requireAdmin(req, res, next) {
  const secret = req.headers["x-admin-secret"];
  if (secret && secret === process.env.ADMIN_SECRET) return next();
  return res.status(403).json({ error: "Admin secret required" });
}
