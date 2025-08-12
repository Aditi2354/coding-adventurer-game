import axios from "axios";

const CF_API = "https://codeforces.com/api";

export async function fetchCFProblems({ tag = "", min = 800, max = 1300, limit = 20 }) {
  const { data } = await axios.get(`${CF_API}/problemset.problems`);
  if (data.status !== "OK") throw new Error("CF API error");
  const out = [];

  for (const p of data.result.problems) {
    if (!p.rating) continue;
    if (p.rating < min || p.rating > max) continue;
    if (tag && !(p.tags || []).includes(tag)) continue;
    const id = `cf-${p.contestId}-${p.index}`;
    out.push({
      _id: id,
      title: p.name,
      topic: (p.tags[0] || "General"),
      level: p.rating < 1200 ? "Beginner" : p.rating < 1700 ? "Intermediate" : "Advanced",
      xpReward: Math.round((p.rating - 600) / 10),          // simple XP formula
      external: { url: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`, contestId: p.contestId, index: p.index },
      rating: p.rating,
    });
    if (out.length >= limit) break;
  }
  return out;
}

export async function getUserSubmissions(handle) {
  const { data } = await axios.get(`${CF_API}/user.status`, { params: { handle } });
  if (data.status !== "OK") throw new Error("CF API error");
  return data.result || [];
}

export function findAcceptedForProblem(subs, contestId, index) {
  return subs.find(s =>
    s.problem?.contestId === Number(contestId) &&
    s.problem?.index === String(index) &&
    s.verdict === "OK"
  );
}
