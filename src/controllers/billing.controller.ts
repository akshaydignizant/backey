// import { Request, Response } from "express";
// import { billService } from "../services/billing.service";

// export const billController = {
//     // Create a new bill
//     createBill: async (req: Request, res: Response) => {
//         try {
//             const { userId, paymentMethod, items } = req.body;
//             const bill = await billService.createBill(userId, paymentMethod, items);
//             res.status(201).json(bill);
//         } catch (error) {
//             res.status(500).json({ error: error });
//         }
//     },

//     // Get all bills (optionally filterable)
//     getAllBills: async (req: Request, res: Response) => {
//         try {
//             const bills = await billService.getAllBills(req.query);
//             res.json(bills);
//         } catch (error) {
//             res.status(500).json({ error: error });
//         }
//     },

//     // Get bill by ID
//     getBillById: async (req: Request, res: Response) => {
//         try {
//             const { billId } = req.params;
//             const bill = await billService.getBillById(billId);
//             res.json(bill);
//         } catch (error) {
//             res.status(404).json({ error: error });
//         }
//     },

//     // Update a bill
//     updateBill: async (req: Request, res: Response) => {
//         try {
//             const { billId } = req.params;
//             const updated = await billService.updateBill(billId, req.body);
//             res.json(updated);
//         } catch (error) {
//             res.status(500).json({ error: error });
//         }
//     },

//     // Delete a bill
//     deleteBill: async (req: Request, res: Response) => {
//         try {
//             const { billId } = req.params;
//             await billService.deleteBill(billId);
//             res.status(204).send();
//         } catch (error) {
//             res.status(500).json({ error: error });
//         }
//     },

//     // Get bills by user
//     getBillsByUser: async (req: Request, res: Response) => {
//         try {
//             const { userId } = req.params;
//             const bills = await billService.getBillsByUser(userId);
//             res.json(bills);
//         } catch (error) {
//             res.status(500).json({ error: error });
//         }
//     },

//     // Get all bill items for a bill
//     getBillItemsByBill: async (req: Request, res: Response) => {
//         try {
//             const { billId } = req.params;
//             const items = await billService.getBillItemsByBill(billId);
//             res.json(items);
//         } catch (error) {
//             res.status(500).json({ error: error });
//         }
//     },

//     // Add items to a bill
//     addItemsToBill: async (req: Request, res: Response) => {
//         try {
//             const { billId } = req.params;
//             const result = await billService.addItemsToBill(billId, req.body.items);
//             res.status(201).json(result);
//         } catch (error) {
//             res.status(500).json({ error: error });
//         }
//     },

//     // Update a bill item
//     updateBillItem: async (req: Request, res: Response) => {
//         try {
//             const { itemId } = req.params;
//             const updated = await billService.updateBillItem(itemId, req.body);
//             res.json(updated);
//         } catch (error) {
//             res.status(500).json({ error: error });
//         }
//     },

//     // Delete a bill item
//     deleteBillItem: async (req: Request, res: Response) => {
//         try {
//             const { itemId } = req.params;
//             await billService.deleteBillItem(itemId);
//             res.status(204).send();
//         } catch (error) {
//             res.status(500).json({ error: error });
//         }
//     },
//     updateBillStatus: async (req: Request, res: Response) => {
//         try {
//             const { billId } = req.params;
//             const { status } = req.body;

//             const updated = await billService.updateBillStatus(billId, status);
//             res.json(updated);
//         } catch (error) {
//             res.status(400).json({ error: error });
//         }
//     }

// };

import { NextFunction, Request, Response } from "express";
import { billService } from "../services/billing.service";
import { ApiError } from "../error/ApiError";
import { BillStatus } from "@prisma/client";
import httpError from "../util/httpError";
import httpResponse from "../util/httpResponse";

export const billController = {
    createBill: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { userId, paymentMethod, items } = req.body;
            const bill = await billService.createBill(userId, paymentMethod, items);
            return httpResponse(req, res, 201, "Bill created successfully", bill);
        } catch (error) {
            return httpError(next, error, req, 400);
        }
    },

    getAllBills: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { userId, status, page = 1, limit = 20, fromDate, toDate } = req.query;

            const result = await billService.getAllBills({
                userId: userId as string | undefined,
                status: status as BillStatus | undefined,
                page: Number(page),
                limit: Number(limit),
                fromDate: fromDate ? new Date(fromDate as string) : undefined,
                toDate: toDate ? new Date(toDate as string) : undefined,
            });
            return httpResponse(req, res, 200, "Bills fetched successfully", result.data, result.meta);
        } catch (error) {
            return httpError(next, error, req, 400);
        }
    },

    getBillById: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { billId } = req.params;
            const bill = await billService.getBillById(billId);
            return httpResponse(req, res, 200, "Bill fetched successfully", bill);
        } catch (error) {
            return httpError(next, error, req, 400);
        }
    },

    updateBill: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.userId;
            const { billId } = req.params;
            const updated = await billService.updateBill(billId, userId as string, req.body);
            return httpResponse(req, res, 200, "Bill updated successfully", updated);
        } catch (error) {
            return httpError(next, error, req, 400);
        }
    },

    deleteBill: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { billId } = req.params;
            const result = await billService.deleteBill(billId);
            return httpResponse(req, res, 204, "Bill deleted successfully", result);
        } catch (error) {
            return httpError(next, error, req, 400);
        }
    },

    getBillsByUser: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { userId } = req.params;
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 20;
            const result = await billService.getBillsByUser(userId, page, limit);
            return httpResponse(req, res, 200, "User bills fetched successfully", result.data, result.meta);
        } catch (error) {
            return httpError(next, error, req, 400);
        }
    },

    getBillItemsByBill: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { billId } = req.params;
            const items = await billService.getBillItemsByBill(billId);
            return httpResponse(req, res, 200, "Bill items fetched successfully", items);
        } catch (error) {
            return httpError(next, error, req, 400);
        }
    },

    addItemsToBill: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { billId } = req.params;
            const { items } = req.body;

            if (!Array.isArray(items) || items.length === 0) {
                throw new ApiError(400, "Items array is required and cannot be empty");
            }

            const result = await billService.addItemsToBill(billId, items);
            return httpResponse(req, res, 201, "Items added to bill successfully", result);
        } catch (error) {
            return httpError(next, error, req, 400);
        }
    },

    updateBillItem: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { itemId } = req.params;
            const { quantity } = req.body;

            if (!quantity || quantity <= 0) {
                throw new ApiError(400, "Quantity must be a positive number");
            }

            const updated = await billService.updateBillItem(itemId, { quantity });
            return httpResponse(req, res, 200, "Bill item updated successfully", updated);
        } catch (error) {
            return httpError(next, error, req, 400);
        }
    },

    deleteBillItem: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { itemId } = req.params;
            await billService.deleteBillItem(itemId);
            return httpResponse(req, res, 204, "Bill item deleted successfully", null);
        } catch (error) {
            return httpError(next, error, req, 400);
        }
    },

    updateBillStatus: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { billId } = req.params;
            const { status } = req.body;
            const updated = await billService.updateBillStatus(billId, status);
            return httpResponse(req, res, 200, "Bill status updated successfully", updated);
        } catch (error) {
            return httpError(next, error, req, 400);
        }
    },
};
