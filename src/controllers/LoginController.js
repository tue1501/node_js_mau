import jwt from 'jsonwebtoken';
import connection from '../config/database.js'
import connectDB from '../config/db.js'
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
dotenv.config();

const Loginelenew = async (req, res) => {
    try {
        const { sdt, matkhau } = req.body; // Lấy thông tin từ body

        // Truy vấn người dùng từ MySQL theo số điện thoại
        const [rows] = await connection.query(
            'SELECT * FROM khachhang WHERE sdt = ?',
            [sdt]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Số điện thoại chưa được đăng ký!' });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(matkhau, user.matkhau);

        if (!isMatch) {
            return res.status(401).json({ message: 'Sai mật khẩu!' });
        }

        // Kiểm tra nếu user đã tồn tại trong MongoDB
        let mongoUser = await User.findOne({ phone: user.sdt });

        if (mongoUser) {
            if (mongoUser.eleid) {
                return res.status(400).json({ message: "Số điện thoại đã được đăng ký với ele!" });
            }
        } else {
            // Tạo user mới nếu chưa có trong MongoDB
            mongoUser = new User({
                name: user.hoTen,
                email: user.email,
                phone: user.sdt,
                password: await bcrypt.hash(matkhau, 10),
                role: 'guest',
                eleid: uuidv4(),  // Tạo eleid mới
            });

            await mongoUser.save();
        }

        // Tạo token
        const token = jwt.sign(
            {
                id: mongoUser._id,
                name: mongoUser.name,
                email: mongoUser.email,
                phone: mongoUser.phone,
                role: mongoUser.role,
                eleid: mongoUser.eleid,
            },
            process.env.JWT_SECRET_ELE,
            { expiresIn: '7d' }
        );

        return res.status(200).json({
            message: mongoUser.eleid ? 'Đăng nhập thành công!' : 'Đăng ký thành công!',
            token,
        });

    } catch (error) {
        console.error('Lỗi khi xử lý đăng nhập:', error);
        return res.status(500).json({ message: 'Lỗi khi đăng nhập.' });
    }
};


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
            return res.status(401).json({ message: 'wrong password!' });
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
    const { hoten, sdt, matkhau, confirmMatkhau, email } = req.body;

    try {
        // Kiểm tra xem các trường có đầy đủ không
        if (!hoten || !sdt || !matkhau || !confirmMatkhau || !email) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        const passwordRegex = /^.{8,}$/;  // Mật khẩu phải có ít nhất 8 ký tự
        if (!passwordRegex.test(matkhau)) {
            return res.status(400).json({ message: "Password must be at least 8 characters long." });        
        }

        // Kiểm tra số điện thoại phải đủ 10 ký tự
        const phoneRegex = /^[0-9]{10}$/;  // Kiểm tra số điện thoại có đúng 10 chữ số
        if (!phoneRegex.test(sdt)) {
            return res.status(400).json({ message: "Phone number must be exactly 10 digits." });
        }
        // Kiểm tra xác nhận mật khẩu
        if (matkhau !== confirmMatkhau) {
            return res.status(400).json({ message: 'Password confirmation does not match' });
        }
        // Kiểm tra email đã tồn tại chưa
        const [emailRows] = await connection.query('SELECT idKhachHang FROM khachhang WHERE gmail = ?', [email]);
        if (emailRows.length > 0) {
            return res.status(400).json({ message: 'Email is already in use' });
        }
        // Kiểm tra số điện thoại đã tồn tại chưa
        const [rows] = await connection.query('SELECT idKhachHang FROM khachhang WHERE sdt = ?', [sdt]);
        if (rows.length > 0) {
            return res.status(400).json({ message: 'Phone number is already in use' });
        }

        // Băm mật khẩu
        const saltRounds = 10;
        const hashedmatkhau = await bcrypt.hash(matkhau, saltRounds);

        // Lưu vào cơ sở dữ liệu
        const [result] = await connection.query(
            'INSERT INTO khachhang (hoten, sdt, matkhau, gmail) VALUES (?, ?, ?, ?)',
            [hoten, sdt, hashedmatkhau, email]
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
    try {
        const userId = req.user.id; // Lấy ID từ token đã giải mã
        const [rows] = await connection.query(
            'SELECT idKhachHang, hoten, sdt, gmail,diachi FROM khachhang WHERE idKhachHang = ?', 
            [userId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }

        // Trả về thông tin người dùng dưới dạng JSON
        res.status(200).json(rows[0]);
    } catch (error) {
        // Ghi log lỗi nếu có
        console.error(error);
        // Trả về lỗi server nếu có vấn đề xảy ra
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

const addaddress = async (req, res) => {
        const id = req.user.id; // Lấy ID từ token đã giải mã
        const { diachi ,hoten } = req.body;
        try {
        // Truy vấn cơ sở dữ liệu để lấy thông tin người dùng dựa trên userId từ token
        if (!id) {
            return res.status(400).json({ message: 'Customer ID is required' });
        }
        if (hoten) {
            const query = `
            UPDATE khachhang
            SET
                hoten = COALESCE(?, hoten)   
            WHERE idKhachHang = ?
            `;
            const [result] = await connection.execute(query, [
                hoten || null,  
                id,
            ]);
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Customer not found' });
            }
            return res.status(200).json({ message: 'Customer updated successfully' });
        }
        if (diachi) {
            const query = `
            UPDATE khachhang 
            SET 
                diachi = ?
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
        }
        return res.status(200).json({ message: 'Error updating customer' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error updating customer', error });
    }
};

const resertpass = async (req, res) => {
    const id = req.user.id; // Lấy ID từ token đã giải mã\
    const { matkhaucu, matkhau } = req.body; // Lấy thông tin từ body
    try {
        // Kiểm tra nếu không có ID khách hàng
        if (!id) {
            return res.status(400).json({ message: 'Customer ID is required' });
        }
        const [rows] = await connection.execute(
            'SELECT matkhau FROM khachhang WHERE idKhachHang = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        const isMatch = await bcrypt.compare(matkhaucu, rows[0].matkhau);
        if (!isMatch) {
            return res.status(400).json({ message: 'Old password is incorrect' });
        }

        if (!matkhaucu) {
            return res.status(400).json({ message: 'Old password is required' });
        }
        
        const passwordRegex = /^.{8,}$/;  // Mật khẩu phải có ít nhất 8 ký tự
        if (!matkhau || !passwordRegex.test(matkhau)) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
        }
       
        // Mã hóa mật khẩu mới
        const saltRounds = 10;
        const hashedMatkhau = await bcrypt.hash(matkhau, saltRounds);

        // Cập nhật mật khẩu mới vào cơ sở dữ liệu
        const query = 'UPDATE khachhang SET matkhau = ? WHERE idKhachHang = ?';
        const [result] = await connection.execute(query, [hashedMatkhau, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        return res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error updating password', error });
    }
};



const adddiscount = async (req, res) => {
    const id = req.user.id; // Lấy ID từ token đã giải mã
    const { discountcode } = req.body; // Tên mã giảm giá được gửi từ client

    try {
        // Kiểm tra nếu không có ID khách hàng
        if (!id) {
            return res.status(400).json({ message: 'Customer ID is required' });
        }

        // Kiểm tra nếu không có mã giảm giá
        if (!discountcode) {
            return res.status(400).json({ message: 'Discount code is required' });
        }

        // Kiểm tra khách hàng có tồn tại không
        const [customer] = await connection.execute(
            'SELECT * FROM khachhang WHERE idKhachHang = ?',
            [id]
        );

        if (customer.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        // Kiểm tra mã giảm giá có tồn tại không và lấy soluong
        const [discount] = await connection.execute(
            'SELECT idGiamGia, soluong FROM giamgia WHERE tengiamgia = ?',
            [discountcode]
        );

        if (discount.length === 0) {
            return res.status(404).json({ message: 'Discount not found' });
        }

        const idGiamGia = discount[0].idGiamGia;
        const soluong = discount[0].soluong;

        // Kiểm tra số lượng mã giảm giá
        if (soluong <= 0) {
            return res.status(400).json({ message: 'Discount code is out of stock!' });
        }

        // Kiểm tra xem mã giảm giá đã được gán cho khách hàng chưa
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

        // Giảm số lượng trong bảng giamgia
        await connection.execute(
            'UPDATE giamgia SET soluong = soluong - 1 WHERE idGiamGia = ?',
            [idGiamGia]
        );

        return res.status(201).json({ message: 'Discount successfully added to the customer' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error', error });
    }
};


const discountbyid = async (req, res) => {
    const id = req.user.id; 

    try {
        const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' '); // Lấy thời gian hiện tại
        // Truy vấn tất cả giảm giá của khách hàng, kết hợp với thông tin từ bảng `giamgia`
        const [discounts] = await connection.execute(
            `SELECT g.idGiamGia, g.tengiamgia,g.giamgia, g.giamax,g.giamin, g.danggiamgia, g.mota, ct.trangthai,g.ngaybatdau, g.ngayketthuc
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
        for (const token of jwtBlacklist) {
            console.log(token);
        }
        return res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};



const LoginQtv = async (req, res) => {
    try {
        const { sdt, matkhau } = req.body;

        const [rows] = await connection.execute(
            'SELECT * FROM qtv WHERE sdt = ? AND (idQuyen = 1 OR idQuyen = 2)',
            [sdt]
        );              
        if (rows.length === 0) {
            return res.status(403).json({ message: 'Quản trị viên không tồn tại hoặc bạn không có quyền truy cập!' });
        }
        
        const qtv = rows[0];

        // So sánh mật khẩu
        const isMatch = await bcrypt.compare(matkhau, qtv.matkhau);

        if (!isMatch) {
            return res.status(401).json({ message: 'Sai mật khẩu!' });
        }

        // Tạo JWT token cho quản trị viên
        const token = jwt.sign(
            { id: qtv.idQtv },  // Payload chứa idQtv
            process.env.JWT_SECRET,  // Khóa bí mật
            { expiresIn: '7d' }  // Token hết hạn sau 7 ngày
        );

        // Trả về token và thông báo thành công
        return res.status(200).json({ message: 'Đăng nhập thành công!', token });
    } catch (error) {
        console.error('Lỗi khi đăng nhập QTV:', error);
        return res.status(500).json({ message: 'Lỗi khi đăng nhập QTV.' });
    }
};


const addAdmin = async (req, res) => {
    try {
        const { hoten, sdt, matkhau, idQuyen, ngaysinh, gioitinh, cmnd } = req.body;

        // Kiểm tra dữ liệu bắt buộc
        if (!hoten || !sdt || !matkhau || !idQuyen) {
            return res.status(400).json({ message: 'Tên, số điện thoại, mật khẩu và idQuyen là bắt buộc!' });
        }

        // Kiểm tra số điện thoại đã tồn tại chưa
        const [existingAdmin] = await connection.execute(
            'SELECT * FROM qtv WHERE sdt = ?',
            [sdt]
        );

        if (existingAdmin.length > 0) {
            return res.status(400).json({ message: 'Số điện thoại đã tồn tại!' });
        }

        // Mã hóa mật khẩu
        const hashedPassword = await bcrypt.hash(matkhau, 10);

        // Thêm admin mới vào database
        const [result] = await connection.execute(
            `INSERT INTO qtv (hoten, sdt, matkhau, idQuyen, ngaysinh, gioitinh, cmnd)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [hoten, sdt, hashedPassword, idQuyen, ngaysinh || null, gioitinh || null, cmnd || null]
        );

        // Lấy tên quyền
        const [quyenRows] = await connection.execute(
            'SELECT tenquyen FROM quyen WHERE idQuyen = ?',
            [idQuyen]
        );

        const tenquyen = quyenRows.length > 0 ? quyenRows[0].tenquyen : null;

        return res.status(201).json({
            message: 'Admin đã được thêm thành công!',
            data: {
                id: result.insertId,
                hoten,
                sdt,
                tenquyen,
                ngaysinh: ngaysinh || null,
                gioitinh: gioitinh || null,
                cmnd: cmnd || null
            }
        });
    } catch (err) {
        console.error('Lỗi khi thêm admin:', err);
        return res.status(500).json({ message: 'Lỗi hệ thống khi thêm admin!', error: err.message });
    }
};


const addtoken = async (req, res) => {
    try {
        const { token } = req.body; // Lấy token từ body
        const userId = req.user.id; // Lấy ID từ token đã giải mã

        // Kiểm tra dữ liệu đầu vào
        if (!token) {
            return res.status(400).json({ message: 'Token là bắt buộc!' });
        }

        // Kiểm tra xem token đã tồn tại trong DB chưa
        const [existingToken] = await connection.execute(
            'SELECT token FROM khachhang WHERE idKhachHang = ?',
            [userId]
        );

        let tokenArray = [];

        if (existingToken.length > 0 && existingToken[0].token) {
            // Xử lý dữ liệu token từ DB
            if (typeof existingToken[0].token === 'string') {
                // Nếu là chuỗi, parse thành mảng
                try {
                    tokenArray = JSON.parse(existingToken[0].token);
                } catch (err) {
                    console.error('Lỗi khi parse token array:', err);
                    tokenArray = [];
                }
            } else if (Array.isArray(existingToken[0].token)) {
                // Nếu đã là mảng (do DB tự parse), sử dụng trực tiếp
                tokenArray = existingToken[0].token;
            }

            // Đảm bảo tokenArray là một mảng
            if (!Array.isArray(tokenArray)) {
                tokenArray = [];
            }

            // Kiểm tra xem token đã tồn tại trong mảng chưa
            if (tokenArray.includes(token)) {
                return res.status(400).json({ message: 'Token này đã tồn tại!' });
            }

            // Thêm token mới vào mảng
            tokenArray.push(token);
        } else {
            // Nếu chưa có token nào, khởi tạo mảng mới với token
            tokenArray = [token];
        }

        // Cập nhật token vào cơ sở dữ liệu dưới dạng chuỗi JSON
        await connection.execute(
            'UPDATE khachhang SET token = ? WHERE idKhachHang = ?',
            [JSON.stringify(tokenArray), userId]
        );

        return res.status(201).json({ message: 'Token đã được thêm thành công!' });
    } catch (error) {
        console.error('Lỗi khi thêm token:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống khi thêm token!', error: error.message });
    }
};

const checktonken = async (req, res) => {
    try {
        const token = req.header('Authorization')?.split(' ')[1]; // Lấy token từ header Authorization
        const id = req.admin.id; // Lấy ID từ token đã giải mã
        if (!token) {
            return res.status(400).json({ success: false, message: 'Token missing' });
        }

        const [rows] = await connection.execute(
            'SELECT idQtv, hoten, sdt, idQuyen, ngaysinh, gioitinh, cmnd FROM qtv WHERE idQtv = ?',
            [id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy quản trị viên' });
        }        
        const user = rows[0];        
        if (user.idQuyen === 3) {
            return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
        }
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Token không hợp lệ' });
        }
        return res.status(200).json({ success: true, result : rows , message: 'Token hợp lệ' });
    } catch (error) {
        console.error('Lỗi khi kiểm tra token:', error);
        return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi kiểm tra token!', error: error.message });
    }
}

// Xuất khẩu hàm getAllUsers
export default { 
    Register,Login,informations,addaddress,resertpass,adddiscount,discountbyid,logout,Loginelenew,LoginQtv,addAdmin,addtoken,checktonken
};
