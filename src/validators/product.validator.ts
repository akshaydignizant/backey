import { z } from 'zod';

export const validateWorkspaceId = (workspaceId: string): number => {
    const schema = z
        .string()
        .transform((val) => parseInt(val, 10))
        .refine((val) => !isNaN(val) && val > 0, {
            message: 'Workspace ID must be a positive number',
        });

    return schema.parse(workspaceId);
};