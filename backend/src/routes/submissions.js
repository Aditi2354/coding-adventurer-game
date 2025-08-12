import { Router } from "express";
import Submission from "../models/Submission.js";

const router = Router();

router.get("/", async (req, res) => {
  const list = await Submission.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json(list);
});

export default router;
