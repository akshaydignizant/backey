import { NextFunction, Request, Response } from 'express'
import { THttpError } from '../types/types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default (err: THttpError, _: Request, res: Response, __: NextFunction) => {
    // res.status(err.statusCode).json(err)
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Something went wrong!';
    res.status(statusCode).json({
        success: false,
        message,
        // error: err.stack, // optional
    });
};
