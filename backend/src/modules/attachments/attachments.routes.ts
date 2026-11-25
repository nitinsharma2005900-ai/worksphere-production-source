import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { store, DBAttachment } from '../../database/db';
import { authenticateJwt } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';
import { disallowAuditorWrite } from '../../middleware/rbac';
import { storageService } from '../../services/storage/storageService';
import { NotFoundError } from '../../middleware/errorHandler';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB max
});

// POST /api/v1/attachments/upload
router.post(
  '/upload',
  authenticateJwt,
  requireTenant,
  disallowAuditorWrite,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId!;
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, error: { message: 'No file uploaded' }, requestId: req.id });
      }

      const taskId = req.body.taskId as string | undefined;
      const projectId = req.body.projectId as string | undefined;

      if (taskId && store.tasks.get(taskId)?.organizationId !== orgId) {
        throw new NotFoundError('Task not found in this organization');
      }
      if (projectId && store.projects.get(projectId)?.organizationId !== orgId) {
        throw new NotFoundError('Project not found in this organization');
      }

      const { storageKey, storageUrl } = await storageService.uploadFile({
        buffer: file.buffer,
        fileName: file.originalname,
        mimeType: file.mimetype,
        organizationId: orgId
      });

      const attachmentId = uuidv4();
      const newAttachment: DBAttachment = {
        id: attachmentId,
        organizationId: orgId,
        projectId: projectId || null,
        taskId: taskId || null,
        uploadedById: req.user!.userId,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        storageKey,
        storageUrl,
        createdAt: new Date().toISOString()
      };
      store.attachments.set(attachmentId, newAttachment);

      return res.status(201).json({ success: true, data: newAttachment, requestId: req.id });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/attachments/download/:key(*)
router.get('/download/:key(*)', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = req.params.key;
    const attachment = Array.from(store.attachments.values()).find(
      item => item.storageKey === key && item.organizationId === req.organizationId
    );
    if (!attachment) throw new NotFoundError('Attachment not found in this organization');
    const baseDir = path.resolve(process.cwd(), 'uploads');
    const filePath = path.join(baseDir, key);

    // Prevent directory traversal attacks
    if (!filePath.startsWith(baseDir + path.sep)) {
      return res.status(403).json({ success: false, error: { message: 'Access denied' } });
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('File not found');
    }

    return res.download(filePath, attachment.fileName);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/attachments?taskId=...
router.get('/', authenticateJwt, requireTenant, async (req: Request, res: Response) => {
  const orgId = req.organizationId!;
  const taskId = req.query.taskId as string | undefined;
  const projectId = req.query.projectId as string | undefined;

  let list = Array.from(store.attachments.values()).filter(a => a.organizationId === orgId);
  if (taskId) list = list.filter(a => a.taskId === taskId);
  if (projectId) list = list.filter(a => a.projectId === projectId);

  return res.json({ success: true, data: list, requestId: req.id });
});

export default router;
