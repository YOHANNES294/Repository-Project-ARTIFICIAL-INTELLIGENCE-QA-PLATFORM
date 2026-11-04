const { PrismaClient } = require('@prisma/client');
const { hashPassword, verifyPassword } = require('../apps/api/dist/utils/security.js');

async function run() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5434/ai_qa_staging?schema=public',
      },
    },
  });

  const hash = await hashPassword('password');
  console.log('[Password-Fix] Generated Argon2id hash:', hash);

  const ok = await verifyPassword('password', hash);
  console.log('[Password-Fix] Password "password" verified:', ok);

  const updated = await prisma.user.updateMany({
    data: { passwordHash: hash },
  });
  console.log(`[Password-Fix] Successfully updated ${updated.count} users in database!`);

  const users = await prisma.user.findMany({ select: { email: true, passwordHash: true } });
  for (const u of users) {
    const verified = await verifyPassword('password', u.passwordHash);
    console.log(`[Password-Fix] User ${u.email} -> password valid:`, verified);
  }

  await prisma.$disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
