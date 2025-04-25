import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from './cloudinaryConfig';

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'backey',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'mp4', 'mov', 'mp3', 'wav', 'pdf', 'docx', 'zip', 'rar'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }],
    } as unknown as { folder: string; format: () => string; transformation?: object[] }
});

const upload = multer({ storage });

export default upload;