// // lib/prisma.ts
// import { PrismaClient } from '@prisma/client';
// // import { PrismaClient } from '../generated/prisma-client-js';

// const prisma = new PrismaClient();

// export default prisma;

// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
