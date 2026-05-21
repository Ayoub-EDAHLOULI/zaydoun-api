import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting the database seed...");

  const adminUser = await prisma.user.upsert({
    where: { email: "ayoub@admin.com" },
    update: {},
    create: {
      email: "ayoub@admin.com",
      name: "Ayoub Edahlouli",
    },
  });

  console.log(`👤 Admin user seeded: ${adminUser.name}`);

  const sampleBook = await prisma.book.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      userId: adminUser.id,
      title: "حي بن يقظان (Hayy ibn Yaqdhan)",
      author: "Ibn Tufayl",
      language: "ar",
      totalPages: 120,
      storagePath: "/uploads/books/hayy-ibn-yaqdhan.pdf",
      status: "PENDING",
    },
  });

  console.log(`📚 Sample book seeded: ${sampleBook.title}`);
  console.log("✅ Seeding finished. Zaydoun is ready to read.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed a 3chiri:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
