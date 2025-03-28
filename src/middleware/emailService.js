import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();  // Load biến môi trường từ .env

// Hàm gửi email
async function sendEmail({ to, subject, text }) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',  // Hoặc dịch vụ email khác như Mailgun, SendGrid...
    auth: {
      user: process.env.EMAIL_USER,  // Lấy giá trị từ .env
      pass: process.env.EMAIL_PASS   // Lấy giá trị từ .env
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,  // Địa chỉ email gửi
    to,
    subject,
    text
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    throw new Error('Failed to send email: ' + error.message);
  }
}

// Đảm bảo xuất sendEmail chính xác
export { sendEmail };
