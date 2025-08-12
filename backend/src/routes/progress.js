import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import Progress from "../models/Progress.js";
import Submission from "../models/Submission.js";

const router = Router();

/** ensure a progress doc exists */
async function getOrCreateProgress(userId) {
  let p = await Progress.findOne({ userId });
  if (!p) {
    p = await Progress.create({
      userId,
      xp: 0,
      badges: [],
      weakTopics: [],
      topics: {},          // { topic: { solved: Number, xp: Number } }
      history: [],         // [{ date:'YYYY-MM-DD', solved:Number, xp:Number }]
      cfHandle: ""
    });
  }
  return p;
}

const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);

/** collapse sparse history to last N days (for charts) */
function clipHistory(arr, days = 30) {
  const map = new Map(arr.map(h => [h.date, h]));
  // backfill zeros so the chart always looks nice
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = todayKey(d);
    if (!map.has(key)) map.set(key, { date: key, solved: 0, xp: 0 });
  }
  return Array.from(map.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-days);
}

/** GET /progress  (server already mounts requireAuth) */
router.get("/", requireAuth, async (req, res) => {
  const userId = req.user._id;
  const p = await getOrCreateProgress(userId);

  // last 10 submissions for the dashboard list
  const recentSubmissions = await Submission
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  res.json({
    _id: p._id,
    userId: p.userId,
    xp: p.xp || 0,
    badges: p.badges || [],
    weakTopics: p.weakTopics || [],
    topics: p.topics || {},
    cfHandle: p.cfHandle || "",
    history: clipHistory(p.history || [], 30),
    recentSubmissions
  });
});

/** PATCH /progress/weak-topics  (already protected) */
router.patch("/weak-topics", requireAuth, async (req, res) => {
  const { add = [], remove = [] } = req.body;
  const prog = await getOrCreateProgress(req.user._id);

  const set = new Set(prog.weakTopics || []);
  add.forEach(t => set.add(String(t)));
  remove.forEach(t => set.delete(String(t)));

  prog.weakTopics = Array.from(set);
  await prog.save();
  res.json({ ok: true, weakTopics: prog.weakTopics });
});

export default router;
