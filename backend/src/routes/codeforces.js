// backend/src/routes/codeforces.js
import express from "express";
import axios from "axios";
import fs from "fs";
import path from "path";

const router = express.Router();

/* -------------------- caches & constants -------------------- */
const resultCache = new Map();            // per (tag|min|max|limit)
const RESULT_TTL_MS = 10 * 60 * 1000;     // 10 min

let cfDumpCache = null;                    // full dump cache
const DUMP_TTL_MS = 6 * 60 * 60 * 1000;   // 6 hours

const CF_TIMEOUT = Number(process.env.CF_TIMEOUT || 25000);

/* -------------------- local snapshot fallback -------------------- */
const SNAP_PATH = path.join(process.cwd(), "src", "data", "cfSnapshot.min.json");
let SNAPSHOT = [];
try {
  if (fs.existsSync(SNAP_PATH)) {
    SNAPSHOT = JSON.parse(fs.readFileSync(SNAP_PATH, "utf8"));
    console.log(`[CF] Local snapshot loaded: ${SNAPSHOT.length} problems`);
  }
} catch (e) {
  console.warn("[CF] Snapshot load failed:", e?.message || e);
  SNAPSHOT = [];
}

/* -------------------- helpers -------------------- */
async function retry(fn, tries = 3, baseDelay = 400) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e) { last = e; await new Promise(r => setTimeout(r, baseDelay * (i + 1))); }
  }
  throw last;
}

// user-friendly → official CF tag
const TAG_ALIASES = {
  // DS
  "heap": "data structures",
  "heaps": "data structures",
  "priorityqueue": "data structures",
  "priority queue": "data structures",

  // Graphs
  "bfs": "graphs",
  "dfs": "graphs",
  "graph": "graphs",
  "graphs": "graphs",
  "shortest path": "shortest paths",
  "shortest paths": "shortest paths",

  // Search / two pointers
  "binarysearch": "binary search",
  "bs": "binary search",
  "two pointers": "two pointers",
  "twopointers": "two pointers",

  // Common topics
  "dp": "dp",
  "math": "math",
  "greedy": "greedy",
  "implementation": "implementation",
  "strings": "strings",
  "string": "strings",
  "bitmask": "bitmasks",
  "bitmasks": "bitmasks",
  "combinatorics": "combinatorics",
  "geometry": "geometry",

  // closest to “recursion”
  "recursion": "divide and conquer",
};

function normalizeWords(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveTag(input) {
  const raw = normalizeWords(input);
  if (!raw) return "";
  const keyNoSpaces = raw.replace(/ /g, "");
  if (TAG_ALIASES[keyNoSpaces]) return TAG_ALIASES[keyNoSpaces];
  if (TAG_ALIASES[raw]) return TAG_ALIASES[raw];
  return raw;
}

/* -------------------- CF host + mirror helper -------------------- */
const CF_BASES = [
  "https://codeforces.com",
  "https://mirror.codeforces.com",
];

async function getCF(pathName, { params, timeout = CF_TIMEOUT } = {}) {
  let lastErr;
  for (const base of CF_BASES) {
    try {
      const url = `${base}/api/${pathName}`;
      const { data } = await axios.get(url, {
        params,
        timeout,
        headers: {
          "User-Agent": "AlgoQuest/1.0",
          "Accept-Encoding": "gzip, deflate, br",
        },
      });
      return data;
    } catch (e) {
      lastErr = e; // try next base
    }
  }
  throw lastErr;
}

/* -------------------- live fetchers using helper -------------------- */
async function fetchByTag(tag) {
  const data = await getCF("problemset.problems", {
    params: { tags: tag },
    timeout: CF_TIMEOUT,
  });
  if (data.status !== "OK") throw new Error("CF status not OK");
  return data.result.problems || [];
}

async function fetchDump() {
  if (cfDumpCache && (Date.now() - cfDumpCache.at) < DUMP_TTL_MS) {
    return cfDumpCache.problems;
  }
  const data = await getCF("problemset.problems", {
    timeout: Math.max(CF_TIMEOUT, 45000),
  });
  if (data.status !== "OK") throw new Error("CF dump status not OK");
  const problems = (data.result && data.result.problems) || [];
  cfDumpCache = { at: Date.now(), problems };
  console.log(`[CF] Live dump cached: ${problems.length} problems`);
  return problems;
}

/* -------------------- route -------------------- */
router.get("/problems", async (req, res) => {
  const rawTag = String(req.query.tag || "");
  const tag = resolveTag(rawTag);
  const min = Number(req.query.min || 0);
  const max = Number(req.query.max || 4000);
  const limit = Number(req.query.limit || 20);

  if (!tag) return res.json([]);

  console.log(`[CF] Tag request: "${rawTag}" -> "${tag}" | range ${min}-${max} | limit ${limit}`);

  const cacheKey = `${tag}|${min}|${max}|${limit}`;
  const cached = resultCache.get(cacheKey);
  if (cached && (Date.now() - cached.at) < RESULT_TTL_MS) {
    // cached response: we don't know original source, but return as-is without source header
    return res.json(cached.data);
  }

  const mapOut = (arr) =>
    arr
      // allow unrated problems, otherwise filter by rating range
      .filter(p => (typeof p.rating !== "number") || (p.rating >= min && p.rating <= max))
      .slice(0, limit)
      .map(p => ({
        _id: `${p.contestId}-${p.index}`,
        title: p.name,
        rating: p.rating ?? null,
        topic: tag, // resolved/official tag
        level:
          p.rating == null ? "Unrated" :
          p.rating < 1200 ? "Beginner" :
          p.rating < 1600 ? "Intermediate" : "Advanced",
        external: {
          url: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`,
          platform: "codeforces",
          contestId: p.contestId,
          index: p.index,
        },
      }));

  try {
    // 1) live per-tag
    const list = await retry(() => fetchByTag(tag), 3);
    const out = mapOut(list);
    resultCache.set(cacheKey, { at: Date.now(), data: out });
    res.set({ "X-CF-Source": "live", "X-CF-Tag": tag });
    return res.json(out);
  } catch (e1) {
    console.warn("[CF] Live per-tag fetch failed:", e1?.message || e1);
    try {
      // 2) cached full dump
      const dump = await retry(() => fetchDump(), 2);
      const tagLower = tag.toLowerCase();
      const filtered = dump.filter(p =>
        (p.tags || []).some(t => (t || "").toLowerCase() === tagLower)
      );
      const out = mapOut(filtered);
      resultCache.set(cacheKey, { at: Date.now(), data: out });
      res.set({ "X-CF-Source": "dump", "X-CF-Tag": tag });
      return res.json(out);
    } catch (e2) {
      console.warn("[CF] Dump fetch failed:", e2?.message || e2);
      // 3) local snapshot
      const tagLower = tag.toLowerCase();
      const filtered = SNAPSHOT.filter(p =>
        (p.tags || []).some(t => (t || "").toLowerCase() === tagLower)
      );
      const out = mapOut(filtered);
      resultCache.set(cacheKey, { at: Date.now(), data: out });
      res.set({ "X-CF-Source": "snapshot", "X-CF-Tag": tag });
      return res.json(out);
    }
  }
});

export default router;
