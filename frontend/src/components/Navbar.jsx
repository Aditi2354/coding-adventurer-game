import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { GiBrain } from "react-icons/gi";
import { useAuth } from "../Context/AuthContext";

export default function Navbar() {
  const { user, loading, signout } = useAuth();
  const nav = useNavigate();

  const handleLogout = () => {
    signout();
    nav("/signin");
  };

  return (
    <header className="px-6 py-3 border-b border-white/10 bg-white/5 backdrop-blur-lg">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <GiBrain className="text-2xl text-primary" />
          <div>
            <div className="text-xl font-semibold">AlgoQuest</div>
            <div className="text-xs text-white/60">Learn by playing</div>
          </div>
        </Link>

        <nav className="flex items-center gap-4">
          <Link to="/dashboard" className="text-sm hover:underline">Dashboard</Link>
          <Link to="/" className="text-sm hover:underline">Adventure</Link>

          {loading ? (
            <span className="ml-3 text-sm text-white/60">…</span>
          ) : user ? (
            <>
              <span className="ml-3 text-sm font-medium">{user.name}</span>
              <button onClick={handleLogout} className="btn text-sm px-3 py-1">Logout</button>
            </>
          ) : (
            <>
              <Link to="/signin" className="btn text-sm px-3 py-1">Sign In</Link>
              <Link to="/signup" className="btn text-sm px-3 py-1">Sign Up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
