import express from 'express';
import prisma from '../services/prismaService.js';
import { authenticate } from '../middleware/auth.js';
import { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get records for a template
router.get('/:templateId', authenticate, async (req: AuthRequest, res) => {
    try {
        const records = await prisma.batchRecord.findMany({
            where: { templateId: req.params.templateId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(records);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Save/Update records
router.post('/:templateId', authenticate, async (req: AuthRequest, res) => {
    const { records } = req.body; // Array of { id?, data }

    try {
        // Simple strategy: delete existing and recreate for the template
        // Or upsert if IDs are provided.
        await prisma.batchRecord.deleteMany({ where: { templateId: req.params.templateId } });

        const created = await prisma.batchRecord.createMany({
            data: records.map((r: any) => ({
                templateId: req.params.templateId,
                data: r.data
            }))
        });

        res.json({ count: created.count });
    } catch (error) {
        res.status(400).json({ error: 'Invalid records data' });
    }
});

export default router;
