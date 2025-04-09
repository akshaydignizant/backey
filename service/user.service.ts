import prisma from "../util/prisma";


export const createUser = async (data: { name: string; email: string; password: string }) => {
  return prisma.user.create({ data })
}

export const getAllUsers = async () => {
  return prisma.user.findMany()
}

export const getUserById = async (id: string) => {
  return prisma.user.findUnique({ where: { id } })
}

export const updateUser = async (id: string, data: Partial<{ name: string; email: string; password: string }>) => {
  return prisma.user.update({
    where: { id },
    data
  })
}

export const deleteUser = async (id: string) => {
  return prisma.user.delete({ where: { id } })
}
