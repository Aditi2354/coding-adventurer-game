import React, { useState } from "react";
import { useAuth } from "../Context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

export default function Signin() {
  const { signin } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signin(email, password);
      nav("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <form onSubmit={handle} className="card w-full max-w-md p-8 space-y-5 bg-white/10 backdrop-blur-xl border border-white/10">
        <h2 className="text-2xl font-bold text-center">Sign In</h2>
        {error && <div className="text-red-400 text-sm">{error}</div>}
        <input className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-primary"
               type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-primary"
               type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="btn w-full justify-center" disabled={loading}>{loading ? "Signing in..." : "Sign In"}</button>
        <p className="text-sm text-white/70 text-center">
          Don’t have an account? <Link to="/signup" className="text-primary hover:underline">Sign Up</Link>
        </p>
      </form>
    </div>
  );
}
