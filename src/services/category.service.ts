import { PrismaClient } from '@prisma/client';
import { generateSlug } from '../util/slugGenerator';

// Create a single Prisma client instance and reuse it
const prisma = new PrismaClient({
  log: ['error'], // Only log errors to reduce noise
});

// Cache for workspace existence checks
const workspaceCache = new Map<number, boolean>();

// Helper function to validate category name
const validateCategoryName = (name: any): name is string => {
  return typeof name === 'string' && name.trim().length > 0;
};

// Helper function to generate slug

// Helper function to check workspace existence with caching
const checkWorkspaceExists = async (workspaceId: number): Promise<void> => {
  if (workspaceCache.has(workspaceId)) return;

  const exists = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true }, // Only select the ID to minimize data transfer
  });

  if (!exists) {
    throw new Error('Workspace not found');
  }

  workspaceCache.set(workspaceId, true);
};

// Category Service
export const categoryService = {
  // Create Category
  createCategory: async (workspaceId: number, data: { name: string;[key: string]: any }) => {
    try {
      // Validate category name
      if (!validateCategoryName(data.name)) {
        throw new Error('Invalid category name');
      }

      // Check workspace existence
      await checkWorkspaceExists(workspaceId);

      const slug = generateSlug(data.name);

      // Use transaction to ensure data consistency
      return await prisma.$transaction(async (tx) => {
        // Check for existing category with the same slug in the same workspace
        const existingCategory = await tx.category.findFirst({
          where: { slug, workspaceId },
          select: { id: true }, // Only select what we need
        });

        if (existingCategory) {
          throw new Error('A category with this slug already exists in this workspace.');
        }

        // Create the new category
        return await tx.category.create({
          data: {
            ...data,
            workspaceId,
            slug,
          },
        });
      });
    } catch (error: any) {
      console.error('Error creating category:', error.message);
      throw error; // Re-throw the original error to preserve stack trace
    }
  },

  // Get Categories in a Workspace (optimized query)
  getCategoriesInWorkspace: async (workspaceId: number) => {
    try {
      await checkWorkspaceExists(workspaceId);

      // Use select to only get the fields we need
      return await prisma.category.findMany({
        where: { workspaceId },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          parentId: true,
          workspaceId: true,
          children: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          products: {
            select: {
              id: true,
              name: true,
            },
            take: 10, // Limit the number of products returned
          },
        },
        orderBy: {
          name: 'asc', // Consistent ordering
        },
      });
    } catch (error: any) {
      console.error('Error fetching categories:', error.message);
      throw error;
    }
  },

  // Update Category (optimized)
  updateCategory: async (
    categoryId: string,
    workspaceId: number,
    data: Partial<{ name: string; description?: string }>
  ) => {
    try {
      // Optional slug regeneration
      const updateData = data.name
        ? { ...data, slug: generateSlug(data.name) }
        : data;

      // Update only if the category belongs to the specified workspace
      const updated = await prisma.category.updateMany({
        where: {
          id: categoryId,
          workspaceId: workspaceId,
        },
        data: updateData,
      });

      if (updated.count === 0) {
        throw new Error(
          `Category with ID ${categoryId} not found in workspace ${workspaceId}`
        );
      }

      // Return updated category
      return await prisma.category.findUnique({
        where: { id: categoryId },
      });
    } catch (error: any) {
      console.error('Error updating category:', error.message);
      throw error;
    }
  },
  deleteCategory: async (categoryId: string, workspaceId: number) => {
    try {
      // Check if any products are linked to this category
      const linkedProductsCount = await prisma.product.count({
        where: {
          categoryId,
          workspaceId,
        },
      });

      if (linkedProductsCount > 0) {
        throw new Error(
          `Cannot delete category. It is associated with ${linkedProductsCount} product(s). Please remove or reassign them first.`
        );
      }

      // Safe to delete if no products are linked
      const deleted = await prisma.category.deleteMany({
        where: {
          id: categoryId,
          workspaceId,
        },
      });

      if (deleted.count === 0) {
        throw new Error(
          `Category with ID ${categoryId} not found in workspace ${workspaceId}`
        );
      }

      return {
        success: true,
        message: `Category with ID ${categoryId} deleted successfully.`,
      };
    } catch (error: any) {
      console.error('Error deleting category:', error.message);
      throw error;
    }
  }

};

// Optional: Add cleanup for the Prisma client on process exit
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});