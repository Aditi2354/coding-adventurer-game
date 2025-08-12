import React from "react";
import { motion } from "framer-motion";

export default function Hero({ onOpenMap }){
  return (
    <section className="card flex items-center gap-6 p-8 mb-6">
      <div>
        <h1 className="text-3xl font-bold">Start your Coding Adventure</h1>
        <p className="mt-2 text-white/80">Solve challenges, earn XP, level up and conquer topics.</p>
        <div className="mt-4">
          <button onClick={onOpenMap} className="btn">Open Adventure Map</button>
        </div>
      </div>
      <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="ml-auto">
        <div className="h-40 w-40 rounded-xl bg-gradient-to-br from-[#0ea5a6] to-[#6d28d9] flex items-center justify-center text-xl font-bold">
          <span>XP</span>
        </div>
      </motion.div>
    </section>
  );
}
