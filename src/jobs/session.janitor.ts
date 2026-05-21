import cron from "node-cron";
import { prisma } from "../lib/prisma";

export function startSessionJanitor() {
  // Runs every Sunday at 03:00 AM
  cron.schedule("0 3 * * 0", async () => {
    const result = await prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    console.log(`[SessionJanitor] Deleted ${result.count} expired sessions.`);
  });
}
