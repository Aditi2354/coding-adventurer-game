import mongoose from "mongoose";

const TopicStat = new mongoose.Schema({
  attempts: { type: Number, default: 0 },
  solved:   { type: Number, default: 0 },
}, { _id: false });

const ProgressSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, index: true, unique: true },
  xp:       { type: Number, default: 0 },
  level:    { type: Number, default: 1 },
  solved:   { type: [String], default: [] },       // e.g. ["cf-1791-A", "seed-1"]
  cfHandle: { type: String, default: "" },
  badges:   { type: [String], default: [] },       // earned badges
  topicStats: { type: Map, of: TopicStat, default: {} }, // {"Greedy": {attempts, solved}}
  weakTopics: { type: [String], default: [] }      // user chosen or auto computed
});

export default mongoose.model("Progress", ProgressSchema);
