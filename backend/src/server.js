import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB, disconnectDB } from "./db.js";

import authRoutes from "./routes/auth.js";
import challengesRoute from "./routes/challenges.js";
import progressRoute from "./routes/progress.js";
import submitRoute from "./routes/submit.js";
import cfRoutes from "./routes/codeforces.js";
import submissionsRoute from "./routes/submissions.js";
import { requireAuth } from "./middleware/auth.js";

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173", // NOT "*"
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

// Health
app.get("/health", (_req, res) => res.json({ ok: true }));

// Public
app.use("/auth", authRoutes);
app.use("/challenges", challengesRoute);
app.use("/cf", cfRoutes);

// Protected
app.use("/progress", requireAuth, progressRoute);
app.use("/submit", requireAuth, submitRoute);
app.use("/submissions", requireAuth, submissionsRoute);

// 404 JSON
app.use((req, res) => res.status(404).json({ error: "Not found" }));

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB(process.env.MONGODB_URI);
  app.listen(PORT, () => console.log(`API listening at http://localhost:${PORT}`));
})();

process.on("SIGINT", async () => {
  await disconnectDB();
  process.exit(0);
});
