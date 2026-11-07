import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

// Creates (or updates) the first admin account from ADMIN_* env vars.
async function main() {
  const prisma = new PrismaClient();
  const email = (process.env.ADMIN_EMAIL ?? 'admin@iwear.local').toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? 'Iwear Admin';

  if (!password) {
    throw new Error('Set ADMIN_PASSWORD in .env before seeding.');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: Role.ADMIN, passwordHash, name, isActive: true },
    create: { email, passwordHash, name, role: Role.ADMIN },
  });

  console.log(`Admin ready: ${admin.email}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
