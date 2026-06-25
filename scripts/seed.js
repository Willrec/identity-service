import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Database Seeding ===\n');

  // 1. Seed Roles
  const roles = [
    { name: 'SUPER_ADMIN', description: 'Super Administrator with full system control' },
    { name: 'ADMIN', description: 'Administrator with tenant/organization level control' },
    { name: 'USER', description: 'Standard end user' },
  ];

  console.log('Seeding roles...');
  const seededRoles = {};
  for (const role of roles) {
    const dbRole = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: { name: role.name, description: role.description },
    });
    seededRoles[role.name] = dbRole;
    console.log(`✓ Role: ${role.name}`);
  }

  // 2. Optionally Seed Default Admin User
  const seedDefaultAdmin = process.env.SEED_DEFAULT_ADMIN === 'true';
  if (seedDefaultAdmin) {
    console.log('\nSeeding default administrator user...');

    const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@identity-service.local';
    const password = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!';
    const firstName = process.env.DEFAULT_ADMIN_FIRST_NAME || 'Default';
    const lastName = process.env.DEFAULT_ADMIN_LAST_NAME || 'Admin';

    // Hash the password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Upsert user
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        firstName,
        lastName,
        passwordHash,
        emailVerified: true,
        status: 'ACTIVE',
      },
      create: {
        email,
        firstName,
        lastName,
        passwordHash,
        emailVerified: true,
        status: 'ACTIVE',
      },
    });

    // Assign SUPER_ADMIN role to user
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: seededRoles['SUPER_ADMIN'].id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: seededRoles['SUPER_ADMIN'].id,
      },
    });

    console.log(`✓ Default Administrator created/updated:`);
    console.log(`  - Email: ${email}`);
    console.log(`  - Role: SUPER_ADMIN`);
  } else {
    console.log('\nSEED_DEFAULT_ADMIN is not set to true. Skipping default administrator seeding.');
  }

  console.log('\n✓ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
