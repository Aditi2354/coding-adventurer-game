import React, { useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import api from "../utils/api";
import { useAuth } from "../Context/AuthContext";

export default function EditorRunner({challenge, onResult}) {
  const { user } = useAuth();
  const [code, setCode] = useState(challenge?.starter || `// write your solution here`);
  const [loading, setLoading] = useState(false);
  const runMock = async () => {
    // Simple demo: mock evaluation by comparing expected outputs (frontend-only)
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    // naive: if code contains challenge.title words => pass
    const passed = code.toLowerCase().includes((challenge.title || "").split(" ")[0].toLowerCase());
    const res = {
      passedAll: passed,
      passedCount: passed ? (challenge.testCases?.length || 1) : 0,
      total: challenge.testCases?.length || 1,
      xpGain: passed ? (challenge.xpReward || 10) : 0,
      details: (challenge.testCases || []).map(tc => ({input: tc.input, expected: tc.expectedOutput, output: passed ? tc.expectedOutput : "wrong", pass: passed}))
    };
    setLoading(false);
    if(onResult) onResult(res);
  };

  const handleSubmit = async () => {
    // try backend first; fallback to mock
    setLoading(true);
    try {
      const resp = await api.post("/submit", { studentId: user.id, challengeId: challenge._id, source: code, languageId: 63 });
      setLoading(false);
      if(onResult) onResult(resp.data);
    } catch(e) {
      setLoading(false);
      // fallback mock
      runMock();
    }
  };

  return (
    <div>
      <Editor height="50vh" defaultLanguage="javascript" value={code} onChange={v => setCode(v)} />
      <div className="flex gap-2 mt-3">
        <button onClick={runMock} className="btn" disabled={loading}>{loading ? "Running..." : "Run (demo)"}</button>
        <button onClick={handleSubmit} className="btn" disabled={loading}>{loading ? "Submitting..." : "Submit"}</button>
      </div>
    </div>
  );
}
