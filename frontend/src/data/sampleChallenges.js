// simple demo challenges used when backend absent
export const sampleChallenges = [
  {
    _id: "c1",
    title: "Reverse String",
    description: "Given a string, return its reverse.",
    topic: "Strings",
    level: "Beginner",
    xpReward: 10,
    testCases: [{ input: "hello", expectedOutput: "olleh" }]
  },
  {
    _id: "c2",
    title: "Sum of Array",
    description: "Given array of numbers, return the sum.",
    topic: "Arrays",
    level: "Beginner",
    xpReward: 12,
    testCases: [{ input: "[1,2,3]", expectedOutput: "6" }]
  },
  {
    _id: "c3",
    title: "Fibonacci Nth",
    description: "Return Nth Fibonacci (0-indexed).",
    topic: "Recursion",
    level: "Intermediate",
    xpReward: 20,
    testCases: [{ input: "5", expectedOutput: "5" }]
  }
];
