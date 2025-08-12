// backend/src/scripts/buildCfSnapshot.mjs
import fs from "fs";
import path from "path";
import axios from "axios";

// ---------- where we will write ----------
const OUT = path.join(process.cwd(), "src", "data", "cfSnapshot.min.json");

// ---------- knobs you may tweak ----------
const MIN_RATING = 800;
const MAX_RATING = 2200;
// final snapshot target size; script balances per rating bucket
const TARGET_SIZE = 1200;

// rating buckets (inclusive,exclusive except last)
const BUCKETS = [
  [800, 1000],
  [1000, 1200],
  [1200, 1400],
  [1400, 1600],
  [1600, 1800],
  [1800, 2201], // 2201 to include 2200
];

// per-bucket cap so total ~= TARGET_SIZE
const PER_BUCKET = Math.ceil(TARGET_SIZE / BUCKETS.length);

// CF API bases + timeout
const CF_BASES = [
  "https://codeforces.com",
  "https://mirror.codeforces.com",
];
const CF_TIMEOUT = Number(process.env.CF_TIMEOUT || 30000);

// -------------------------------------------------------------

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function getCF(pathName, { params, timeout = CF_TIMEOUT } = {}) {
  let lastErr;
  for (const base of CF_BASES) {
    try {
      const url = `${base}/api/${pathName}`;
      const { data } = await axios.get(url, {
        params,
        timeout,
        headers: {
          "User-Agent": "AlgoQuest/1.0 (snapshot builder)",
          "Accept-Encoding": "gzip, deflate, br"
        }
      });
      return data;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function retry(fn, tries = 4, baseDelay = 700) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e) {
      last = e;
      if (i < tries - 1) await sleep(baseDelay * (i + 1));
    }
  }
  throw last;
}

// tiny helper to shuffle
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function inRange(r) {
  if (typeof r !== "number") return false;
  return r >= MIN_RATING && r <= MAX_RATING;
}

function bucketIndex(r) {
  for (let i = 0; i < BUCKETS.length; i++) {
    const [lo, hi] = BUCKETS[i];
    if (r >= lo && r < hi) return i;
  }
  return -1;
}

(async () => {
  console.log("→ Building local CF snapshot…");

  // 1) pull the full problemset once
  let data;
  try {
    data = await retry(() => getCF("problemset.problems"), 3);
  } catch (e) {
    console.error("✖ Could not download from Codeforces (even mirror).");
    console.error("  Error:", e?.message || e);
    // If you already have an older snapshot, keep it.
    if (fs.existsSync(OUT)) {
      console.log("Keeping existing snapshot:", OUT);
      process.exit(0);
    }
    process.exit(1);
  }

  if (data.status !== "OK") {
    console.error("✖ CF replied with non-OK status:", data.status);
    process.exit(1);
  }

  const problems = (data.result && data.result.problems) || [];
  console.log(`✓ Downloaded ${problems.length} problems from CF`);

  // 2) filter by rating & with at least one tag (for topic grouping)
  const filtered = problems
    .filter(p => inRange(p.rating))
    .filter(p => Array.isArray(p.tags) && p.tags.length);

  console.log(`→ Filter by rating ${MIN_RATING}-${MAX_RATING}: ${filtered.length} remain`);

  // 3) group into rating buckets and take up to PER_BUCKET from each
  const buckets = Array.from({ length: BUCKETS.length }, () => []);
  for (const p of filtered) {
    const bi = bucketIndex(p.rating);
    if (bi >= 0) buckets[bi].push(p);
  }
  buckets.forEach((b, i) => {
    shuffle(b);
    if (b.length > PER_BUCKET) b.length = PER_BUCKET;
    console.log(
      `  bucket ${i + 1} [${BUCKETS[i][0]}-${BUCKETS[i][1] - 1}] -> ${b.length}`
    );
  });

  let picked = buckets.flat();

  // 4) de-dup (shouldn't duplicate but safe)
  const seen = new Set();
  picked = picked.filter(p => {
    const id = `${p.contestId}-${p.index}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  // 5) trim to TARGET_SIZE (if still larger)
  shuffle(picked);
  if (picked.length > TARGET_SIZE) picked.length = TARGET_SIZE;

  console.log(`→ Keeping ${picked.length} problems for final snapshot`);

  // 6) write compact JSON (only the fields your backend uses)
  const out = picked.map(p => ({
    contestId: p.contestId,
    index: p.index,
    name: p.name,
    rating: p.rating ?? null,
    tags: p.tags || []
  }));

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out));

  console.log("✓ Snapshot written to:", OUT);
  console.log("Done.");
})().catch((e) => {
  console.error("✖ Snapshot build failed:", e?.message || e);
  process.exit(1);
});
