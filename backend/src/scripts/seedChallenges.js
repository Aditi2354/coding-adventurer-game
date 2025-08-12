// backend/src/scripts/seedChallenges.js
import "dotenv/config";
import mongoose from "mongoose";
import Challenge from "../models/Challenge.js";

const seed = [
  {
    title: "Reverse String",
    description: "Given a string, return its reverse.",
    topic: "Strings",
    level: "Beginner",
    xpReward: 10,
    testCases: [
      { input: "hello", expectedOutput: "olleh" },
      { input: "world", expectedOutput: "dlrow" }
    ]
  },
  {
    title: "Sum of Array",
    description: "Given array of numbers, return the sum.",
    topic: "Arrays",
    level: "Beginner",
    xpReward: 12,
    testCases: [
      { input: "[1,2,3]", expectedOutput: "6" },
      { input: "[]", expectedOutput: "0" }
    ]
  },
  {
    title: "Fibonacci Nth",
    description: "Return Nth Fibonacci (0-indexed).",
    topic: "Recursion",
    level: "Intermediate",
    xpReward: 20,
    testCases: [
      { input: "5", expectedOutput: "5" },
      { input: "7", expectedOutput: "13" }
    ]
  }
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await Challenge.deleteMany({});
    const out = await Challenge.insertMany(seed);
    console.log(`Seeded ${out.length} challenges.`);
  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
  }
})();
