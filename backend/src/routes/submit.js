import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import Submission from "../models/Submission.js";
import Progress from "../models/Progress.js";
import Challenge from "../models/Challenge.js";

const router = Router();

const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);

/** lightweight badge rules */
function awardBadges(prog) {
  const totalSolved = Object.values(prog.topics || {})
    .reduce((s, t) => s + (t.solved || 0), 0);

  const got = new Set(prog.badges || []);

  // global milestones
  if (totalSolved >= 5)  got.add("Starter");
  if (totalSolved >= 15) got.add("Rising Star");
  if (totalSolved >= 30) got.add("Grinder");

  // per-topic milestones
  for (const [topic, t] of Object.entries(prog.topics || {})) {
    if (t.solved >= 10) got.add(`${topic} Ace`);
    if (t.solved >= 25) got.add(`${topic} Master`);
  }

  prog.badges = Array.from(got);
}

/** make or fetch today’s history bucket */
function bumpHistory(prog, xpDelta, solvedDelta = 1) {
  const key = todayKey();
  const h = prog.history || [];
  const idx = h.findIndex(x => x.date === key);
  if (idx >= 0) {
    h[idx].xp += xpDelta;
    h[idx].solved += solvedDelta;
  } else {
    h.push({ date: key, xp: xpDelta, solved: solvedDelta });
  }
  prog.history = h;
}

/** POST /submit
 * body:
 *  - challengeId (required for local DB problems)
 *  - source: "local" | "cf"
 *  - verdict: "OK" | "WA" | ... (default "OK")
 *  - languageId, code (optional, stored for audit)
 *  - xpReward (optional override, else from Challenge or by level)
 */
router.post("/", requireAuth, async (req, res) => {
  const userId = req.user._id;
  const {
    challengeId,
    source = "local",
    verdict = "OK",
    languageId,
    code,
    xpReward
  } = req.body || {};

  // block duplicates (same user & challenge) when success
  if (verdict === "OK" && challengeId) {
    const dup = await Submission.findOne({ userId, challengeId, status: "OK" });
    if (dup) {
      return res.status(200).json({ ok: true, duplicate: true, alreadySubmitted: true });
    }
  }

  // identify challenge/metadata
  let ch = null;
  if (challengeId) ch = await Challenge.findById(challengeId).lean().catch(() => null);

  // default XP if not provided
  let baseXp = Number(xpReward);
  if (!baseXp) {
    if (ch?.xpReward) baseXp = ch.xpReward;
    else {
      const lvl = (ch?.level || "").toLowerCase();
      if (lvl.includes("beginner")) baseXp = 10;
      else if (lvl.includes("intermediate")) baseXp = 20;
      else if (lvl.includes("advanced")) baseXp = 30;
      else baseXp = 15;
    }
  }

  // create submission record
  const sub = await Submission.create({
    userId,
    challengeId: ch?._id || null,
    source,
    languageId: languageId || null,
    status: verdict,
    topic: ch?.topic || null,
    level: ch?.level || null,
    xpEarned: verdict === "OK" ? baseXp : 0,
    code: code || undefined,
  });

  // update progress if accepted
  if (verdict === "OK") {
    const prog = await Progress.findOne({ userId }) || await Progress.create({ userId });

    // total xp
    prog.xp = (prog.xp || 0) + baseXp;

    // per-topic stats
    const topic = ch?.topic || "General";
    prog.topics = prog.topics || {};
    if (!prog.topics[topic]) prog.topics[topic] = { solved: 0, xp: 0 };
    prog.topics[topic].solved += 1;
    prog.topics[topic].xp += baseXp;

    // history for charts
    bumpHistory(prog, baseXp, 1);

    // award badges
    awardBadges(prog);

    await prog.save();
  }

  res.json({ ok: true, submissionId: sub._id });
});

export default router;
