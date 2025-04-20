// modules/billing/services/bill.service.ts

import { OrderStatus, PaymentMethod, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const billService = {
    // Create a new bill
    createBill: async (userId: string, paymentMethod: PaymentMethod, items: any[]) => {
        try {
            const totalAmount = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

            const bill = await prisma.bill.create({
                data: {
                    userId,
                    paymentMethod,
                    totalAmount,
                    items: {
                        create: items.map(item => ({
                            variantId: item.variantId,
                            quantity: item.quantity,
                            price: item.price,
                        })),
                    },
                },
            });

            return bill;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error("Failed to create bill: " + error.message);
            }
            throw new Error("Failed to create bill: " + String(error));
        }
    },

    // updateBillStatus: async (billId: string, status: OrderStatus) => {
    //     try {
    //         const updatedBill = await prisma.bill.update({
    //             where: { id: billId },
    //             data: { status },  // Ensure your model has 'status'
    //         });

    //         return updatedBill;
    //     } catch (error) {
    //         if (error instanceof Error) {
    //             throw new Error("Failed to update bill status: " + error.message);
    //         }
    //         throw new Error("Failed to update bill status: " + String(error));
    //     }
    // },
    // Get a specific bill by its ID
    getBillById: async (billId: string) => {
        try {
            const bill = await prisma.bill.findUnique({
                where: { id: billId },
                include: {
                    items: true, // Include related BillItems
                },
            });

            if (!bill) {
                throw new Error("Bill not found");
            }

            return bill;
        } catch (error) {
            throw new Error("Failed to retrieve bill: " + error);
        }
    },

    // Get all bills for a specific user
    getBillsByUser: async (userId: string) => {
        try {
            const bills = await prisma.bill.findMany({
                where: { userId },
            });

            return bills;
        } catch (error) {
            throw new Error("Failed to retrieve bills for user: " + error);
        }
    },

    // Get all items associated with a specific bill
    getBillItemsByBill: async (billId: string) => {
        try {
            const billItems = await prisma.billItem.findMany({
                where: { billId },
                include: {
                    variant: true, // Include related product variant details
                },
            });

            return billItems;
        } catch (error) {
            throw new Error("Failed to retrieve bill items: " + error);
        }
    },
};




// export const billService = {
//     createBill: async (userId: string, paymentMethod: string, items: any[]) => { /* same as before */ },

//     getAllBills: async (filters: { userId?: string }) => {
//         try {
//             return await prisma.bill.findMany({
//                 where: { ...filters },
//                 include: { items: true }
//             });
//         } catch (error) {
//             throw new Error("Failed to fetch bills: " + error.message);
//         }
//     },

//     getBillById: async (billId: string) => { /* same as before */ },

//     updateBill: async (billId: string, data: any) => {
//         try {
//             return await prisma.bill.update({
//                 where: { id: billId },
//                 data,
//             });
//         } catch (error) {
//             throw new Error("Failed to update bill: " + error.message);
//         }
//     },

//     deleteBill: async (billId: string) => {
//         try {
//             return await prisma.bill.delete({
//                 where: { id: billId },
//             });
//         } catch (error) {
//             throw new Error("Failed to delete bill: " + error.message);
//         }
//     },

//     getBillsByUser: async (userId: string) => { /* same as before */ },

//     getBillItemsByBill: async (billId: string) => { /* same as before */ },

//     addItemsToBill: async (billId: string, items: any[]) => {
//         try {
//             return await prisma.billItem.createMany({
//                 data: items.map(item => ({
//                     billId,
//                     variantId: item.variantId,
//                     quantity: item.quantity,
//                     price: item.price,
//                 })),
//             });
//         } catch (error) {
//             throw new Error("Failed to add items to bill: " + error.message);
//         }
//     },

//     updateBillItem: async (itemId: string, data: any) => {
//         try {
//             return await prisma.billItem.update({
//                 where: { id: itemId },
//                 data,
//             });
//         } catch (error) {
//             throw new Error("Failed to update bill item: " + error.message);
//         }
//     },

//     deleteBillItem: async (itemId: string) => {
//         try {
//             return await prisma.billItem.delete({
//                 where: { id: itemId },
//             });
//         } catch (error) {
//             throw new Error("Failed to delete bill item: " + error.message);
//         }
//     }
// };
