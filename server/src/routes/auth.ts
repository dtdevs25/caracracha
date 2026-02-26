import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../services/prismaService.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'caracracha-secret-key-2024';

// Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        console.log(`Login attempt for username: ${username}`);
        const user = await prisma.user.findUnique({ where: { username } });

        if (!user) {
            console.log(`User not found: ${username}`);
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log(`Invalid password for user: ${username}`);
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        console.log(`Login successful for user: ${username}`);

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: { id: user.id, username: user.username, role: user.role, name: user.name }
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all users (MASTER only)
router.get('/users', authenticate, authorize(['MASTER']), async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, username: true, role: true, name: true, createdAt: true }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create user (MASTER only)
router.post('/users', authenticate, authorize(['MASTER']), async (req, res) => {
    const { username, password, role, name } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { username, password: hashedPassword, role, name }
        });
        res.json({ id: user.id, username: user.username, role: user.role, name: user.name });
    } catch (error) {
        res.status(400).json({ error: 'Username already exists or invalid data' });
    }
});

// Delete user (MASTER only)
router.delete('/users/:id', authenticate, authorize(['MASTER']), async (req, res) => {
    try {
        await prisma.user.delete({ where: { id: req.params.id as string } });
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: 'Could not delete user' });
    }
});

export default router;
