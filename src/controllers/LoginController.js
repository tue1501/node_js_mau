// controllers/UserController.js
import jwt from 'jsonwebtoken';
import connection from '../config/database.js'
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

const Login = async (req, res) => {
    try {
        const { sdt, matkhau } = req.body;


        const [rows] = await connection.query(
            'SELECT * FROM khachhang WHERE sdt = ?',
            [sdt]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found!' });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(matkhau, user.matkhau);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials!' });
        }
        const token = jwt.sign(
            { id: user.idKhachHang },  // Dữ liệu trong token
            process.env.JWT_SECRET,  // Khóa bí mật
            { expiresIn: '7d' }  // Hết hạn sau 7 ngày
        );
        return res.status(200).json({ message: 'Login successful!', token });
    } catch (error) {
        console.error('Error logging in:', error);
        return res.status(500).json({ message: 'Error logging in.' });
    }
};


const Register = async (req, res) => {
    const { hoten, sdt, matkhau,email } = req.body;
    const token = req.header('Authorization');

    if (!token) {
        return res.status(403).json({ message: 'Access denied. No token provided.' });
    }

    try {
        // Validate input data
        if (!hoten || !sdt || !matkhau || !email) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check if the phone number already exists
        const [rows] = await connection.query('SELECT idKhachHang FROM khachhang WHERE sdt = ?', [sdt]);
        if (rows.length > 0) {
            return res.status(400).json({ message: 'Phone number is already in use' });
        }

        // Hash the password
        const saltRounds = 10;
        const hashedmatkhau = await bcrypt.hash(matkhau, saltRounds);

        // Save the user to the database
        const [result] = await connection.query(
            'INSERT INTO khachhang (hoten, sdt, matkhau,gmail) VALUES (?, ?, ?, ?)',
            [hoten, sdt, hashedmatkhau,email]
        );

        res.status(201).json({
            message: 'Registration successful',
            user: {
                id: result.insertId,
                hoten,
                sdt,
                email,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};


const informations = async (req, res) => {
    const { id } = req.params;

    try {
        // Lấy thông tin người dùng từ cơ sở dữ liệu
        const [rows] = await connection.query('SELECT idKhachHang, hoten, sdt,gmail FROM khachhang WHERE idKhachHang = ?', [id]);

        // Kiểm tra nếu không tìm thấy người dùng
        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Trả về thông tin người dùng
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const addaddress = async (req, res) => {
    const { id } = req.params;
    const { diachi } = req.body; // Lấy thông tin từ body
    try {
        // Kiểm tra nếu không có ID khách hàng
        if (!id) {
            return res.status(400).json({ message: 'Customer ID is required' });
        }

        if (!diachi) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        // Cập nhật thông tin khách hàng
        const query = `
            UPDATE khachhang 
            SET 
                diachi = COALESCE(?, diachi)
            WHERE idKhachHang = ?
        `;
        const [result] = await connection.execute(query, [
            diachi || null,
            id,
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        return res.status(200).json({ message: 'Customer updated successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error updating customer', error });
    }
};

const password = async (req, res) => {
    try {
        const { id } = req.params;
        const { matkhau } = req.body;


        const [rows] = await connection.query(
            'SELECT * FROM khachhang WHERE idKhachHang = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found!' });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(matkhau, user.matkhau);

        if (!isMatch) {
            return res.status(401).json({ message: 'wrong password!' });
        }

        return res.status(200).json({ message: 'password correct!'});
    } catch (error) {
        console.error('Error password :', error);
        return res.status(500).json({ message: 'password error' });
    }
}; 


const resertpass = async (req, res) => {
    const { id } = req.params;
    const { matkhau } = req.body; // Lấy thông tin từ body
    try {
        // Kiểm tra nếu không có ID khách hàng
        if (!id) {
            return res.status(400).json({ message: 'Customer ID is required' });
        }

        if (!matkhau) {
            return res.status(400).json({ message: 'No fields to update' });
        }
        const saltRounds = 10;
        const hashedmatkhau = await bcrypt.hash(matkhau, saltRounds);
        // Cập nhật thông tin khách hàng
        const query = `
            UPDATE khachhang 
            SET 
                matkhau = COALESCE(?, matkhau)
            WHERE idKhachHang = ?
        `;
        const [result] = await connection.execute(query, [
            hashedmatkhau || null,
            id,
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        return res.status(200).json({ message: 'password updated successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error updating password', error });
    }
};


const adddiscount = async (req, res) => {
    const { id } = req.params; // ID của khách hàng
    const { discountcode } = req.body; // ID của mã giảm giá được gửi từ client

    try {
        // Kiểm tra nếu không có ID khách hàng
        if (!id) {
            return res.status(400).json({ message: 'Customer ID is required' });
        }

        // Kiểm tra nếu không có mã giảm giá
        if (!discountcode) {
            return res.status(400).json({ message: 'Discount ID is required' });
        }

        // Kiểm tra khách hàng có tồn tại không
        const [customer] = await connection.execute(
            'SELECT * FROM khachhang WHERE idKhachHang = ?',
            [id]
        );

        if (customer.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        // Kiểm tra mã giảm giá có tồn tại không
        const [discount] = await connection.execute(
            'SELECT * FROM giamgia WHERE tengiamgia = ?',
            [discountcode]
        );

        if (discount.length === 0) {
            return res.status(404).json({ message: 'Discount not found' });
        }

        const idGiamGia = discount[0].idGiamGia;
        // Kiểm tra nếu mã giảm giá đã được thêm cho khách hàng này
        const [existingEntry] = await connection.execute(
            'SELECT * FROM chitietgiamgia WHERE idKhachHang = ? AND idGiamGia = ?',
            [id, idGiamGia]
        );

        if (existingEntry.length > 0) {
            return res.status(400).json({ message: 'Discount has already been assigned to this customer' });
        }

        // Thêm mã giảm giá cho khách hàng vào bảng `chitietgiamgia`
        await connection.execute(
            'INSERT INTO chitietgiamgia (idKhachHang, idGiamGia, trangthai) VALUES (?, ?, ?)',
            [id, idGiamGia, 0] // 0 là trạng thái chưa sử dụng
        );
        return res.status(201).json({ message: 'Discount successfully added to the customer' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error', error });
    }
};


const discountbyid = async (req, res) => {
    const { id } = req.params; // ID của khách hàng

    try {
        const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' '); // Lấy thời gian hiện tại

        // Truy vấn tất cả giảm giá của khách hàng, kết hợp với thông tin từ bảng `giamgia`
        const [discounts] = await connection.execute(
            `SELECT g.tengiamgia, g.ngaybatdau, g.ngayketthuc, g.mota, ct.trangthai
             FROM chitietgiamgia ct
             JOIN giamgia g ON ct.idGiamGia = g.idGiamGia
             WHERE ct.idKhachHang = ? AND g.ngayketthuc >= ?`,
            [id, currentDate]
        );

        // Kiểm tra nếu không có giảm giá nào hợp lệ
        if (discounts.length === 0) {
            return res.status(404).json({ message: 'No valid discounts found for this customer' });
        }

        // Trả về danh sách các mã giảm giá hợp lệ
        return res.status(200).json({ data: discounts });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error', error });
    }
};
import { jwtBlacklist } from '../middleware/jwtBlacklist.js';  // Import blacklist từ jwtBlacklist.js

dotenv.config();

const logout = (req, res) => {
    const token = req.header('Authorization')?.split(' ')[1];  // Lấy token từ header Authorization

    if (!token) {
        return res.status(400).json({ success: false, message: 'Token missing' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);  // Giải mã token để lấy thông tin người dùng

        // Thêm token vào blacklist
        jwtBlacklist.add(token);  // Đưa token vào blacklist để không sử dụng lại

        res.clearCookie('token');  // Nếu bạn dùng cookie để lưu token
        return res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Xuất khẩu hàm getAllUsers
export default { 
    Register,Login,informations,addaddress,password,resertpass,adddiscount,discountbyid,logout,
};
