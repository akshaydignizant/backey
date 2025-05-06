// A function to generate the HTML content for the invitation email
export const generateInvitationEmailHtml = (firstName: string, tempPassword: string, workspace: { name: string }, inviteToken: string) => {
  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="UTF-8" /></head>
      <body style="font-family: Arial, sans-serif; background: #f6f6f6; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 10px;">
          <h2 style="color: #333;">👋 You're Invited!</h2>
          <p>Hi <strong>${firstName}</strong>,</p>
          <p>You’ve been invited to join <strong>${workspace.name}</strong> as a <strong>Role</strong>.</p>
          <p>Your temporary password is: <strong style="background: #f0f0f0; padding: 5px; border-radius: 3px;">${tempPassword}</strong></p>
          <p>Please log in and update your password.</p>
          <a href="${process.env.SERVER_URL}/api/v1/workspaces/invitation/accept/${inviteToken}"
             style="display: inline-block; margin: 20px 0; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">
            Accept Invitation
          </a>
          <p style="font-size: 12px; color: #999;">Backey Management © ${new Date().getFullYear()}</p>
        </div>
      </body>
    </html>
  `;
};
