import jwt from 'jsonwebtoken';
import { jwtBlacklist } from './jwtBlacklist.js'; // Import blacklist từ jwtBlacklist.js
import dotenv from 'dotenv';
dotenv.config();

const authenticateJWT = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];  // Lấy token từ header Authorization

    if (!token) {
        return res.status(403).json({ success: false, message: 'Access denied, token missing' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);  // Giải mã token với secret key

        // Kiểm tra xem token có bị blacklist không
        if (jwtBlacklist.has(token)) {
            return res.status(403).json({ success: false, message: 'Token is blacklisted' });
        }

        req.user = decoded;  // Gán thông tin người dùng vào req.user để sử dụng trong các route
        next();  // Tiếp tục xử lý yêu cầu
    } catch (err) {
        
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });

    }
};

export default authenticateJWT; 

export const verifyToken = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1]; // Lấy token từ header
        if (!token) {
            return res.status(403).json({ message: "Không có token, vui lòng đăng nhập!" });
        }

        // Xác thực token
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Sử dụng SECRET_KEY từ dotenv
        req.user = decoded; // Lưu user vào request
        next(); // Cho phép tiếp tục vào API
    } catch (err) {
        return res.status(401).json({ message: "Token không hợp lệ hoặc hết hạn!" });
    }
};