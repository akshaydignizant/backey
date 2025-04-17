import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { decryptPayload } from '../middleware/decrypt-payload';

const router = Router();

router.post('/signup', decryptPayload, authController.signup);
router.post('/signin-test', authController.signintest);    //frontend
router.post('/signin', decryptPayload, authController.signin);
router.post('/refresh-token', authMiddleware, authController.refreshToken);
router.post('/logout', authMiddleware, authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOtp);
router.post('/reset-password', authController.resetPassword);
router.put('/profile', authController.UpdateProfile);

export default router;
