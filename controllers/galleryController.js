import Gallery from "../models/Gallery.js";
import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";

const bufferToStream = (buffer) => {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
};

const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "gallery",
        transformation: [
          { width: 800, height: 600, crop: "fill" },
          { quality: "auto" },
        ],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    const stream = bufferToStream(fileBuffer);
    stream.pipe(uploadStream);
  });
};

export const getGalleryImages = async (req, res) => {
  try {
    const images = await Gallery.find().sort({ uploadedAt: -1 });
    res.status(200).json(images);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const addGalleryImage = async (req, res) => {
  try {
    const { title } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const result = await uploadToCloudinary(file.buffer);

    const newImage = new Gallery({
      title,
      imageUrl: result.secure_url,
      cloudinaryId: result.public_id,
      isDefault: false,
      uploadedBy: req.user?.id || null,
    });

    await newImage.save();
    res.status(201).json(newImage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteGalleryImage = async (req, res) => {
  try {
    const { id } = req.params;

    const image = await Gallery.findById(id);

    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }

    if (!image.isDefault && image.cloudinaryId) {
      await cloudinary.uploader.destroy(image.cloudinaryId);
    }

    await Gallery.findByIdAndDelete(id);

    res.status(200).json({ message: "Image deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const seedDefaultImages = async (req, res) => {
  try {
    const defaultImages = [];

    await Gallery.deleteMany({ isDefault: true });

    for (const imageData of defaultImages) {
      const image = new Gallery({
        ...imageData,
        isDefault: true,
      });
      await image.save();
    }

    res.status(200).json({ message: "Default images seeded successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
