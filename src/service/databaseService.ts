import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const connect = async () => {
  try {
    await prisma.$connect()
    return prisma
  } catch (err) {
    throw err
  }
}

export default {
  connect,
  prisma
}
