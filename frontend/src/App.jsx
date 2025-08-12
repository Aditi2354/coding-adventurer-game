
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import AdventureMap from "./pages/AdventureMap";
import Dashboard from "./pages/Dashboard";
import ChallengePage from "./pages/ChallengePage";
import { AuthProvider } from "./Context/AuthContext";
import Signin from "./pages/Signin";
import Signup from "./pages/Signup";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-6xl mx-auto p-4">
          <Routes>
            <Route path="/signin" element={<Signin />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/" element={<AdventureMap />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/challenge/:id" element={<ProtectedRoute><ChallengePage /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}
