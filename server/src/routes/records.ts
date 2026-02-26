import express from 'express';
import prisma from '../services/prismaService.js';
import { authenticate } from '../middleware/auth.js';
import { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get records for a template
router.get('/:templateId', authenticate, async (req: AuthRequest, res) => {
    try {
        const records = await prisma.batchRecord.findMany({
            where: { templateId: req.params.templateId as string },
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
    const { templateId } = req.params;

    console.log(`[Records] Saving ${records?.length || 0} records for template ${templateId}`);

    try {
        if (!Array.isArray(records)) {
            return res.status(400).json({ error: 'Records must be an array' });
        }

        const result = await prisma.$transaction(async (tx: any) => {
            const id = req.params.templateId as string;
            // Delete existing records for this template
            await tx.batchRecord.deleteMany({ where: { templateId: id } });

            // Create new records
            if (records.length > 0) {
                return await tx.batchRecord.createMany({
                    data: records.map((r: any) => ({
                        templateId: id,
                        data: r.data || {}
                    }))
                });
            }
            return { count: 0 };
        });

        console.log(`[Records] Successfully saved ${result.count} records`);
        res.json({ count: result.count });
    } catch (error: any) {
        console.error('[Records] Error saving records:', error);
        res.status(500).json({
            error: 'Failed to save records',
            details: error.message
        });
    }
});

export default router;
