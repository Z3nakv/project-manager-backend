import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/", async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "ok" : "error";
  res.json({ status: "ok", timestamp: new Date().toISOString(), database: dbStatus });
});

export default router;