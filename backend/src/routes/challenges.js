// backend/src/routes/challenges.js
import { Router } from "express";
import Challenge from "../models/Challenge.js";
import { fetchCFProblems } from "../services/codeforces.js";

const router = Router();

const fallback = [
  {
    _id: "seed-1",
    title: "Reverse String",
    description: "Given a string, return its reverse.",
    topic: "Strings",
    level: "Beginner",
    xpReward: 10,
    testCases: [{ input: "hello", expectedOutput: "olleh" }]
  },
  {
    _id: "seed-2",
    title: "Sum of Array",
    description: "Return sum of numbers in array.",
    topic: "Arrays",
    level: "Beginner",
    xpReward: 12,
    testCases: [{ input: "[1,2,3]", expectedOutput: "6" }]
  },
  {
    _id: "seed-3",
    title: "Fibonacci Nth",
    description: "Return Nth Fibonacci (0-indexed).",
    topic: "Recursion",
    level: "Intermediate",
    xpReward: 20,
    testCases: [{ input: "7", expectedOutput: "13" }]
  }
];

// GET /challenges  (DB or Codeforces)
router.get("/", async (req, res) => {
  try {
    const { source } = req.query;

    if (source === "cf") {
      const tag = req.query.tag ?? process.env.CF_DEFAULT_TAG ?? "";
      const min = Number(req.query.min ?? process.env.CF_MIN_RATING ?? 800);
      const max = Number(req.query.max ?? process.env.CF_MAX_RATING ?? 1200);
      const limit = Number(req.query.limit ?? process.env.CF_LIMIT ?? 20);
      const problems = await fetchCFProblems({ tag, min, max, limit });
      return res.json(problems);
    }

    const items = await Challenge.find({}).lean();
    if (!items.length) return res.json(fallback);
    return res.json(items.map(c => ({ ...c, _id: String(c._id) })));
  } catch (e) {
    return res.json(fallback); // safe fallback
  }
});

// GET /challenges/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (id.startsWith("cf-")) {
      return res.status(400).json({ error: "Codeforces problem is external" });
    }

    const doc = await Challenge.findById(id).lean().catch(() => null);
    if (doc) return res.json({ ...doc, _id: String(doc._id) });

    const fb = fallback.find(x => x._id === id);
    if (fb) return res.json(fb);

    return res.status(404).json({ error: "Challenge not found" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
