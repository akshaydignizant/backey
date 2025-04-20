// // Customer routes
// router.post('/:workspaceId/customers', authMiddleware, createCustomer);
// router.get('/:workspaceId/customers', authMiddleware, getCustomers);
// router.get('/:workspaceId/customers/:customerId', authMiddleware, getCustomerDetails);
// router.put('/:workspaceId/customers/:customerId', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), updateCustomer);
// router.get('/:workspaceId/customers/search', authMiddleware, searchCustomers);
// router.post('/:workspaceId/customers/:customerId/loyalty', authMiddleware, updateLoyaltyPoints);