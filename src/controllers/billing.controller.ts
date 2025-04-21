// modules/billing/controllers/bill.controller.ts

import { Request, Response } from "express";
import { billService } from "../services/billing.service";

export const billController = {
    // Create a new bill
    createBill: async (req: Request, res: Response) => {
        try {
            const { userId, paymentMethod, items } = req.body;

            // Call the service to create a bill
            const bill = await billService.createBill(userId, paymentMethod, items);

            res.status(201).json(bill); // Send back the created bill
        } catch (error) {
            res.status(500).json({ error: error });
        }
    },

    // Get a specific bill by its ID
    getBillById: async (req: Request, res: Response) => {
        try {
            const { billId } = req.params;

            // Call the service to retrieve the bill
            const bill = await billService.getBillById(billId);

            res.json(bill); // Send the bill data
        } catch (error) {
            res.status(404).json({ error: error });
        }
    },

    // Update the status of a bill
    // updateBillStatus: async (req: Request, res: Response) => {
    //     try {
    //         const { billId } = req.params;
    //         const { status } = req.body;

    //         // Call the service to update bill status
    //         const updatedBill = await billService.updateBillStatus(billId, status);

    //         res.json(updatedBill); // Send back the updated bill
    //     } catch (error) {
    //         res.status(500).json({ error: error });
    //     }
    // },

    // Get all bills for a specific user
    getBillsByUser: async (req: Request, res: Response) => {
        try {
            const { userId } = req.params;

            // Call the service to retrieve all bills for the user
            const bills = await billService.getBillsByUser(userId);

            res.json(bills); // Send back the list of bills
        } catch (error) {
            res.status(500).json({ error: error });
        }
    },

    // Get all items for a specific bill
    getBillItemsByBill: async (req: Request, res: Response) => {
        try {
            const { billId } = req.params;

            // Call the service to retrieve bill items
            const billItems = await billService.getBillItemsByBill(billId);

            res.json(billItems); // Send back the bill items
        } catch (error) {
            res.status(500).json({ error: error });
        }
    },
};


// export const billController = {
//     createBill: async (req, res) => { /* same as before */ },

//     getAllBills: async (req, res) => {
//         try {
//             const bills = await billService.getAllBills(req.query);
//             res.json(bills);
//         } catch (error) {
//             res.status(500).json({ error: error.message });
//         }
//     },

//     getBillById: async (req, res) => { /* same as before */ },

//     updateBill: async (req, res) => {
//         try {
//             const { billId } = req.params;
//             const updated = await billService.updateBill(billId, req.body);
//             res.json(updated);
//         } catch (error) {
//             res.status(500).json({ error: error.message });
//         }
//     },

//     deleteBill: async (req, res) => {
//         try {
//             const { billId } = req.params;
//             await billService.deleteBill(billId);
//             res.status(204).send();
//         } catch (error) {
//             res.status(500).json({ error: error.message });
//         }
//     },

//     getBillsByUser: async (req, res) => { /* same as before */ },

//     getBillItemsByBill: async (req, res) => { /* same as before */ },

//     addItemsToBill: async (req, res) => {
//         try {
//             const { billId } = req.params;
//             const result = await billService.addItemsToBill(billId, req.body.items);
//             res.status(201).json(result);
//         } catch (error) {
//             res.status(500).json({ error: error.message });
//         }
//     },

//     updateBillItem: async (req, res) => {
//         try {
//             const { itemId } = req.params;
//             const updatedItem = await billService.updateBillItem(itemId, req.body);
//             res.json(updatedItem);
//         } catch (error) {
//             res.status(500).json({ error: error });
//         }
//     },

//     deleteBillItem: async (req, res) => {
//         try {
//             const { itemId } = req.params;
//             await billService.deleteBillItem(itemId);
//             res.status(204).send();
//         } catch (error) {
//             res.status(500).json({ error: error.message });
//         }
//     }
// };
