// import bcrypt from 'bcryptjs';
// import prisma from '../util/prisma';
// import redisClient, { RedisTTL } from '../cache/redisClient';
// import { generateToken } from '../util/generateToken';
// import sendEmail from '../util/sendEmail';
// import crypto from 'crypto';
// import { Location, Role, User, UserStatus } from '@prisma/client';

// export const authService = {
//   signupService: async (
//     firstName: string,
//     lastName: string | null,
//     email: string,
//     password: string,
//     phone: string | null,
//     role: Role,
//     locationId?: string | null,
//     location?: any
//   ) => {
//     // Check for existing user by email or phone
//     const existingUser = await prisma.user.findFirst({
//       where: {
//         OR: [
//           { email },
//           ...(phone ? [{ phone }] : []),
//         ],
//       },
//       select: { id: true, email: true },
//     });

//     if (existingUser) throw new Error('User with this email or phone already exists');

//     // Hash password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     let resolvedLocationId: string | null = null;

//     // Case 1: Use existing locationId
//     if (locationId) {
//       const existingLocation = await prisma.location.findUnique({ where: { id: locationId } });
//       if (!existingLocation) {
//         throw new Error('Invalid locationId');
//       }
//       resolvedLocationId = locationId;
//     }

//     // Case 2: Create a new location
//     if (!locationId && location && typeof location === 'object') {
//       const newLocation = await prisma.location.create({
//         data: {
//           name: location.name,
//           address: location.address,
//           street: location.street,
//           city: location.city,
//           region: location.region,
//           postalCode: location.postalCode,
//           country: location.country,
//           isDefault: location.isDefault ?? false,
//         }
//       });
//       resolvedLocationId = newLocation.id;
//     }

//     // Create new user
//     const newUser = await prisma.user.create({
//       data: {
//         firstName,
//         lastName,
//         email,
//         password: hashedPassword,
//         phone,
//         role,
//         locationId: resolvedLocationId,
//       }
//     });

//     // Generate and store tokens
//     const { token, refreshToken } = generateToken(newUser.id, newUser.role as Role);

//     await Promise.all([
//       redisClient.setEx(`auth:${newUser.id}`, RedisTTL.ACCESS_TOKEN, token),
//       redisClient.setEx(`refresh:${newUser.id}`, RedisTTL.REFRESH_TOKEN, refreshToken),
//     ]);

//     return {
//       token,
//       refreshToken,
//       user: {
//         id: newUser.id,
//         email: newUser.email,
//         role: newUser.role,
//         locationId: newUser.locationId,
//       },
//     };
//   },


//   signInService: async (email: string, password: string) => {
//     const user = await prisma.user.findUnique({
//       where: { email },
//       select: {
//         id: true,
//         email: true,
//         password: true,
//         phone: true,
//         firstName: true,
//         lastName: true,
//         role: true,
//         isActive: true,
//         createdAt: true,
//         updatedAt: true,
//         lastLogin: true,
//       },
//     });

//     if (!user) {
//       throw new Error('Invalid email or password'); // Could log more specific info but avoid exposing sensitive data
//     }

//     // Check if the password is valid
//     const isPasswordValid = await bcrypt.compare(password, user.password);
//     if (!isPasswordValid) {
//       throw new Error('Invalid email or password');
//     }

//     // Update the last login time
//     await prisma.user.update({
//       where: { id: user.id },
//       select: { id: true, lastLogin: true },
//       data: { lastLogin: new Date() },
//     });

//     // Generate tokens
//     const { token, refreshToken } = generateToken(user.id, user.role as Role);

//     // Store tokens in Redis
//     await Promise.all([
//       redisClient.setEx(`auth:${user.id}`, RedisTTL.ACCESS_TOKEN, token),
//       redisClient.setEx(`refresh:${user.id}`, RedisTTL.REFRESH_TOKEN, refreshToken),
//     ]);

//     // Return token and user information
//     return { token, refreshToken, user: { id: user.id, email: user.email, role: user.role } }; // Only return essential user data
//   },

//   refreshToken: async (userId: string, oldRefreshToken: string, role: string) => {
//     const storedRefreshToken = await redisClient.get(`refresh:${userId}`);
//     if (!storedRefreshToken || storedRefreshToken !== oldRefreshToken) {
//       throw new Error('Refresh token is invalid or expired');
//     }

//     const { token, refreshToken } = generateToken(userId, role as Role);
//     await Promise.all([
//       await redisClient.setEx(`auth:${userId}`, RedisTTL.ACCESS_TOKEN, token),
//       await redisClient.setEx(`refresh:${userId}`, RedisTTL.REFRESH_TOKEN, refreshToken)
//     ]);

//     return { token, refreshToken };
//   },

//   logout: async (userId: string) => {
//     await redisClient.del(`auth:${userId}`);
//     await redisClient.del(`refresh:${userId}`);
//   },


//   forgotPasswordService: async (email: string) => {
//     const user = await prisma.user.findUnique({
//       where: { email },
//       select: { firstName: true, email: true }
//     });

//     if (!user) throw new Error('User not found');

//     const otp = Math.floor(100000 + Math.random() * 900000).toString();
//     await redisClient.set(`otp:${otp}`, user.email, { EX: 300 });

//     const emailHtml = `
//     <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
//       <h2 style="color: #2d3748;">Hi ${user.firstName},</h2>
//       <p style="font-size: 16px; color: #4a5568;">
//         You recently requested to reset your password. Please use the following OTP (One-Time Password) to proceed:
//       </p>
//       <div style="margin: 20px 0; text-align: center;">
//         <span style="display: inline-block; font-size: 24px; font-weight: bold; padding: 10px 20px; background-color: #edf2f7; color: #2d3748; border-radius: 6px; letter-spacing: 2px;">
//           ${otp}
//         </span>
//       </div>
//       <p style="font-size: 14px; color: #718096;">
//         This OTP will expire in <strong>5 minutes</strong>. If you did not request a password reset, please ignore this email or contact support.
//       </p>
//       <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;" />
//       <p style="font-size: 12px; color: #a0aec0; text-align: center;">
//         &copy; ${new Date().getFullYear()} Backey Management. All rights reserved.
//       </p>
//     </div>
//   `;
//     await sendEmail(user.email, 'Password Reset OTP', emailHtml);

//     return true;
//   },

//   verifyOtpService: async (otp: string) => {
//     const email = await redisClient.get(`otp:${otp}`);
//     if (!email) throw new Error('OTP expired or invalid');

//     const user = await prisma.user.findUnique({
//       where: { email }
//       , select: { id: true, email: true }
//     });
//     if (!user) throw new Error('User not found');

//     const resetToken = crypto.randomBytes(20).toString('hex');
//     await redisClient.set(`reset:${resetToken}`, email, { EX: 300 });

//     await redisClient.del(`otp:${otp}`);
//     return resetToken;
//   },


//   resetPasswordService: async (resetToken: string, newPassword: string) => {
//     const email = await redisClient.get(`reset:${resetToken}`);
//     if (!email) throw new Error('OTP verification required or expired');

//     const user = await prisma.user.findUnique({
//       where: { email },
//       select: { id: true, email: true }
//     });
//     if (!user) throw new Error('User not found');

//     const hashedPassword = await bcrypt.hash(newPassword, 10);
//     await prisma.user.update({
//       where: { email },
//       data: { password: hashedPassword },
//       select: { id: true, email: true, password: true }
//     });

//     await redisClient.del(`reset:${resetToken}`);
//     return true;
//   },

//   updateUserProfileService: async (userId: string, data: Partial<User> & { location?: Partial<Location> }) => {
//     const {
//       firstName,
//       lastName,
//       phone,
//       profileImageUrl,
//       location
//     } = data;

//     const updatePayload: any = {};

//     if (firstName && typeof firstName === 'string') updatePayload.firstName = firstName.trim();
//     if (lastName && typeof lastName === 'string') updatePayload.lastName = lastName.trim();
//     if (phone && typeof phone === 'string') updatePayload.phone = phone.trim();
//     if (profileImageUrl && typeof profileImageUrl === 'string') updatePayload.profileImageUrl = profileImageUrl.trim();

//     // Handle location if provided
//     if (location && typeof location === 'object') {
//       const {
//         name,
//         address,
//         street,
//         city,
//         region,
//         postalCode,
//         country
//       } = location;

//       // Create new location record
//       const newLocation = await prisma.location.create({
//         data: {
//           name: name?.trim() || `${firstName}'s location`,
//           address: address?.trim() || '',
//           street: street?.trim() || '',
//           city: city?.trim() || '',
//           region: region?.trim() || '',
//           postalCode: postalCode?.trim() || '',
//           country: country?.trim() || '',
//           isDefault: false
//         }
//       });

//       updatePayload.locationId = newLocation.id;
//     }

//     updatePayload.updatedAt = new Date();

//     const updatedUser = await prisma.user.update({
//       where: { id: userId },
//       data: updatePayload,
//       select: {
//         id: true,
//         firstName: true,
//         lastName: true,
//         email: true,
//         phone: true,
//         role: true,
//         status: true,
//         profileImageUrl: true,
//         locationId: true,
//         location: {
//           select: {
//             id: true,
//             name: true,
//             address: true,
//             city: true,
//             region: true,
//             country: true
//           }
//         },
//         updatedAt: true
//       }
//     });

//     return updatedUser;
//   }


// };


import bcrypt from 'bcryptjs';
import prisma from '../util/prisma';
import redisClient, { RedisTTL } from '../cache/redisClient';
import { generateToken } from '../util/generateToken';
import sendEmail from '../util/sendEmail';
import crypto from 'crypto';
import { Address, Location, Role, User, UserStatus } from '@prisma/client';
import { generatePasswordResetEmail } from '../emailTemplate/passwordResetOtp';

export const authService = {
  // signupService: async (
  //   firstName: string,
  //   lastName: string | null,
  //   email: string,
  //   password: string,
  //   phone: string | null,
  //   roles: Role[],
  //   workspaceId: number | null,
  //   workspace: { name: string; slug: string; description?: string } | null,
  //   locationId?: string | null,
  //   location?: any
  // ) => {
  //   const existingUser = await prisma.user.findFirst({
  //     where: {
  //       OR: [
  //         { email },
  //         ...(phone ? [{ phone }] : []),
  //       ],
  //     },
  //     select: { id: true, email: true },
  //   });

  //   if (existingUser) throw new Error('User with this email or phone already exists');

  //   const hashedPassword = await bcrypt.hash(password, 10);

  //   let resolvedLocationId: string | null = null;
  //   if (locationId) {
  //     const existingLocation = await prisma.location.findUnique({ where: { id: locationId } });
  //     if (!existingLocation) {
  //       throw new Error('Invalid locationId');
  //     }
  //     resolvedLocationId = locationId;
  //   }

  //   if (!locationId && location && typeof location === 'object') {
  //     const newLocation = await prisma.location.create({
  //       data: {
  //         name: location.name,
  //         address: location.address,
  //         street: location.street,
  //         city: location.city,
  //         region: location.region,
  //         postalCode: location.postalCode,
  //         country: location.country,
  //         isDefault: location.isDefault ?? false,
  //       },
  //     });
  //     resolvedLocationId = newLocation.id;
  //   }

  //   // Create user first
  //   const newUser = await prisma.user.create({
  //     data: {
  //       firstName,
  //       lastName,
  //       email,
  //       password: hashedPassword,
  //       phone,
  //       locationId: resolvedLocationId,
  //     },
  //   });

  //   let newWorkspaceId: number | null = workspaceId;

  //   // Only create workspace if roles include non-customer roles
  //   const hasNonCustomerRoles = roles.some(role => role !== Role.CUSTOMER);

  //   if (hasNonCustomerRoles) {
  //     if (!workspaceId && !workspace) {
  //       // Create default workspace if no workspace provided but has non-customer roles
  //       const defaultSlug = `${firstName.toLowerCase()}-${email.split('@')[0].toLowerCase()}-${Date.now()}`;
  //       const defaultWorkspace = await prisma.workspace.create({
  //         data: {
  //           name: `${firstName}'s Workspace`,
  //           slug: defaultSlug,
  //           description: `Workspace for ${firstName}`,
  //           ownerId: newUser.id,
  //           isActive: true,
  //         },
  //       });
  //       newWorkspaceId = defaultWorkspace.id;
  //     } else if (workspace && typeof workspace === 'object') {
  //       const existingWorkspace = await prisma.workspace.findUnique({ where: { slug: workspace.slug } });
  //       if (existingWorkspace) {
  //         throw new Error('Workspace slug already exists');
  //       }
  //       const newWorkspace = await prisma.workspace.create({
  //         data: {
  //           name: workspace.name,
  //           slug: workspace.slug,
  //           description: workspace.description,
  //           ownerId: newUser.id,
  //           isActive: true,
  //         },
  //       });
  //       newWorkspaceId = newWorkspace.id;
  //     }
  //   }

  //   // Assign roles to workspace if workspace exists
  //   if (newWorkspaceId) {
  //     await prisma.userRole.createMany({
  //       data: roles.map((role) => ({
  //         userId: newUser.id,
  //         workspaceId: newWorkspaceId!,
  //         role,
  //       })),
  //     });
  //   } else if (workspaceId) {
  //     // Assign roles to existing workspace
  //     await prisma.userRole.createMany({
  //       data: roles.map((role) => ({
  //         userId: newUser.id,
  //         workspaceId,
  //         role,
  //       })),
  //     });
  //   } else {
  //     // For customers with no workspace, just assign the customer role without workspace
  //     await prisma.userRole.createMany({
  //       data: roles.map((role) => ({
  //         userId: newUser.id,
  //         workspaceId: null,
  //         role,
  //       })),
  //     });

  //   }

  //   const { token, refreshToken } = generateToken(newUser.id);

  //   await Promise.all([
  //     redisClient.setEx(`auth:${newUser.id}`, RedisTTL.ACCESS_TOKEN, token),
  //     redisClient.setEx(`refresh:${newUser.id}`, RedisTTL.REFRESH_TOKEN, refreshToken),
  //   ]);

  //   const userRoles = await prisma.userRole.findMany({
  //     where: { userId: newUser.id },
  //     select: { role: true, workspaceId: true },
  //   });

  //   return {
  //     token,
  //     refreshToken,
  //     user: {
  //       id: newUser.id,
  //       email: newUser.email,
  //       roles: userRoles.map((ur) => ({ role: ur.role, workspaceId: ur.workspaceId })),
  //       locationId: newUser.locationId,
  //       workspaceId: newWorkspaceId,
  //     },
  //   };
  // },

  signupService: async (
    firstName: string,
    lastName: string | null,
    email: string,
    password: string,
    phone: string | null,
    roles: Role[],
    workspaceId: number | null,
    workspace: { name: string; slug: string; description?: string } | null,
    locationId?: string | null,
    location?: any
  ) => {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(phone ? [{ phone }] : []),
        ],
      },
      select: { id: true, email: true },
    });

    if (existingUser) throw new Error('User with this email or phone already exists');

    const hashedPassword = await bcrypt.hash(password, 10);

    let resolvedLocationId: string | null = null;
    if (locationId) {
      const existingLocation = await prisma.location.findUnique({ where: { id: locationId } });
      if (!existingLocation) {
        throw new Error('Invalid locationId');
      }
      resolvedLocationId = locationId;
    }

    if (!locationId && location && typeof location === 'object') {
      const newLocation = await prisma.location.create({
        data: {
          name: location.name,
          address: location.address,
          street: location.street,
          city: location.city,
          region: location.region,
          postalCode: location.postalCode,
          country: location.country,
          isDefault: location.isDefault ?? false,
        },
      });
      resolvedLocationId = newLocation.id;
    }

    // Create user first
    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        phone,
        locationId: resolvedLocationId,
      },
    });

    let newWorkspaceId: number | null = workspaceId;

    // Only create workspace if roles include non-customer roles
    const hasNonCustomerRoles = roles.some(role => role !== Role.CUSTOMER);

    if (hasNonCustomerRoles) {
      if (!workspaceId && !workspace) {
        // Create default workspace if no workspace provided but has non-customer roles
        const defaultSlug = `${firstName.toLowerCase()}-${email.split('@')[0].toLowerCase()}-${Date.now()}`;
        const defaultWorkspace = await prisma.workspace.create({
          data: {
            name: `${firstName}'s Workspace`,
            slug: defaultSlug,
            description: `Workspace for ${firstName}`,
            ownerId: newUser.id,
            isActive: true,
          },
        });
        newWorkspaceId = defaultWorkspace.id;
      } else if (workspace && typeof workspace === 'object') {
        const existingWorkspace = await prisma.workspace.findUnique({ where: { slug: workspace.slug } });
        if (existingWorkspace) {
          throw new Error('Workspace slug already exists');
        }
        const newWorkspace = await prisma.workspace.create({
          data: {
            name: workspace.name,
            slug: workspace.slug,
            description: workspace.description,
            ownerId: newUser.id,
            isActive: true,
          },
        });
        newWorkspaceId = newWorkspace.id;
      }
    }

    // Assign roles to workspace if workspace exists
    if (newWorkspaceId) {
      await prisma.userRole.createMany({
        data: roles.map((role) => ({
          userId: newUser.id,
          workspaceId: newWorkspaceId,
          role,
        })),
      });
    } else if (workspaceId) {
      // Assign roles to existing workspace
      await prisma.userRole.createMany({
        data: roles.map((role) => ({
          userId: newUser.id,
          workspaceId,
          role,
        })),
      });
    } else {
      // For customers with no workspace, just assign the customer role without workspace
      await prisma.userRole.createMany({
        data: roles.map((role) => ({
          userId: newUser.id,
          workspaceId: null,
          role,
        })),
      });

    }
    const { token, refreshToken } = generateToken(newUser.id, roles);

    await Promise.all([
      redisClient.setEx(`auth:${newUser.id}`, RedisTTL.ACCESS_TOKEN, token),
      redisClient.setEx(`refresh:${newUser.id}`, RedisTTL.REFRESH_TOKEN, refreshToken),
    ]);

    const userRoles = await prisma.userRole.findMany({
      where: { userId: newUser.id },
      select: { role: true, workspaceId: true },
    });

    // Extract only roles (role names) for response
    const rolesList = userRoles.map(ur => ur.role);

    return {
      token,
      refreshToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        roles: rolesList,  // Return just the role names (no workspaceId in roles array)
        // locationId: newUser.locationId,
        // workspaceId: newWorkspaceId,  // Return workspaceId separately
      },
    };
  },

  signInService: async (email: string, password: string) => {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        locationId: true,
      },
    });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    // Fetch the user's roles
    const userRoles = await prisma.userRole.findMany({
      where: { userId: user.id },
      select: { role: true },
    });

    // Extract only role values (no workspaceId)
    const roles = Array.from(new Set(userRoles.map((ur) => ur.role)));

    // Generate the token including roles
    const { token, refreshToken } = generateToken(user.id, roles);

    await Promise.all([
      redisClient.setEx(`auth:${user.id}`, RedisTTL.ACCESS_TOKEN, token),
      redisClient.setEx(`refresh:${user.id}`, RedisTTL.REFRESH_TOKEN, refreshToken),
    ]);

    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        // roles: userRoles.map((ur) => ({ role: ur.role, workspaceId: ur.workspaceId })),
        roles: Array.from(new Set(userRoles.map((ur) => ur.role))),
        locationId: user.locationId,
      },
    };
  },

  refreshToken: async (userId: string, oldRefreshToken: string) => {
    const storedRefreshToken = await redisClient.get(`refresh:${userId}`);
    if (!storedRefreshToken || storedRefreshToken !== oldRefreshToken) {
      throw new Error('Refresh token is invalid or expired');
    }

    const userRoles = await prisma.userRole.findMany({
      where: { userId: userId },
      select: { role: true, workspaceId: true },
    });
    const roles = Array.from(new Set(userRoles.map((ur) => ur.role)));

    const { token, refreshToken } = generateToken(userId, roles);

    await Promise.all([
      redisClient.setEx(`auth:${userId}`, RedisTTL.ACCESS_TOKEN, token),
      redisClient.setEx(`refresh:${userId}`, RedisTTL.REFRESH_TOKEN, refreshToken),
    ]);

    return { token, refreshToken };
  },

  logout: async (userId: string) => {
    await redisClient.del(`auth:${userId}`);
    await redisClient.del(`refresh:${userId}`);
  },

  forgotPasswordService: async (email: string) => {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { firstName: true, email: true },
    });

    if (!user) throw new Error('User not found');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await redisClient.set(`otp:${otp}`, user.email, { EX: 300 });

    const emailHtml = generatePasswordResetEmail(user, otp);
    await sendEmail({
      to: user.email,
      subject: 'Password Reset OTP',
      html: emailHtml,
    });

    return true;
  },

  verifyOtpService: async (otp: string) => {
    const email = await redisClient.get(`otp:${otp}`);
    if (!email) throw new Error('OTP expired or invalid');

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
    if (!user) throw new Error('User not found');

    const resetToken = crypto.randomBytes(20).toString('hex');
    await redisClient.set(`reset:${resetToken}`, email, { EX: 300 });

    await redisClient.del(`otp:${otp}`);
    return resetToken;
  },

  resetPasswordService: async (resetToken: string, newPassword: string) => {
    const email = await redisClient.get(`reset:${resetToken}`);
    if (!email) throw new Error('OTP verification required or expired');

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
    if (!user) throw new Error('User not found');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
      select: { id: true, email: true, password: true },
    });

    await redisClient.del(`reset:${resetToken}`);
    return true;
  },

  updateUserProfileService: async (userId: string, data: Partial<User> & { location?: Partial<Location> }) => {
    const { firstName, lastName, phone, profileImageUrl, location } = data;

    const updatePayload: any = {};

    if (firstName && typeof firstName === 'string') updatePayload.firstName = firstName.trim();
    if (lastName && typeof lastName === 'string') updatePayload.lastName = lastName.trim();
    if (phone && typeof phone === 'string') updatePayload.phone = phone.trim();
    if (profileImageUrl && typeof profileImageUrl === 'string') updatePayload.profileImageUrl = profileImageUrl.trim();

    if (location && typeof location === 'object') {
      const { name, address, street, city, region, postalCode, country } = location;

      const newLocation = await prisma.location.create({
        data: {
          name: name?.trim() || `${firstName}'s location`,
          address: address?.trim() || '',
          street: street?.trim() || '',
          city: city?.trim() || '',
          region: region?.trim() || '',
          postalCode: postalCode?.trim() || '',
          country: country?.trim() || '',
          isDefault: false,
        },
      });

      updatePayload.locationId = newLocation.id;
    }

    updatePayload.updatedAt = new Date();

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updatePayload,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        profileImageUrl: true,
        locationId: true,
        location: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            region: true,
            country: true,
          },
        },
        updatedAt: true,
        UserRole: {
          select: {
            role: true,
            workspaceId: true,
          },
        },
      },
    });

    return {
      ...updatedUser,
      roles: updatedUser.UserRole.map((ur) => ({ role: ur.role, workspaceId: ur.workspaceId })),
    };
  },
  userRoles: async (userId: string) => {
    try {
      const userRoles = await prisma.userRole.findMany({
        where: { userId },
        select: { role: true } // Only fetch the role field
      });

      // Remove duplicate roles
      const uniqueRoles = Array.from(new Set(userRoles.map(userRole => userRole.role)));

      return uniqueRoles;
    } catch (error) {
      console.error(error);
      throw new Error(`Failed to fetch roles for user: ${error}`);
    }
  },
  getUserDetails: async (userId: string) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          status: true,
          profileImageUrl: true,
          locationId: true,
          location: {
            select: {
              id: true,
              name: true,
              address: true,
              city: true,
              region: true,
              country: true,
            },
          },
          Address: { // Fetch all addresses associated with the user
            select: {
              id: true,
              address: true,
              street: true,
              city: true,
              region: true,
              country: true,
              postalCode: true,
            },
          },
          updatedAt: true,
        },
      });

      return {
        ...user,
      };
    } catch (error) {
      console.error(error);
      throw new Error(`Failed to fetch user details: ${error}`);
    }
  },
  deleteAddress: async (userId: string, addressId: string) => {
    const address = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address || address.userId !== userId) {
      throw new Error('Address not found or access denied');
    }

    await prisma.address.delete({
      where: { id: addressId },
    });

    return {
      success: true,
      message: 'Address deleted successfully',
    };
  },
  updateAddress: async (userId: string, addressId: string, updateData: Partial<Address>) => {
    const existingAddress = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!existingAddress || existingAddress.userId !== userId) {
      throw new Error('Address not found or access denied');
    }

    const updated = await prisma.address.update({
      where: { id: addressId },
      data: updateData,
    });

    return updated;
  }
};