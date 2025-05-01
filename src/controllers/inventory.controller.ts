import { NextFunction, Request, Response } from 'express';
import { inventoryService } from '../services/inventory.service';
import { z } from 'zod';

// Validation schemas
const querySchema = z.object({
    limit: z.string().optional().default('50').transform(Number).refine((val) => val > 0 && val <= 100, {
        message: 'Limit must be between 1 and 100',
    }),
    offset: z.string().optional().default('0').transform(Number).refine((val) => val >= 0, {
        message: 'Offset must be non-negative',
    }),
});

const lowStockSchema = z.object({
    threshold: z.string().optional().default('5').transform(Number).refine((val) => val >= 0, {
        message: 'Threshold must be non-negative',
    }),
});

export const getInventory = async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { limit, offset } = querySchema.parse(req.query);
        // const { limit, offset } = req.query;
        const inventory = await inventoryService.getInventory(parseInt(workspaceId), { limit, offset });
        res.status(200).json(inventory);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to fetch inventory' });
    }
};

export const addInventoryItem = async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;
        // const data = addItemSchema.parse(req.body);
        const data = req.body;
        const item = await inventoryService.addInventoryItem(parseInt(workspaceId), data);
        res.status(201).json(item);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to add inventory item' });
    }
};

export const updateInventoryItem = async (req: Request, res: Response) => {
    try {
        const { workspaceId, itemId } = req.params;
        // const data = updateItemSchema.parse(req.body);
        const data = req.body;
        const updatedItem = await inventoryService.updateInventoryItem(parseInt(workspaceId), itemId, data);
        res.status(200).json(updatedItem);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to update inventory item' });
    }
};

export const getLowStockItems = async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { limit, offset } = querySchema.parse(req.query);
        const lowStockItems = await inventoryService.getLowStockItems(parseInt(workspaceId), { limit, offset });
        res.status(200).json(lowStockItems);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to fetch low-stock items' });
    }
};

export const createInventoryTransfer = async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;
        // const data = transferSchema.parse(req.body);
        const userId = req.user?.userId
        const data = req.body;
        const transfer = await inventoryService.createInventoryTransfer(parseInt(workspaceId), userId as string, data);
        res.status(201).json(transfer);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to create inventory transfer' });
    }
};

export const getVariantStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { variantId } = req.params;
        z.string().uuid('Invalid variant ID').parse(variantId);
        const variant = await inventoryService.getVariantStock(variantId);
        if (!variant) {
            res.status(404).json({ error: 'Variant not found' });
        }
        res.status(200).json(variant);
    } catch (error: any) {
        res.status(error.message.includes('Invalid') ? 400 : 500).json({
            error: error.message || 'Error fetching variant stock',
        });
    }
};

export const updateStock = async (req: Request, res: Response) => {
    try {
        const { variantId } = req.params;
        z.string().uuid('Invalid variant ID').parse(variantId);
        // const data = updateStockSchema.parse(req.body);
        const data = req.body;
        const updateData = { variantId, ...data };
        const updatedVariant = await inventoryService.updateStock(updateData);
        res.status(200).json(updatedVariant);
    } catch (error: any) {
        res.status(error.message.includes('Invalid') ? 400 : 500).json({
            error: error.message || 'Error updating stock',
        });
    }
};

export const listStock = async (req: Request, res: Response) => {
    try {
        // const filters = stockFilterSchema.parse(req.query);
        const filters = req.query;
        const variants = await inventoryService.listStock(filters);
        res.status(200).json(variants);
    } catch (error: any) {
        res.status(error.message.includes('Invalid') ? 400 : 500).json({
            error: error.message || 'Error listing stock',
        });
    }
};

export const getLowStock = async (req: Request, res: Response) => {
    try {
        const { threshold } = lowStockSchema.parse(req.query);
        const lowStockItems = await inventoryService.getLowStock(threshold);
        res.status(200).json(lowStockItems);
    } catch (error: any) {
        res.status(error.message.includes('Invalid') ? 400 : 500).json({
            error: error.message || 'Error fetching low stock items',
        });
    }
};