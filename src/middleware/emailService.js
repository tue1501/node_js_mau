import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();  // Load biến môi trường từ .env

// Hàm gửi email
async function sendEmail({ to, html }) {
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
    subject: 'Petland',  // Tiêu đề email
    html  // Nội dung email dạng HTML
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
