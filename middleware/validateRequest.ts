import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

/**
 * ✅ Generic validation middleware for any request body
 * @param schema - Zod schema to validate request body
 */
const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): any => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const formattedErrors = result.error.flatten();
      return res.status(400).json({
        success: false,
        errors: formattedErrors.fieldErrors, // Cleaner error response
      }); // ✅ Properly closed JSON response
    }

    next(); // ✅ Proceed only if validation is successful
  };
};

export default validateRequest;
