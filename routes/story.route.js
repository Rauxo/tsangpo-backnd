import express from "express";
import {
  createStory,
  getAllStories,
  getStoryById,
  updateStory,
  deleteStory,
  getUserStories,
  toggleLike,
  getPopularStories,
  getRecentStories,
  getStoriesByTag,
  searchStories,
  getStoryStats
} from "../controllers/story.controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", getAllStories);
router.get("/popular", getPopularStories);
router.get("/recent", getRecentStories);
router.get("/tag/:tag", getStoriesByTag);
router.get("/search", searchStories);
router.get("/:id", getStoryById);

router.post("/", auth, createStory);
router.put("/:id", auth, updateStory);
router.delete("/:id", auth, deleteStory);
router.post("/:id/like", auth, toggleLike);

router.get("/user/my-stories", auth, getUserStories);
router.get("/user/stats", auth, getStoryStats);

export default router;