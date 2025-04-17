import prisma from "./prisma";

export const checkPermission = async (workspaceId: number, userId: string, permission: string) => {
  const rolePermission = await prisma.rolePermission.findFirst({
    where: {
      workspaceId,
      role: (await prisma.user.findUnique({ where: { id: userId } }))?.role || 'CUSTOMER',
      permission: { has: permission },
    },
  });
  if (!rolePermission) throw new Error('Insufficient permissions');
};