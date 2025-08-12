import Progress from "../models/Progress.js";

export async function getOrCreateProgress(userId) {
  let p = await Progress.findOne({ userId });
  if (!p) p = await Progress.create({ userId });
  return p;
}

export async function updateAfterSubmissionDB(userId, { xpGain, topic, success, challengeId }) {
  const p = await getOrCreateProgress(userId);

  if (success) {
    p.xp += xpGain;
    p.level = Math.floor(p.xp / 100) + 1;

    if (!p.solvedChallenges.includes(challengeId)) {
      p.solvedChallenges.push(challengeId);
    }

    p.history.unshift({ xpGained: xpGain });
    if (p.history.length > 100) p.history = p.history.slice(0, 100);

    let t = p.topics.find(x => x.topic === topic);
    if (!t) {
      p.topics.push({ topic, attempts: 1, successes: 1, successRate: 100 });
    } else {
      t.attempts += 1;
      t.successes += 1;
      t.successRate = Math.round((t.successes / t.attempts) * 100);
    }

    if (p.xp >= 50 && !p.badges.includes("Getting Started")) p.badges.push("Getting Started");
    if (p.xp >= 100 && !p.badges.includes("XP Master")) p.badges.push("XP Master");
  } else {
    // mark weak topic
    if (topic && !p.weakTopics.includes(topic)) p.weakTopics.push(topic);

    let t = p.topics.find(x => x.topic === topic);
    if (!t) {
      p.topics.push({ topic, attempts: 1, successes: 0, successRate: 0 });
    } else {
      t.attempts += 1;
      t.successRate = Math.round((t.successes / t.attempts) * 100);
    }
  }

  await p.save();
  return p;
}
