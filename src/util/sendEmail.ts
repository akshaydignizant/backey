import nodemailer from "nodemailer";

/**
 * Function to send an email with HTML support.
 * @param to - Recipient email
 * @param subject - Email subject
 * @param html - Email body in HTML format
 */
const sendEmail = async (to: string, subject: string, html: string) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "Gmail", // You can use "SendGrid", "Mailgun", etc.
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: `"Backey Management" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${to}: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error("Error sending email:", error);
        throw new Error("Failed to send email");
    }
};

export default sendEmail;
