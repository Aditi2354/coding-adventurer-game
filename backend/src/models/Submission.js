import mongoose from "mongoose";

const DetailSchema = new mongoose.Schema({
  input: String,
  expected: String,
  output: String,
  pass: Boolean
}, { _id: false });

const SubmissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  challengeId: String,
  source: String,
  languageId: Number,
  passedAll: Boolean,
  passedCount: Number,
  total: Number,
  xpGain: Number,
  details: [DetailSchema],
  meta: {
    topic: String,
    external: { type: Boolean, default: false }
  }
}, { timestamps: true });

SubmissionSchema.index({ userId: 1, challengeId: 1, createdAt: -1 });

export default mongoose.model("Submission", SubmissionSchema);
