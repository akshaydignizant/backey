// lib/prisma.ts
// import { PrismaClient } from '@prisma/client';
import { PrismaClient } from '../../prisma/generated/prisma-client-js';

const prisma = new PrismaClient();

export default prisma;
