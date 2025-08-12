import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Player } from "@lottiefiles/react-lottie-player";
import EditorRunner from "../components/EditorRunner";
import api from "../utils/api";
import { sampleChallenges } from "../data/sampleChallenges";

export default function ChallengePage() {
  const { id } = useParams();
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const r = await api.get(`/challenges/${id}`);
        if (mounted) setChallenge(r.data);
      } catch (e) {
        // fallback to local samples
        const fb = sampleChallenges.find(c => c._id === id);
        if (fb) setChallenge(fb);
        else setError(e?.response?.data?.error || "Failed to load challenge");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  if (loading) return <div className="card p-6 text-center">Loading challenge…</div>;
  if (error) return <div className="card p-6 text-red-400">{error}</div>;
  if (!challenge) return <div className="card p-6">Challenge not found.</div>;

  const isExternalCF = !!challenge.external?.url;

  return (
    <div className="flex flex-col items-center min-h-screen py-6">
      <h1 className="text-3xl font-bold mb-2">{challenge.title}</h1>
      <p className="text-white/80 max-w-xl text-center mb-6">{challenge.description}</p>

      {isExternalCF ? (
        <div className="card max-w-xl w-full text-center space-y-3">
          <p className="text-sm text-white/80">
            This is a Codeforces problem. Public testcases aren’t available via API.
          </p>
          <a
            href={challenge.external.url}
            target="_blank"
            rel="noreferrer"
            className="btn justify-center"
          >
            Open on Codeforces
          </a>
          <p className="text-xs text-white/60">
            Tip: Solve it on CF; your XP here tracks local problems only.
          </p>
        </div>
      ) : (
        <>
          <EditorRunner challenge={challenge} onResult={setResult} />

          {result && (
            <div className="mt-8 w-full max-w-2xl">
              {result.passedAll ? (
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-green-400 mb-2">Level Completed! 🎉</h2>
                  <Player
                    autoplay
                    loop={false}
                    src="https://assets4.lottiefiles.com/packages/lf20_zrqthn6o.json"
                    style={{ height: "220px", width: "220px", margin: "0 auto" }}
                  />
                  <p className="text-lg text-yellow-300 mt-3 font-semibold">
                    +{result.xpGain} XP Earned!
                  </p>
                  <div className="mt-4">
                    <Link to="/dashboard" className="btn">Go to Dashboard</Link>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-red-400 mb-2">Some Tests Failed ❌</h2>
                  <p className="text-white/70">Check where your solution went wrong.</p>
                </div>
              )}

              <table className="w-full mt-6 border border-white/20 rounded-lg overflow-hidden">
                <thead className="bg-white/10">
                  <tr>
                    <th className="p-2 text-left">Input</th>
                    <th className="p-2 text-left">Expected</th>
                    <th className="p-2 text-left">Output</th>
                    <th className="p-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.details.map((tc, idx) => (
                    <tr key={idx} className="border-t border-white/10">
                      <td className="p-2">{tc.input}</td>
                      <td className="p-2">{tc.expected}</td>
                      <td className="p-2">{tc.output}</td>
                      <td className="p-2 text-center">
                        {tc.pass ? (
                          <span className="text-green-400 font-bold">✔</span>
                        ) : (
                          <span className="text-red-400 font-bold">✘</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
