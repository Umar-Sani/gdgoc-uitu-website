import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import cloudinary from '../lib/cloudinary';
import { requireAuth } from '../middleware/auth';

const router = Router();

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Wrap multer so its errors surface as JSON instead of HTML
function uploadSingle(req: Request, res: Response, next: NextFunction) {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err) {
      res.status(400).json({ error: (err as Error).message });
      return;
    }
    next();
  });
}

// POST /api/upload?folder=gdgoc-uitu/team
router.post('/', requireAuth, uploadSingle, async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image file provided' });
      return;
    }

    const folder =
      typeof req.query.folder === 'string' && req.query.folder
        ? req.query.folder
        : 'gdgoc-uitu';

    // Convert buffer to base64 data URI — avoids needing streamifier
    const b64     = req.file.buffer.toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder,
      resource_type: 'image',
    });

    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    console.error('Cloudinary upload error:', message);
    res.status(500).json({ error: message });
  }
});

export default router;
