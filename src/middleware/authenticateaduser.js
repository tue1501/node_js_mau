import jwt from 'jsonwebtoken';
import { jwtBlacklist } from './jwtBlacklist.js'; // Import blacklist từ jwtBlacklist.js
import connection from '../config/database.js'
import dotenv from 'dotenv';
dotenv.config();
const authenticateJWTadminoruser = async (req, res, next) => {
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
        // Kiểm tra id của người dùng
        if (!decoded.id && !decoded.idad) {
            return res.status(400).json({ success: false, message: 'Invalid token, user ID missing' });
        }
        if (decoded.idad) {
            const [rows] = await connection.execute(
                `SELECT q.idQuyen 
                    FROM qtv AS qtv
                    JOIN quyen AS q ON qtv.idQuyen = q.idQuyen
                    WHERE qtv.idQtv = ?`,
                [decoded.idad]
            );
            if (rows.length === 0 || rows[0].idQuyen === 3) {
                return res.status(403).json({ success: false, message: 'cút' });
            }
            req.admin = decoded;
        }
        if (decoded.id) {
            req.user = decoded;  // Gán thông tin người dùng vào req.user để sử dụng trong các route
        }
        next();  // Tiếp tục xử lý yêu cầu
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};
export default authenticateJWTadminoruser; 