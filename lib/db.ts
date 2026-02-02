import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrisma(): PrismaClient {
  let url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env (see .env.example)."
    );
  }
  // Supabase: use SSL; for pooler (Vercel/serverless) add pgbouncer=true
  try {
    const parsed = new URL(url);
    const isSupabase = parsed.hostname.endsWith(".supabase.co");
    const isPooler =
      parsed.hostname.includes("pooler.supabase.com") ||
      parsed.port === "6543";
    if (isSupabase) {
      if (!parsed.searchParams.has("sslmode"))
        parsed.searchParams.set("sslmode", "require");
      if (isPooler && !parsed.searchParams.has("pgbouncer"))
        parsed.searchParams.set("pgbouncer", "true");
      url = parsed.toString();
    }
  } catch {
    // ignore URL parse errors
  }
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrisma();
  }
  return globalForPrisma.prisma;
}

export default getPrisma;
