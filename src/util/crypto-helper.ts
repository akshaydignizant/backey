import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY!);
const IV_LENGTH = 16;
console.log((process.env.ENCRYPTION_KEY ?? '').length); // Should log: 32

export interface EncryptedPayload {
  iv: string;
  encryptedData: string;
}

export class CryptoHelper {
  static encrypt(data: any): EncryptedPayload {
    const iv = crypto.randomBytes(IV_LENGTH); // Typically 16 bytes for AES-256-CBC
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);

    const stringified = typeof data === 'string' ? data : JSON.stringify(data);

    let encrypted = cipher.update(stringified, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted,
    };
  }

  static decrypt({ iv, encryptedData }: EncryptedPayload): any {
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, Buffer.from(iv, 'hex'));

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

}
