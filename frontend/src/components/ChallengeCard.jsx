import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../utils/api";

export default function ChallengeCard({ ch }) {
  const isCF = !!ch.external?.url;

  const verifyCF = async () => {
  try {
    const { contestId, index } = ch.external;
    const r = await api.post("/cf/verify", {
      contestId, index, xp: ch.xpReward, topic: ch.topic || "General"
    });
    if (r.data.solved) alert(`Accepted on CF! +${r.data.xp} XP`);
    else alert("Not Accepted yet. Submit on CF and Verify again.");
  } catch (e) {
    alert(e?.response?.data?.error || "Verify failed");
  }
};

  return (
    <motion.div whileHover={{ scale: 1.02 }} className="card min-w-[240px]">
      <h4 className="font-semibold">{ch.title}</h4>
      <p className="text-sm text-white/70 mt-1">
        {ch.topic} • {ch.level}{ch.rating ? ` • ${ch.rating}` : ""}
      </p>
      <div className="flex items-center justify-between mt-3">
        <div className="text-xs">XP: <strong>{ch.xpReward}</strong></div>
        {isCF ? (
          <div className="flex gap-2">
            <a href={ch.external.url} target="_blank" rel="noreferrer" className="btn text-sm">Open</a>
            <button onClick={verifyCF} className="btn text-sm">Verify</button>
          </div>
        ) : (
          <Link to={`/challenge/${ch._id}`} className="btn text-sm">Play</Link>
        )}
      </div>
    </motion.div>
  );
}
