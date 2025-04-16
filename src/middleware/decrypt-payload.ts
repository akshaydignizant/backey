import { Request, Response, NextFunction } from 'express';
import { CryptoHelper } from '../util/crypto-helper';

export const decryptPayload = (req: Request, res: Response, next: NextFunction): void => {
  const { iv, encryptedData } = req.body;

  if (!iv || !encryptedData) {

    res.status(400).send('Missing encrypted data or IV');
  }

  try {
    const decrypted = CryptoHelper.decrypt({ iv, encryptedData });
    req.body = decrypted; // Attach the decrypted data to the request body
    next();
  } catch (error) {

    res.status(400).send('Decryption failed');
  }
};
