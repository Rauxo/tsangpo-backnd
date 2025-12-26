import Story from "../models/story.model.js";
import cloudinary from "../config/cloudinary.js";

const uploadBase64ToCloudinary = async (base64String) => {
  if (!base64String) return null;
  
  try {
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
    
    const { Readable } = await import('stream');

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "stories",
          transformation: [
            { width: 1200, height: 800, crop: "fill" },
            { quality: "auto:good" }
          ]
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            reject(error);
          } else {
            resolve(result.secure_url);
          }
        }
      );
      
      const buffer = Buffer.from(base64Data, "base64");
      
      const stream = Readable.from(buffer);
      stream.pipe(uploadStream);
    });
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    return null;
  }
};

export const createStory = async (req, res) => {
  try {
    const { 
      title, 
      subtitle, 
      author, 
      content, 
      tags, 
      image1, 
      image2, 
      image3, 
      image4 
    } = req.body;
    
    const userId = req.userId;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required"
      });
    }

    const uploadedImages = {};
    
    if (image1) {
      uploadedImages.image1 = await uploadBase64ToCloudinary(image1);
    }
    if (image2) {
      uploadedImages.image2 = await uploadBase64ToCloudinary(image2);
    }
    if (image3) {
      uploadedImages.image3 = await uploadBase64ToCloudinary(image3);
    }
    if (image4) {
      uploadedImages.image4 = await uploadBase64ToCloudinary(image4);
    }

    let parsedTags = [];
    if (tags) {
      if (typeof tags === 'string') {
        parsedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      } else if (Array.isArray(tags)) {
        parsedTags = tags;
      }
    }

    const story = await Story.create({
      title,
      subtitle: subtitle || "",
      author: author || "Admin",
      content,
      tags: parsedTags,
      images: uploadedImages,
      createdBy: userId,
      isDefault: false,
      isPublished: true
    });

    res.status(201).json({
      success: true,
      message: "Story created successfully",
      data: story
    });
  } catch (error) {
    console.error("Create story error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating story",
      error: error.message
    });
  }
};

export const getAllStories = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sort = 'createdAt',
      order = 'desc',
      search,
      author,
      tag
    } = req.query;

    const query = { isPublished: true };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { subtitle: { $regex: search, $options: 'i' } }
      ];
    }

    if (author) {
      query.author = { $regex: author, $options: 'i' };
    }

    if (tag) {
      query.tags = { $in: [tag] };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    const stories = await Story.find(query)
      .populate("createdBy", "name email avatar")
      .populate("updatedBy", "name email")
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Story.countDocuments(query);

    res.status(200).json({
      success: true,
      count: stories.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: stories
    });
  } catch (error) {
    console.error("Get stories error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching stories",
      error: error.message
    });
  }
};

export const getStoryById = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
      .populate("createdBy", "name email avatar")
      .populate("updatedBy", "name email")
      .populate("likes", "name email");

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found"
      });
    }

    story.views += 1;
    await story.save();

    res.status(200).json({
      success: true,
      data: story
    });
  } catch (error) {
    console.error("Get story error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching story",
      error: error.message
    });
  }
};

export const updateStory = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      subtitle, 
      author, 
      content, 
      tags, 
      isPublished,
      image1, 
      image2, 
      image3, 
      image4 
    } = req.body;
    
    const userId = req.userId;

    const story = await Story.findById(id);
    
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found"
      });
    }

    if (story.createdBy.toString() !== userId.toString() && req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this story"
      });
    }

    const updates = { 
      title: title || story.title,
      subtitle: subtitle !== undefined ? subtitle : story.subtitle,
      author: author || story.author,
      content: content || story.content,
      isPublished: isPublished !== undefined ? isPublished : story.isPublished,
      updatedBy: userId
    };

    if (tags !== undefined) {
      let parsedTags = [];
      if (typeof tags === 'string' && tags.trim()) {
        parsedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      } else if (Array.isArray(tags)) {
        parsedTags = tags;
      }
      updates.tags = parsedTags;
    }

    const currentImages = story.images || {};
    
    if (image1 === "") {
      updates["images.image1"] = null;
    } else if (image1 && image1.startsWith('data:image')) {
      updates["images.image1"] = await uploadBase64ToCloudinary(image1);
    }

    if (image2 === "") {
      updates["images.image2"] = null;
    } else if (image2 && image2.startsWith('data:image')) {
      updates["images.image2"] = await uploadBase64ToCloudinary(image2);
    }

    if (image3 === "") {
      updates["images.image3"] = null;
    } else if (image3 && image3.startsWith('data:image')) {
      updates["images.image3"] = await uploadBase64ToCloudinary(image3);
    }

    if (image4 === "") {
      updates["images.image4"] = null;
    } else if (image4 && image4.startsWith('data:image')) {
      updates["images.image4"] = await uploadBase64ToCloudinary(image4);
    }

    const updatedStory = await Story.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    )
    .populate("createdBy", "name email avatar")
    .populate("updatedBy", "name email");

    res.status(200).json({
      success: true,
      message: "Story updated successfully",
      data: updatedStory
    });
  } catch (error) {
    console.error("Update story error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating story",
      error: error.message
    });
  }
};

export const deleteStory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const story = await Story.findById(id);
    
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found"
      });
    }
    if (story.createdBy.toString() !== userId.toString() && req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this story"
      });
    }

    if (story.isDefault) {
      return res.status(403).json({
        success: false,
        message: "Cannot delete default stories"
      });
    }

    await Story.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Story deleted successfully"
    });
  } catch (error) {
    console.error("Delete story error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting story",
      error: error.message
    });
  }
};

export const getUserStories = async (req, res) => {
  try {
    const userId = req.userId;
    
    const stories = await Story.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .populate("updatedBy", "name email");

    res.status(200).json({
      success: true,
      count: stories.length,
      data: stories
    });
  } catch (error) {
    console.error("Get user stories error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user stories",
      error: error.message
    });
  }
};

export const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const story = await Story.findById(id);
    
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found"
      });
    }

    const isLiked = story.likes.includes(userId);

    if (isLiked) {
      story.likes.pull(userId);
      await story.save();
      
      res.status(200).json({
        success: true,
        message: "Story unliked",
        liked: false,
        likeCount: story.likes.length
      });
    } else {
      story.likes.push(userId);
      await story.save();
      
      res.status(200).json({
        success: true,
        message: "Story liked",
        liked: true,
        likeCount: story.likes.length
      });
    }
  } catch (error) {
    console.error("Like toggle error:", error);
    res.status(500).json({
      success: false,
      message: "Error toggling like",
      error: error.message
    });
  }
};

export const getPopularStories = async (req, res) => {
  try {
    const stories = await Story.find({ isPublished: true })
      .sort({ views: -1, likes: -1 })
      .limit(10)
      .populate("createdBy", "name email avatar");

    res.status(200).json({
      success: true,
      count: stories.length,
      data: stories
    });
  } catch (error) {
    console.error("Get popular stories error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching popular stories",
      error: error.message
    });
  }
};

export const getRecentStories = async (req, res) => {
  try {
    const stories = await Story.find({ isPublished: true })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("createdBy", "name email avatar");

    res.status(200).json({
      success: true,
      count: stories.length,
      data: stories
    });
  } catch (error) {
    console.error("Get recent stories error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching recent stories",
      error: error.message
    });
  }
};

export const getStoriesByTag = async (req, res) => {
  try {
    const { tag } = req.params;
    
    const stories = await Story.find({ 
      tags: { $in: [tag] },
      isPublished: true 
    })
    .sort({ createdAt: -1 })
    .populate("createdBy", "name email avatar");

    res.status(200).json({
      success: true,
      count: stories.length,
      tag,
      data: stories
    });
  } catch (error) {
    console.error("Get stories by tag error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching stories by tag",
      error: error.message
    });
  }
};

export const searchStories = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Search query is required"
      });
    }

    const stories = await Story.find({
      $text: { $search: q },
      isPublished: true
    })
    .sort({ score: { $meta: "textScore" } })
    .populate("createdBy", "name email avatar");

    res.status(200).json({
      success: true,
      count: stories.length,
      query: q,
      data: stories
    });
  } catch (error) {
    console.error("Search stories error:", error);
    res.status(500).json({
      success: false,
      message: "Error searching stories",
      error: error.message
    });
  }
};

export const getStoryStats = async (req, res) => {
  try {
    const userId = req.userId;

    const totalStories = await Story.countDocuments({ createdBy: userId });
    const publishedStories = await Story.countDocuments({ 
      createdBy: userId, 
      isPublished: true 
    });
    const totalViews = await Story.aggregate([
      { $match: { createdBy: userId } },
      { $group: { _id: null, totalViews: { $sum: "$views" } } }
    ]);
    const totalLikes = await Story.aggregate([
      { $match: { createdBy: userId } },
      { $group: { _id: null, totalLikes: { $sum: { $size: "$likes" } } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalStories,
        publishedStories,
        draftStories: totalStories - publishedStories,
        totalViews: totalViews[0]?.totalViews || 0,
        totalLikes: totalLikes[0]?.totalLikes || 0
      }
    });
  } catch (error) {
    console.error("Get story stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching story statistics",
      error: error.message
    });
  }
};

export default {
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
};