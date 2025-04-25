import { Request, Response } from "express";
import { billService } from "../services/billing.service";

export const billController = {
    // Create a new bill
    createBill: async (req: Request, res: Response) => {
        try {
            const { userId, paymentMethod, items } = req.body;
            const bill = await billService.createBill(userId, paymentMethod, items);
            res.status(201).json(bill);
        } catch (error) {
            res.status(500).json({ error: error });
        }
    },

    // Get all bills (optionally filterable)
    getAllBills: async (req: Request, res: Response) => {
        try {
            const bills = await billService.getAllBills(req.query);
            res.json(bills);
        } catch (error) {
            res.status(500).json({ error: error });
        }
    },

    // Get bill by ID
    getBillById: async (req: Request, res: Response) => {
        try {
            const { billId } = req.params;
            const bill = await billService.getBillById(billId);
            res.json(bill);
        } catch (error) {
            res.status(404).json({ error: error });
        }
    },

    // Update a bill
    updateBill: async (req: Request, res: Response) => {
        try {
            const { billId } = req.params;
            const updated = await billService.updateBill(billId, req.body);
            res.json(updated);
        } catch (error) {
            res.status(500).json({ error: error });
        }
    },

    // Delete a bill
    deleteBill: async (req: Request, res: Response) => {
        try {
            const { billId } = req.params;
            await billService.deleteBill(billId);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: error });
        }
    },

    // Get bills by user
    getBillsByUser: async (req: Request, res: Response) => {
        try {
            const { userId } = req.params;
            const bills = await billService.getBillsByUser(userId);
            res.json(bills);
        } catch (error) {
            res.status(500).json({ error: error });
        }
    },

    // Get all bill items for a bill
    getBillItemsByBill: async (req: Request, res: Response) => {
        try {
            const { billId } = req.params;
            const items = await billService.getBillItemsByBill(billId);
            res.json(items);
        } catch (error) {
            res.status(500).json({ error: error });
        }
    },

    // Add items to a bill
    addItemsToBill: async (req: Request, res: Response) => {
        try {
            const { billId } = req.params;
            const result = await billService.addItemsToBill(billId, req.body.items);
            res.status(201).json(result);
        } catch (error) {
            res.status(500).json({ error: error });
        }
    },

    // Update a bill item
    updateBillItem: async (req: Request, res: Response) => {
        try {
            const { itemId } = req.params;
            const updated = await billService.updateBillItem(itemId, req.body);
            res.json(updated);
        } catch (error) {
            res.status(500).json({ error: error });
        }
    },

    // Delete a bill item
    deleteBillItem: async (req: Request, res: Response) => {
        try {
            const { itemId } = req.params;
            await billService.deleteBillItem(itemId);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: error });
        }
    },
    updateBillStatus: async (req: Request, res: Response) => {
        try {
            const { billId } = req.params;
            const { status } = req.body;

            const updated = await billService.updateBillStatus(billId, status);
            res.json(updated);
        } catch (error) {
            res.status(400).json({ error: error });
        }
    }

};
