import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Category Service
export const categoryService = {
  // Create Category
  createCategory: async (workspaceId: number, data: any) => {
    try {
      // Validate category name
      if (!data.name || typeof data.name !== 'string') {
        throw new Error('Invalid category name');
      }

      // Check if the workspace exists
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
      });

      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // Generate slug from category name
      const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      // Check if a category with the same slug already exists in the same workspace
      const existingCategory = await prisma.category.findUnique({
        where: { slug },
      });

      if (existingCategory) {
        throw new Error('A category with this slug already exists.');
      }

      // Create the new category
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

      // Check if the workspace exists
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
      });

      if (!workspace) {
        throw new Error('Workspace not found');
      }
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
