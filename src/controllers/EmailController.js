import { sendEmail } from '../middleware/emailService.js';
// Controller gửi email
    const send = async(req, res) => {
        const { to, subject, text } = req.body;

        if (!to || !subject || !text) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        try {
            const result = await sendEmail({ to, subject, text });
            res.status(200).json({
            message: 'Email sent successfully',
            info: result
            });
        } catch (error) {
            res.status(500).json({
            message: 'Failed to send email',
            error: error.message
            });
        }
    }

export default { send };