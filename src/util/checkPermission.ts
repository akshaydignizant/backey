// import prisma from "./prisma";

import prisma from "./prisma";

// export const checkPermission = async (workspaceId: number, userId: string, permission: string) => {
//   const rolePermission = await prisma.rolePermission.findFirst({
//     where: {
//       workspaceId,
//       role: (await prisma.user.findUnique({ where: { id: userId } }))?.role || 'CUSTOMER',
//       permission: { has: permission },
//     },
//   });
//   if (!rolePermission) throw new Error('Insufficient permissions');
// };

// import prisma from "./prisma";

// export const checkPermission = async (workspaceId: number, userId: string, permission: string) => {
//   const user = await prisma.user.findUnique({ where: { id: userId } });

//   if (!user || !user.role) {
//     throw new Error("User not found or role is undefined");
//   }

//   // Admin bypass logic
//   if (user.role === 'ADMIN') return;

//   const rolePermission = await prisma.rolePermission.findFirst({
//     where: {
//       workspaceId,
//       role: user.role,
//       permission: { has: permission },
//     },
//   });

//   if (!rolePermission) throw new Error("Insufficient permissions");
// };

export const checkPermission = async (workspaceId: number, userId: string, permission: string) => {
  const userRole = await prisma.userRole.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!userRole) {
    throw new Error("User does not have a role in this workspace");
  }

  if (userRole.role === 'ADMIN') return;

  const rolePermission = await prisma.rolePermission.findFirst({
    where: {
      workspaceId,
      role: userRole.role,
      permission: { has: permission },
    },
  });

  if (!rolePermission) {
    throw new Error("Insufficient permissions");
  }
};
