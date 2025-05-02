import { NextFunction, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateSlug } from '../util/slugGenerator';
import { nanoid } from 'nanoid';
const prisma = new PrismaClient();

const variantController = {
  // CREATE variants
  addVariants: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { productId } = req.params;
    const { variants } = req.body;
    const workspaceId = parseInt(req.params.workspaceId);

    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      res.status(400).json({ error: 'Variants data is required and must be an array.' });
      return;
    }

    if (!workspaceId) {
      res.status(400).json({ error: 'workspaceId is required.' });
      return;
    }

    try {
      console.log(`Received request to add variants for product with ID: ${productId} in workspace: ${workspaceId}`);

      const productExists = await prisma.product.findFirst({
        where: {
          id: productId,
          workspaceId: workspaceId,
        },
      });

      if (!productExists) {
        console.error(`Product with ID ${productId} does not exist in workspace ${workspaceId}`);
        res.status(404).json({ error: 'Product not found or does not belong to the given workspace.' });
        return;
      }

      console.log('Product found:', productExists);

      // Generate SKUs using your generateSlug
      const variantsWithSKUs = await Promise.all(
        variants.map(async (variant: any) => {
          const baseSku = generateSlug(variant.title || 'variant');
          let uniqueSku = `${baseSku}-${nanoid(6)}`;

          // Ensure uniqueness
          while (
            await prisma.productVariant.findUnique({
              where: { sku: uniqueSku },
            })
          ) {
            uniqueSku = `${baseSku}-${nanoid(6)}`;
          }

          return {
            ...variant,
            sku: uniqueSku,
          };
        })
      );

      const newVariants = await prisma.product.update({
        where: { id: productId },
        data: {
          variants: {
            create: variantsWithSKUs,
          },
        },
        include: { variants: true },
      });

      res.status(201).json(newVariants.variants);
    } catch (err) {
      console.error('Error adding variants:', err);
      res.status(500).json({ error: 'Failed to add variants' });
    }
  },

  // UPDATE variants (delete old, add new)
  updateVariants: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { variantId, productId } = req.params;
    const {
      title,
      sku,
      price,
      stock,
      weight,
      dimensions,
      color,
      size,
      isAvailable,
    } = req.body;

    try {
      // Check if the variant exists for the given product
      const variant = await prisma.productVariant.findFirst({
        where: { id: variantId, productId: productId },
      });

      if (!variant) {
        res.status(404).json({ error: 'Variant not found for the given product' });
        return;
      }

      // Generate or validate SKU
      let finalSku = sku;
      if (!sku && title) {
        const baseSku = generateSlug(title);
        let tempSku = `${baseSku}-${nanoid(6)}`;

        // Ensure uniqueness
        while (
          await prisma.productVariant.findUnique({
            where: { sku: tempSku },
          })
        ) {
          tempSku = `${baseSku}-${nanoid(6)}`;
        }

        finalSku = tempSku;
      }

      // Update the variant fields
      const updatedVariant = await prisma.productVariant.update({
        where: { id: variantId },
        data: {
          title,
          sku: finalSku,
          price,
          stock,
          weight,
          dimensions,
          color,
          size,
          isAvailable,
        },
      });

      res.status(200).json(updatedVariant);
    } catch (error) {
      console.error('Error updating variant:', error);
      res.status(500).json({ error: 'Failed to update variant' });
    }
  },

  // DELETE a single variant
  deleteVariant: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { variantId } = req.params;

    try {
      // Check if variant exists
      const existingVariant = await prisma.productVariant.findUnique({
        where: { id: variantId },
      });

      if (!existingVariant) {
        res.status(404).json({ error: 'Variant not found' });
      }

      // Delete the variant
      await prisma.productVariant.delete({ where: { id: variantId } });

      res.status(200).json({ success: true, message: 'Variant deleted successfully' });
    } catch (err) {
      console.error('Error deleting variant:', err);
      res.status(500).json({ error: 'Failed to delete variant' });
    }
  },

  // GET variants by product
  getVariantsByProduct: async (req: Request, res: Response) => {
    const { productId } = req.params;

    try {
      const variants = await prisma.productVariant.findMany({
        where: { productId },
      });

      res.status(200).json(variants);
    } catch (err) {
      console.error('Error fetching variants:', err);
      res.status(500).json({ error: 'Failed to fetch variants' });
    }
  },
};

export default variantController;
