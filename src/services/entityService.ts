import prisma from '../util/prisma';

// Function to fetch any entity by its unique ID
type PrismaModels = {
  workspace: typeof prisma.workspace;
  product: typeof prisma.product;
  productVariant: typeof prisma.productVariant;
  user: typeof prisma.user;
};

export const findEntityById = async <T>(model: keyof PrismaModels, id: string | number): Promise<T | null> => {
  try {
    // Type assertion: Ensure that the model is correctly recognized
    const entity = await (prisma[model] as any).findUnique({
      where: {
        id: id,
      },
    });
    return entity as T | null; // Return the found entity or null if not found
  } catch (error) {
    console.error(`Error fetching ${model} with ID ${id}:`, error); // Log the error if something goes wrong
    return null; // Return null in case of error
  }
};

// Function to fetch a workspace by ID
export const findWorkspaceById = async (workspaceId: number) => {
  return await findEntityById('workspace', workspaceId); // Calling the general function for workspaces
};

// Function to fetch a product by ID
export const findProductById = async (productId: string) => {
  return await findEntityById('product', productId); // Calling the general function for products
};

// Function to fetch a product variant by ID
export const findProductVariantById = async (variantId: string) => {
  return await findEntityById('productVariant', variantId); // Calling the general function for product variants
};

// Function to fetch a user by ID
export const findUserById = async (userId: string) => {
  return await findEntityById('user', userId); // Calling the general function for users
};
