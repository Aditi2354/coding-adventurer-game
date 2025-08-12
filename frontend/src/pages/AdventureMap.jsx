// src/pages/AdventureMap.jsx
import React, { useEffect, useState, useRef } from "react";
import api from "../utils/api";
import ChallengeCard from "../components/ChallengeCard";
import Hero from "../components/Hero";
import { useAuth } from "../Context/AuthContext";

export default function AdventureMap() {
  const [items, setItems] = useState([]);
  const [useCF, setUseCF] = useState(true);   // default to CF
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(null);
  const mapRef = useRef(null);

  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // load progress (for unlocks)
        if (user) {
          const { data } = await api.get("/progress");
          setProgress(data);
        }
        if (useCF) {
          const r = await api.get("/cf/problems", { params: { tag: "greedy", min: 800, max: 1600, limit: 30 } });
          setItems(r.data);
        } else {
          const r = await api.get("/challenges");
          setItems(r.data);
        }
      } finally { setLoading(false); }
    })();
  }, [useCF, user]);

  // unlock filter by rating
  const lvl = progress?.level || 1;
  const maxRating = lvl === 1 ? 1200 : lvl === 2 ? 1500 : 9999;
  const show = useCF ? items.filter(p => (p.rating || 0) <= maxRating) : items;

  return (
    <div>
      <Hero onOpenMap={() => mapRef.current?.scrollIntoView({ behavior: "smooth" })} />
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm">Source:</span>
        <button className={`btn text-sm ${useCF ? "" : "opacity-60"}`} onClick={() => setUseCF(true)}>Codeforces</button>
        <button className={`btn text-sm ${!useCF ? "" : "opacity-60"}`} onClick={() => setUseCF(false)}>Local</button>
        <span className="ml-auto text-sm text-white/70">Level: {lvl}</span>
      </div>

      <div ref={mapRef} />

      {loading && <div className="card">Loading…</div>}

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-3">{useCF ? "Codeforces" : "Local"} Challenges</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {show.map(ch => <ChallengeCard ch={ch} key={ch._id} />)}
          {!show.length && <div className="text-white/60 text-sm">No items unlocked yet.</div>}
        </div>
      </section>
    </div>
  );
}
