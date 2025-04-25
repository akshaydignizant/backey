import { PrismaClient, PaymentMethod, BillStatus, BillItem } from "@prisma/client";

const prisma = new PrismaClient();

export const billService = {
    createBill: async (userId: string, paymentMethod: PaymentMethod, items: BillItem[]) => {
        const totalAmount = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

        return await prisma.bill.create({
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
    },

    getAllBills: async (filters: { userId?: string }) => {
        return await prisma.bill.findMany({
            where: { ...filters },
            include: { items: true },
        });
    },

    getBillById: async (billId: string) => {
        const bill = await prisma.bill.findUnique({
            where: { id: billId },
            include: { items: true },
        });
        if (!bill) throw new Error("Bill not found");
        return bill;
    },

    updateBill: async (billId: string, data: any) => {
        return await prisma.bill.update({
            where: { id: billId },
            data,
        });
    },

    deleteBill: async (billId: string) => {
        return await prisma.bill.delete({ where: { id: billId } });
    },

    getBillsByUser: async (userId: string) => {
        return await prisma.bill.findMany({ where: { userId } });
    },

    getBillItemsByBill: async (billId: string) => {
        return await prisma.billItem.findMany({
            where: { billId },
            include: { variant: true },
        });
    },

    addItemsToBill: async (billId: string, items: any[]) => {
        return await prisma.billItem.createMany({
            data: items.map(item => ({
                billId,
                variantId: item.variantId,
                quantity: item.quantity,
                price: item.price,
            })),
        });
    },

    updateBillItem: async (itemId: string, data: any) => {
        return await prisma.billItem.update({
            where: { id: itemId },
            data,
        });
    },

    deleteBillItem: async (itemId: string) => {
        return await prisma.billItem.delete({
            where: { id: itemId },
        });
    },
    updateBillStatus: async (billId: string, status: BillStatus) => {
        return await prisma.bill.update({
            where: { id: billId },
            data: { status },
        });
    }

};
