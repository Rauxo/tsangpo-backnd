import mongoose from "mongoose";

const storySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    subtitle: {
      type: String,
      trim: true
    },
    author: {
      type: String,
      trim: true,
      default: "Admin"
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    images: {
      image1: { type: String, default: null },
      image2: { type: String, default: null },
      image3: { type: String, default: null },
      image4: { type: String, default: null }
    },
    tags: [{
      type: String,
      trim: true
    }],
    isDefault: {
      type: Boolean,
      default: false
    },
    isPublished: {
      type: Boolean,
      default: true
    },
    views: {
      type: Number,
      default: 0
    },
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

storySchema.virtual("likeCount").get(function() {
  return this.likes.length;
});

storySchema.virtual("excerpt").get(function() {
  return this.content.length > 100 
    ? this.content.substring(0, 100) + "..."
    : this.content;
});

storySchema.index({ title: 'text', content: 'text', subtitle: 'text' });

export default mongoose.model("Story", storySchema);