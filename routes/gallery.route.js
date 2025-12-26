import express from 'express';
import {
  getGalleryImages,
  addGalleryImage,
  deleteGalleryImage,
  seedDefaultImages
} from '../controllers/galleryController.js';
import upload from '../middlewares/upload.js';
import {auth} from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', getGalleryImages);

router.post('/', auth, upload.single('image'), addGalleryImage);
router.delete('/:id', auth, deleteGalleryImage);
router.post('/seed-defaults', auth, seedDefaultImages);

export default router;