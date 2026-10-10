import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import cloudinary from '../lib/cloudinary';
import { sniffImage } from '../lib/imageSniff';
import { pool } from '../db/client';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// ── Folder allow-list (TODO-017) ─────────────────────────────────────────────
// Every folder a client may write to, and who may write there. `null` = any signed-in
// user (avatars are uploaded by members during onboarding and in settings). Anything
// not listed is rejected, so `?folder=` can no longer be used to write to arbitrary
// paths in the Cloudinary account. Keep in sync with the `folder` props in the frontend.
const FOLDER_ROLES: Record<string, string[] | null> = {
  'gdgoc-uitu/avatars':  null,
  'gdgoc-uitu/people':   ['admin', 'super_admin', 'editor'],
  'gdgoc-uitu/events':   ['admin', 'super_admin'],
  'gdgoc-uitu/team':     ['admin', 'super_admin'],
  'gdgoc-uitu/sponsors': ['admin', 'super_admin'],
};

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

// Runs after requireAuth and before multer, so a request for a folder the caller may not
// use is rejected without buffering up to 5 MB of body.
function requireFolderAccess(source: 'query' | 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    let folder: unknown;
    if (source === 'query') {
      folder = req.query.folder;
    } else {
      // DELETE: the folder is the leading part of the asset's public_id.
      const pid = req.body?.public_id;
      folder = typeof pid === 'string' ? pid.split('/').slice(0, -1).join('/') : undefined;
    }

    if (typeof folder !== 'string' || !Object.prototype.hasOwnProperty.call(FOLDER_ROLES, folder)) {
      res.status(400).json({
        data: null,
        error: `Invalid upload folder. Allowed: ${Object.keys(FOLDER_ROLES).join(', ')}`,
      });
      return;
    }

    (req as any).uploadFolder = folder;
    const roles = FOLDER_ROLES[folder];
    if (roles === null) return next();
    return requireRole(...roles)(req, res, next);
  };
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    // First, cheap filter on the declared type. The real check is the magic-byte sniff
    // in the handler — a client controls this header and can lie about it.
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, GIF and WebP images are allowed'));
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
router.post('/', requireAuth, requireFolderAccess('query'), uploadSingle, async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image file provided' });
      return;
    }

    // Trust the bytes, not the header. This also rejects SVG and HTML disguised as images.
    const sniffed = sniffImage(req.file.buffer);
    if (!sniffed) {
      res.status(400).json({ error: 'File content is not a valid JPEG, PNG, GIF or WebP image' });
      return;
    }

    const folder = (req as any).uploadFolder as string;

    // Convert buffer to base64 data URI — avoids needing streamifier. Uses the sniffed
    // type, never the client-declared one.
    const b64     = req.file.buffer.toString('base64');
    const dataURI = `data:${sniffed.mime};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder,
      resource_type: 'image',
      quality: 'auto',
      fetch_format: 'auto',
    });

    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    console.error('Cloudinary upload error:', message);
    res.status(500).json({ error: message });
  }
});

// DELETE /api/upload   body: { "public_id": "gdgoc-uitu/team/abc123" }
// Removes an asset that is no longer referenced, so replaced images stop piling up in
// Cloudinary (TODO-017). It is deliberately an explicit call and not wired into
// ImageUpload's replace flow: deleting at replace time would break the saved record if
// the user then cancels the form.
router.delete('/', requireAuth, requireFolderAccess('body'), async (req: Request, res: Response) => {
  try {
    const publicId = req.body.public_id as string;
    const folder   = (req as any).uploadFolder as string;

    // Shape check: only the leaf may follow the folder; no traversal, no odd characters.
    if (
      !/^[A-Za-z0-9_\-\/]+$/.test(publicId) ||
      publicId.includes('..') ||
      publicId.split('/').length !== folder.split('/').length + 1
    ) {
      res.status(400).json({ data: null, error: 'Invalid public_id' });
      return;
    }

    // Avatars have no role gate, so ownership is the gate: you may only delete the avatar
    // you are currently using. (Admin folders are protected by role instead.)
    if (FOLDER_ROLES[folder] === null) {
      const userId = (req as any).user.id;
      const { rows } = await pool.query(`SELECT avatar_url FROM users.users WHERE user_id = $1`, [userId]);
      const current: string | null = rows[0]?.avatar_url ?? null;
      if (!current || !current.includes(`/${publicId}`)) {
        res.status(403).json({ data: null, error: 'You can only delete your own avatar' });
        return;
      }
    }

    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
    if (result.result === 'not found') {
      res.status(404).json({ data: null, error: 'Asset not found' });
      return;
    }
    res.json({ data: { public_id: publicId, result: result.result }, error: null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Delete failed';
    console.error('Cloudinary delete error:', message);
    res.status(500).json({ data: null, error: message });
  }
});

export default router;
