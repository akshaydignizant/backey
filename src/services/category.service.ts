import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Category Service
export const categoryService = {
  // Create Category
  createCategory: async (workspaceId: number, data: any) => {
    try {
      if (!data.name || typeof data.name !== 'string') {
        throw new Error('Invalid category name');
      }
      const slug = data.name ? data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : '';
      const createdCategory = await prisma.category.create({
        data: {
          ...data,
          workspaceId,
          slug,
        },
      });

      return createdCategory;
    } catch (error: any) {
      console.error('❌ Error creating category:', error);
      throw new Error(error.message || 'Failed to create category');
    }
  },

  // Get Categories in a Workspace
  getCategoriesInWorkspace: async (workspaceId: number) => {
    try {
      const categories = await prisma.category.findMany({
        where: { workspaceId },
        include: {
          children: true,
          products: true,
        },
      });

      return categories;
    } catch (error: any) {
      console.error('❌ Error fetching categories:', error);
      throw new Error(error.message || 'Failed to fetch categories');
    }
  },

  // Update Category
  updateCategory: async (categoryId: string, data: any) => {
    try {
      const existingCategory = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!existingCategory) {
        throw new Error(`Category with ID ${categoryId} not found`);
      }

      const updatedCategory = await prisma.category.update({
        where: { id: categoryId },
        data,
      });

      return updatedCategory;
    } catch (error: any) {
      console.error('❌ Error updating category:', error);
      throw new Error(error.message || 'Failed to update category');
    }
  },

  // Delete Category
  deleteCategory: async (categoryId: string) => {
    try {
      const existingCategory = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!existingCategory) {
        throw new Error(`Category with ID ${categoryId} not found`);
      }

      const deletedCategory = await prisma.category.delete({
        where: { id: categoryId },
      });

      return deletedCategory;
    } catch (error: any) {
      console.error('❌ Error deleting category:', error);
      throw new Error(error.message || 'Failed to delete category');
    }
  },
};
