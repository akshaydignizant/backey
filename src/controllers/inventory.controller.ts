import { Request, Response } from 'express';
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

const addItemSchema = z.object({
    productId: z.string().uuid('Invalid product ID'),
    title: z.string().min(1, 'Title is required').max(100),
    sku: z.string().min(1, 'SKU is required').max(50),
    price: z.number().positive('Price must be positive'),
    stock: z.number().int().nonnegative('Stock must be non-negative'),
    size: z.string().optional(),
    isAvailable: z.boolean().default(true),
});

const updateItemSchema = z.object({
    title: z.string().min(1).max(100).optional(),
    sku: z.string().min(1).max(50).optional(),
    price: z.number().positive().optional(),
    stock: z.number().int().nonnegative().optional(),
    size: z.string().optional(),
    isAvailable: z.boolean().optional(),
});

const transferSchema = z.object({
    sourceWorkspaceId: z.number().int().positive('Invalid source workspace ID'),
    destinationWorkspaceId: z.number().int().positive('Invalid destination workspace ID'),
    variantId: z.string().uuid('Invalid variant ID'),
    quantity: z.number().int().positive('Quantity must be positive'),
});

export const getInventory = async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { limit, offset } = querySchema.parse(req.query);
        const inventory = await inventoryService.getInventory(parseInt(workspaceId), { limit, offset });
        res.status(200).json(inventory);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to fetch inventory' });
    }
};

export const addInventoryItem = async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const data = addItemSchema.parse(req.body);
        const item = await inventoryService.addInventoryItem(parseInt(workspaceId), data);
        res.status(201).json(item);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to add inventory item' });
    }
};

export const updateInventoryItem = async (req: Request, res: Response) => {
    try {
        const { workspaceId, itemId } = req.params;
        const data = updateItemSchema.parse(req.body);
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
        const data = transferSchema.parse(req.body);
        const transfer = await inventoryService.createInventoryTransfer(parseInt(workspaceId), data);
        res.status(201).json(transfer);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to create inventory transfer' });
    }
};