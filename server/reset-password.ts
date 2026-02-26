import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetPassword() {
    const username = 'master';
    const newPassword = '123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    console.log(`Generating new hash for user: ${username}`);
    console.log(`New Hash: ${hashedPassword}`);

    try {
        const user = await prisma.user.upsert({
            where: { username },
            update: { password: hashedPassword },
            create: {
                username,
                password: hashedPassword,
                role: 'MASTER',
                name: 'Usuário Master'
            }
        });
        console.log('Password successfully reset for user:', user.username);
    } catch (error) {
        console.error('Error resetting password:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetPassword();
