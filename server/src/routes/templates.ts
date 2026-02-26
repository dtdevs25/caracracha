import express from 'express';
import multer from 'multer';
import prisma from '../services/prismaService.js';
import { authenticate } from '../middleware/auth.js';
import { uploadFile, getFileUrl } from '../services/minioService.js';
import { AuthRequest } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload background image
router.post('/upload', authenticate, upload.single('image'), async (req: AuthRequest, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const fileName = `${Date.now()}-${req.file.originalname}`;
        await uploadFile(fileName, req.file.buffer, req.file.mimetype);
        const url = await getFileUrl(fileName);
        res.json({ fileName, url });
    } catch (error) {
        res.status(500).json({ error: 'Failed to upload to MinIO' });
    }
});

// Get all templates
router.get('/', authenticate, async (req: AuthRequest, res) => {
    try {
        const templates = await prisma.badgeTemplate.findMany({
            where: {
                OR: [
                    { isPublic: true },
                    { ownerId: req.user?.id }
                ]
            },
            orderBy: { updatedAt: 'desc' }
        });

        // Resolve MinIO URLs for backgrounds
        const resolvedTemplates = await Promise.all(templates.map(async (t: any) => {
            const frontBg = t.front as any;
            const backBg = t.back as any;

            if (frontBg.background && !frontBg.background.startsWith('http')) {
                frontBg.background = await getFileUrl(frontBg.background);
            }
            if (backBg.background && !backBg.background.startsWith('http')) {
                backBg.background = await getFileUrl(backBg.background);
            }

            return { ...t, front: frontBg, back: backBg };
        }));

        res.json(resolvedTemplates);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create/Update template
router.post('/', authenticate, async (req: AuthRequest, res) => {
    const { id, name, isPublic, orientation, bleed, front, back, targetGroup } = req.body;
    console.log('Template Upsert Request:', { id, name, targetGroup });

    try {
        const data = {
            name,
            isPublic,
            orientation,
            bleed,
            front,
            back,
            targetGroup,
            ownerId: req.user!.id
        };

        const isValidUuid = (uuid: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);

        let template;
        if (id && isValidUuid(id)) {
            template = await prisma.badgeTemplate.update({
                where: { id },
                data
            });
        } else {
            console.log('Creating new template (no valid ID provided)');
            template = await prisma.badgeTemplate.create({
                data
            });
        }

        res.json(template);
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: 'Invalid template data' });
    }
});

// Delete template
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
    try {
        const template = await prisma.badgeTemplate.findUnique({ where: { id: req.params.id as string } });
        if (!template || (template.ownerId !== req.user?.id && req.user?.role !== 'MASTER')) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await prisma.badgeTemplate.delete({ where: { id: req.params.id as string } });
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: 'Could not delete template' });
    }
});

export default router;
