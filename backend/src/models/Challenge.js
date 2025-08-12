import mongoose from "mongoose";

const TestCaseSchema = new mongoose.Schema({
  input: String,
  expectedOutput: String
}, { _id: false });

const ChallengeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  topic: { type: String, default: "General" },
  level: { type: String, enum: ["Beginner", "Intermediate", "Advanced"], default: "Beginner" },
  xpReward: { type: Number, default: 10 },
  testCases: { type: [TestCaseSchema], default: [] }
}, { timestamps: true });

export default mongoose.model("Challenge", ChallengeSchema);
