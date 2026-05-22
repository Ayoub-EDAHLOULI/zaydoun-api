import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting the database seed...");

  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ZaydounAdmin123!";
  const hashedAdminPassword = await bcrypt.hash(adminPassword, 12);

  // 2. Create the Admin User (now with a password!)
  const adminUser = await prisma.user.upsert({
    where: { email: "ayoub@admin.com" },
    update: { password: hashedAdminPassword, role: "ADMIN" },
    create: {
      email: "ayoub@admin.com",
      name: "Ayoub Edahlouli",
      password: hashedAdminPassword,
      role: "ADMIN",
    },
  });

  console.log(`👤 Admin user created: ${adminUser.name}`);

  const SAMPLE_BOOK_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  // 2. Create a Sample Book for testing the Vector/RAG pipeline
  const sampleBook = await prisma.book.upsert({
    where: { id: SAMPLE_BOOK_ID },
    update: {},
    create: {
      id: SAMPLE_BOOK_ID,
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

  console.log("✅ Seeding finished successfully. Zaydoun is ready to read.");
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
