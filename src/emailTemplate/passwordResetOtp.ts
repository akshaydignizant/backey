export function generatePasswordResetEmail(user: { firstName: string }, otp: string): string {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #2d3748;">Hi ${user.firstName},</h2>
      <p style="font-size: 16px; color: #4a5568;">
        You recently requested to reset your password. Please use the following OTP (One-Time Password) to proceed:
      </p>
      <div style="margin: 20px 0; text-align: center;">
        <span style="display: inline-block; font-size: 24px; font-weight: bold; padding: 10px 20px; background-color: #edf2f7; color: #2d3748; border-radius: 6px; letter-spacing: 2px;">
          ${otp}
        </span>
      </div>
      <p style="font-size: 14px; color: #718096;">
        This OTP will expire in <strong>5 minutes</strong>. If you did not request a password reset, please ignore this email or contact support.
      </p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;" />
      <p style="font-size: 12px; color: #a0aec0; text-align: center;">
        © ${new Date().getFullYear()} Backey Management. All rights reserved.
      </p>
    </div>
  `;
}
