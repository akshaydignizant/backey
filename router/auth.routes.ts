import { Router } from 'express';
import { authController } from '../controller/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/signup', authController.signup);
router.post('/signin', authController.signin);
router.post('/refresh-token',authMiddleware, authController.refreshToken);
router.post('/logout', authMiddleware, authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOtp);
router.post('/reset-password', authMiddleware, authController.resetPassword);

export default router;
