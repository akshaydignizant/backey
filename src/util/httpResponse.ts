import { Request, Response } from 'express'
import { THttpResponse } from '../types/types'
import config from '../config/config'
import { EApplicationEnvironment } from '../constant/application'
import logger from './logger'

export default (req: Request, res: Response, responseStatusCode: number, responseMessage: string, data: unknown = {}, meta: unknown = null): void => {
    const response: THttpResponse = {
        success: true,
        statusCode: responseStatusCode,
        request: {
            ip: req.ip || null,
            method: req.method,
            url: req.originalUrl
        },
        message: responseMessage,
        data: data !== undefined ? data : {},  // Ensure data is never undefined
        ...(meta !== undefined && { meta }),  // Attach meta if present
    }

    // Log the response
    logger.info(`CONTROLLER_RESPONSE`, {
        meta: response
    })

    // In production environment, remove the IP from the response
    if (config.ENV === EApplicationEnvironment.PRODUCTION) {
        delete response.request.ip
    }

    // Send the response
    res.status(responseStatusCode).json(response)
}

