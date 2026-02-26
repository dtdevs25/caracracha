import express from 'express';
import prisma from '../services/prismaService.js';
import { authenticate } from '../middleware/auth.js';
import { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get records for the authenticated user
router.get('/', authenticate, async (req: AuthRequest, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const records = await prisma.batchRecord.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' }
        });
        res.json(records);
    } catch (error) {
        console.error('[Records] Error fetching records:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Save/Update records for the authenticated user
router.post('/', authenticate, async (req: AuthRequest, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { records } = req.body; // Array of { id?, data }
    const userId = user.id;

    console.log(`[Records] Saving ${records?.length || 0} records for user ${userId}`);

    try {
        if (!Array.isArray(records)) {
            return res.status(400).json({ error: 'Records must be an array' });
        }

        const result = await prisma.$transaction(async (tx: any) => {
            // Delete existing records for this user
            await tx.batchRecord.deleteMany({ where: { userId } });

            // Create new records
            if (records.length > 0) {
                return await tx.batchRecord.createMany({
                    data: records.map((r: any) => ({
                        userId,
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
