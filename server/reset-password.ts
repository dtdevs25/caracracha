import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetPassword() {
    const username = 'dsantos@ctdi.com';
    const newPassword = 'nova@2026';
    const hashedPassword = '$2b$10$Z.R2G8RieJ/dDvx9JNLoyO0vHBxzRuwZp8S337StfyLvtstKBJHEO';

    console.log(`Generating reset for user: ${username}`);
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
