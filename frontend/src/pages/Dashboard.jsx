import { useEffect, useState } from "react";
import api from "../utils/api";
import { useAuth } from "../Context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();

  const [data, setData] = useState(null);

  // CF suggestions + weak topics UX
  const [suggestions, setSuggestions] = useState([]);
  const [topicInput, setTopicInput] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [loadingSug, setLoadingSug] = useState(false);

  // Source banner from backend (live | dump | snapshot)
  const [cfSource, setCfSource] = useState("live");
  const [showSourceNote, setShowSourceNote] = useState(false);

  // Link CF handle
  const [cfHandle, setCfHandle] = useState("");
  const [savingCF, setSavingCF] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/progress");
        setData(r.data);
        setCfHandle(r.data?.cfHandle || "");
      } catch {
        setData(null);
      }
    })();
  }, [user]);

  if (!data) return <div>Loading...</div>;

  const rangeForLevel = (L) => {
    if (L === "Beginner") return { min: 800, max: 1200 };
    if (L === "Intermediate") return { min: 1200, max: 1500 };
    return { min: 1500, max: 2000 };
  };

  const addWeak = async () => {
    const t = topicInput.trim();
    if (!t) return;
    const r = await api.patch("/progress/weak-topics", { add: [t] });
    setData({ ...data, weakTopics: r.data.weakTopics });
    setTopicInput("");
  };

  const removeWeak = async (t) => {
    const r = await api.patch("/progress/weak-topics", { remove: [t] });
    setData({ ...data, weakTopics: r.data.weakTopics });
    setSelectedTopics((prev) => prev.filter((x) => x !== t));
  };

  // ===== CF Suggestions: multi-topic + normalize + de‑dup + source banner =====
  const getSuggestions = async () => {
    // 1) collect topics: selected chips + (optional) the input box
    const topicsRaw = (selectedTopics.length ? selectedTopics : (data.weakTopics || []))
      .concat(topicInput.trim() ? [topicInput.trim()] : []);

    const topicsClean = Array.from(
      new Set(topicsRaw.map((t) => t.trim()).filter(Boolean))
    );
    if (!topicsClean.length) {
      alert("Select or add at least one weak topic");
      return;
    }

    // 2) normalizers + alias map to CF's tags
    const splitCamel = (s) => s.replace(/([a-z])([A-Z])/g, "$1 $2");
    const normWords = (s) =>
      s.toLowerCase().replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();

    const aliasMap = {
      implementation: "implementation",
      math: "math",
      greedy: "greedy",
      dp: "dp",
      dynamicprogramming: "dp",
      recursion: "divide and conquer",
      bruteforce: "brute force",
      brute: "brute force",
      constructive: "constructive algorithms",
      constructivealgorithms: "constructive algorithms",
      string: "strings",
      strings: "strings",
      hashing: "hashing",
      zfunction: "strings",
      kmp: "strings",
      suffixarray: "string suffix structures",
      suffix: "string suffix structures",
      trie: "data structures",
      binarysearch: "binary search",
      ternarysearch: "ternary search",
      twopointers: "two pointers",
      slidingwindow: "two pointers",
      prefixsum: "data structures",
      datastructures: "data structures",
      stack: "data structures",
      stacks: "data structures",
      queue: "data structures",
      queues: "data structures",
      deque: "data structures",
      priorityqueue: "priority queue",
      heap: "priority queue",
      heaps: "priority queue",
      pq: "priority queue",
      fenwick: "fenwick tree",
      bit: "fenwick tree",
      fenwicktree: "fenwick tree",
      segmenttree: "data structures",
      segtree: "data structures",
      unionfind: "dsu",
      dsu: "dsu",
      disjointset: "dsu",
      graph: "graphs",
      graphtheory: "graphs",
      graphs: "graphs",
      tree: "trees",
      trees: "trees",
      bintree: "trees",
      bst: "trees",
      bfs: "graphs",
      dfs: "graphs",
      shortestpath: "shortest paths",
      dijkstra: "shortest paths",
      bellmanford: "shortest paths",
      floydwarshall: "shortest paths",
      mst: "minimum spanning tree",
      kruskal: "minimum spanning tree",
      prim: "minimum spanning tree",
      flow: "flows",
      maxflow: "flows",
      matching: "graph matchings",
      topologicalsort: "graphs",
      numbertheory: "number theory",
      combinatorics: "combinatorics",
      probability: "probabilities",
      probabilities: "probabilities",
      matrices: "matrices",
      fft: "fft",
      divideandconquer: "divide and conquer",
      meetinthemiddle: "meet-in-the-middle",
      games: "games",
      geometry: "geometry",
      bitmask: "bitmasks",
      bitmasks: "bitmasks",
      sortings: "sortings",
      sorting: "sortings",
      arrays: "implementation",
      array: "implementation",
    };

    const candidatesFor = (t) => {
      const cc = splitCamel(t);
      const base = normWords(cc); // e.g. "priority queue"
      const nos = base.replace(/ /g, ""); // "priorityqueue"
      const alias = aliasMap[nos];

      const words = base.split(" ");
      const plural =
        words.length > 0
          ? [...words.slice(0, -1), words[words.length - 1] + "s"].join(" ")
          : base;

      // Unique candidates, best first
      return Array.from(new Set([alias || base, plural]));
    };

    const { min, max } = rangeForLevel(level);

    // 3) fire requests in parallel for every (topic,candidateTag)
    const requests = [];
    for (const topic of topicsClean) {
      for (const tag of candidatesFor(topic)) {
        requests.push(
          api
            .get("/cf/problems", { params: { tag, min, max, limit: 12 } })
            .then((r) => {
              const source = (r.headers && r.headers["x-cf-source"]) || "live";
              return {
                source,
                rows: Array.isArray(r.data)
                  ? r.data.map((p) => ({ ...p, _topic: topic, _tagTried: tag }))
                  : [],
              };
            })
            .catch(() => ({ source: null, rows: [] }))
        );
      }
    }

    setLoadingSug(true);
    try {
      const chunks = await Promise.all(requests);

      // effective source banner decision
      const sources = chunks.map((c) => c.source).filter(Boolean);
      let effective = "live";
      if (sources.length && sources.every((s) => s !== "live")) {
        effective = sources.includes("dump") ? "dump" : "snapshot";
      }
      setCfSource(effective);
      setShowSourceNote(effective !== "live");

      const flat = chunks.flatMap((c) => c.rows);

      // 4) de‑dup by _id
      const seen = new Set();
      const uniq = [];
      for (const p of flat) {
        if (!p || !p._id) continue;
        if (seen.has(p._id)) continue;
        seen.add(p._id);
        uniq.push(p);
      }
      setSuggestions(uniq);
    } finally {
      setLoadingSug(false);
    }
  };

  // ------- UI helpers -------
  const Chip = ({ t, checked, onToggle, onRemove }) => (
    <div
      onClick={onToggle}
      title="Select for suggestions"
      className={`cursor-pointer select-none inline-flex items-center gap-2 px-3 py-1 rounded-full transition
        ${checked
          ? "bg-amber-300 text-black shadow-[0_0_0_2px_rgba(0,0,0,0.15)]"
          : "bg-white/10 text-white hover:bg-white/15"
        }`}
    >
      <span
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[11px] font-bold
          ${checked ? "bg-emerald-400 text-black" : "bg-white/25 text-white/70"}`}
      >
        ✓
      </span>
      <span className="font-medium">{t}</span>
      <button
        className="ml-1 text-xs opacity-80 hover:opacity-100"
        title="Remove topic"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        ✕
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Your Dashboard</h2>

      {/* Source banner */}
      {showSourceNote && (
        <div className="rounded-lg bg-yellow-400/20 border border-yellow-400/40 text-yellow-200 px-4 py-2 text-sm">
          Live data unavailable, showing cached data from <b>{cfSource}</b>.
          <button
            className="ml-3 underline text-yellow-300"
            onClick={() => setShowSourceNote(false)}
          >
            hide
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Badges */}
        <div className="card">
          <h3 className="font-medium">Badges</h3>
          <div className="mt-3 flex gap-2 flex-wrap">
            {(data.badges || []).length ? (
              data.badges.map((b) => (
                <span key={b} className="badge">
                  {b}
                </span>
              ))
            ) : (
              <span className="text-white/60 text-sm">
                No badges yet — keep solving!
              </span>
            )}
          </div>
        </div>

        {/* Weak topics + CF suggestions */}
        <div className="card">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Weak Topics</h3>
            <div className="text-xs text-white/70 flex gap-3">
              <button
                className="underline"
                onClick={() => setSelectedTopics(data.weakTopics || [])}
              >
                Select all
              </button>
              <button className="underline" onClick={() => setSelectedTopics([])}>
                Clear selection
              </button>
            </div>
          </div>

          {/* Selectable topic chips */}
          <div className="mt-2 flex gap-2 flex-wrap">
            {(data.weakTopics || []).map((t) => {
              const checked = selectedTopics.includes(t);
              return (
                <Chip
                  key={t}
                  t={t}
                  checked={checked}
                  onToggle={() =>
                    setSelectedTopics((prev) =>
                      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
                    )
                  }
                  onRemove={() => removeWeak(t)}
                />
              );
            })}
          </div>

          {/* Add new weak topic */}
          <div className="mt-3 flex gap-2">
            <input
              className="px-3 py-2 rounded bg-white/20"
              placeholder="Add weak topic (e.g., greedy)"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
            />
            <button className="btn" onClick={addWeak}>
              Add
            </button>
          </div>

          {/* Level & fetch suggestions */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm">Practice level:</span>
            <select
              className="px-3 py-2 rounded bg-white/20"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>

            <button className="btn" onClick={getSuggestions}>
              {loadingSug ? "Loading..." : "Get CF Suggestions"}
            </button>
          </div>

          {/* Suggestions grid */}
          {!!suggestions.length && (
            <div className="mt-4 grid md:grid-cols-2 gap-3">
              {suggestions.map((p) => (
                <div key={p._id} className="bg-white/10 rounded-lg px-3 py-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{p.title}</div>
                      <div className="text-white/60 text-sm">
                        {(p._topic || p.topic)} • {p.level} • {p.rating ?? "—"}
                      </div>
                      {p._tagTried && (
                        <div className="text-[11px] text-white/40 mt-1">
                          tag tried: {p._tagTried}
                        </div>
                      )}
                    </div>
                    <a
                      className="btn text-sm"
                      href={p.external.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loadingSug && !suggestions.length && (
            <div className="mt-2 text-white/60 text-sm">No suggestions yet.</div>
          )}
        </div>

        {/* Link Codeforces */}
        <div className="card md:col-span-2">
          <h3 className="font-medium">Link Codeforces</h3>
          <div className="mt-3 flex gap-2 items-center">
            <input
              value={cfHandle}
              onChange={(e) => setCfHandle(e.target.value)}
              placeholder="Your CF handle (e.g., tourist)"
              className="px-3 py-2 rounded bg-white/20 flex-1"
            />
            <button
              className="btn"
              disabled={savingCF || !cfHandle.trim()}
              onClick={async () => {
                try {
                  setSavingCF(true);
                  await api.post("/cf/link", { handle: cfHandle.trim() });
                  alert("Codeforces handle saved!");
                  const r = await api.get("/progress");
                  setData(r.data);
                } catch (e) {
                  alert(e?.response?.data?.error || "Failed to save handle");
                } finally {
                  setSavingCF(false);
                }
              }}
            >
              {savingCF ? "Saving..." : "Save"}
            </button>

            {cfHandle && (
              <button
                className="btn text-sm"
                onClick={async () => {
                  try {
                    setSavingCF(true);
                    await api.post("/cf/link", { handle: "" });
                    setCfHandle("");
                    alert("Unlinked Codeforces handle");
                    const r = await api.get("/progress");
                    setData(r.data);
                  } catch (e) {
                    alert(e?.response?.data?.error || "Failed to unlink");
                  } finally {
                    setSavingCF(false);
                  }
                }}
              >
                Unlink
              </button>
            )}
          </div>
          <p className="mt-2 text-sm text-white/70">
            Open a problem on Codeforces, submit there, then return and click{" "}
            <b>Verify</b> on the card to earn XP & unlock.
          </p>
          {cfHandle && (
            <p className="mt-2 text-sm">
              Linked as: <span className="badge">{cfHandle}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
