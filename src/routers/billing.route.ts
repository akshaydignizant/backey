// route.ts

import { Router } from "express";
import { billController } from "../controllers/billing.controller";

const router = Router();

// Route to create a new bill
router.post("/bills", billController.createBill);

// Route to get a specific bill by its ID
router.get("/bills/:billId", billController.getBillById);

// Route to update the status of a bill (e.g., marking it as paid)
// router.patch("/bills/:billId/status", billController.updateBillStatus);

// Route to get all bills for a specific user
router.get("/users/:userId/bills", billController.getBillsByUser);

// Route to get all bill items associated with a specific bill
router.get("/bills/:billId/items", billController.getBillItemsByBill);


// router.post("/", billController.createBill);
// router.get("/", billController.getAllBills);
// router.get("/:billId", billController.getBillById);
// router.put("/:billId", billController.updateBill);
// router.delete("/:billId", billController.deleteBill);
// router.get("/user/:userId", billController.getBillsByUser);

// // Bill items routes
// router.get("/:billId/items", billController.getBillItemsByBill);
// router.post("/:billId/items", billController.addItemsToBill);
// router.put("/:billId/items/:itemId", billController.updateBillItem);
// router.delete("/:billId/items/:itemId", billController.deleteBillItem);

// Endpoint | Method | Description
//     / api / bills / | POST | Create new bill
//         / api / bills / | GET | Get all bills(with filters)
// /api/bills /: billId | GET | Get specific bill by ID
//     / api / bills /: billId | PUT | Update an existing bill
//         / api / bills /: billId | DELETE | Delete a bill
//             / api / bills / user /: userId | GET | Get all bills for a user
//                 / api / bills /: billId / items | GET | Get all items of a bill
//                     / api / bills /: billId / items | POST | Add item(s) to a bill
//                         / api / bills /: billId / items /: itemId | PUT | Update a specific bill item
//                             / api / bills /: billId / items /: itemId | DELETE | Delete a specific bill item


export default router;
