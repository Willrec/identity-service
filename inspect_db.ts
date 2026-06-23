import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectDb() {
  try {
    await prisma.$connect();

    const migrationsTable: any[] = await prisma.$queryRaw`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_name = '_prisma_migrations';
    `;

    let migrations = [];
    if (migrationsTable.length > 0) {
      const schema = migrationsTable[0].table_schema;
      if (schema === 'auth') {
        migrations = await prisma.$queryRaw`SELECT migration_name FROM "auth"."_prisma_migrations" ORDER BY finished_at ASC;`;
      } else {
        migrations = await prisma.$queryRaw`SELECT migration_name FROM "public"."_prisma_migrations" ORDER BY finished_at ASC;`;
      }
    }

    console.log(JSON.stringify({
      table_exists: migrationsTable.length > 0,
      table_schemas: migrationsTable.map((t: any) => t.table_schema),
      migrations
    }, null, 2));

  } catch (error) {
    console.error("Error inspecting db:", error);
  } finally {
    await prisma.$disconnect();
  }
}

inspectDb();
