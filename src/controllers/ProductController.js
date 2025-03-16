// controllers/UserController.js
import connection from '../config/database.js'
import jwt from 'jsonwebtoken';
// src/controllers/authController.js
import twilio from 'twilio';
// import connection from '../config/database.js';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
// Sử dụng import (ES Modules)
import { fileURLToPath } from "url";
import path from "path";
import fs from 'fs/promises'; // Import fs.promises để dùng với async/await
// Tạo __dirname theo cách thủ công trong ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { jwtBlacklist } from '../middleware/jwtBlacklist.js';  // Import blacklist từ jwtBlacklist.js
import multer from 'multer';


dotenv.config();

// Cấu hình Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = new twilio(accountSid, authToken);

// Bộ nhớ tạm thời để lưu OTP (nên thay bằng Redis hoặc Database trong thực tế)
const otpStore = new Map(); 

const sendSms = async (req, res) => {
    try {
      const { sdt } = req.body; // Lấy số điện thoại từ request
  
      // Kiểm tra xem số điện thoại có được truyền vào không
      if (!sdt) {
        return res.status(400).json({ success: false, error: "Missing 'sdt' field" });
      }
  
      // Truy vấn dữ liệu khách hàng từ cơ sở dữ liệu
      const [rows] = await connection.query(
        'SELECT * FROM khachhang WHERE sdt = ?',
        [sdt]
      );
  
      // Kiểm tra nếu không có dữ liệu trả về từ query
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Số điện thoại không tồn tại' });
      }
  
      // Định dạng số điện thoại với mã quốc gia +1 nếu cần
      const to = sdt.startsWith('+1') ? sdt : '+1' + sdt;
  
      // Tạo mã OTP ngẫu nhiên 6 chữ số
      const otp = Math.floor(100000 + Math.random() * 900000);
  
      // Lưu OTP vào bộ nhớ tạm thời (có thể sử dụng Redis hoặc Database thực tế)
      otpStore.set(sdt, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });
  
      // Nội dung tin nhắn OTP
      const messageBody = `Your verification code is: ${otp}. It will expire in 5 minutes.`;

      // Gửi OTP qua SMS
    const token = jwt.sign(
        { sdt },  // Payload chứa số điện thoại
        process.env.JWT_SECRET, // Mã bí mật của bạn (đặt trong file .env)
        { expiresIn: '10m' }    // Token hết hạn sau 10 phút (hoặc thời gian tùy chỉnh)
    );
      const message = await client.messages.create({
        body: messageBody,
        from: process.env.TWILIO_PHONE_NUMBER, // Số Twilio
        to,
      });
  
      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully!',
        sid: message.sid,
        to,
        token : token
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  };
  
// Xác thực OTP
const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        const phoneNumber = req.user.sdt; // Lấy ID từ token đã giải mã
        if (!phoneNumber || !otp) {
            return res.status(400).json({ success: false, error: "Missing 'phoneNumber' or 'otp' field" });
        }

        // Lấy dữ liệu OTP đã lưu trong bộ nhớ
        const storedOtpData = otpStore.get(phoneNumber);

        if (!storedOtpData) {
            return res.status(400).json({ success: false, error: "OTP expired or not found" });
        }

        // Kiểm tra OTP có đúng hay không
        if (storedOtpData.otp !== parseInt(otp, 10)) {
            return res.status(400).json({ success: false, error: "Invalid OTP" });
        }

        // Kiểm tra nếu OTP đã hết hạn
        if (Date.now() > storedOtpData.expiresAt) {
            otpStore.delete(phoneNumber); // Xóa OTP đã hết hạn
            return res.status(400).json({ success: false, error: "OTP expired" });
        }

        // Xóa OTP khỏi bộ nhớ sau khi xác thực thành công
        otpStore.delete(phoneNumber);

        // Trả về kết quả xác thực OTP thành công
        return res.status(200).json({
            success: true,
            message: "OTP verified successfully!",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};


dotenv.config();

// Đổi mật khẩu
const changePassword = async (req, res) => {
    try {
      const { newPassword } = req.body;

      const authHeader = req.headers['authorization'];

        // Kiểm tra xem có token trong header không
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: "Unauthorized: No token provided" });
        }

        // Giải mã token
        const token = authHeader.split(' ')[1];
        let decoded;

        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET); // Kiểm tra tính hợp lệ của token
        } catch (err) {
            return res.status(401).json({ success: false, error: "Invalid or expired token" });
        }
    const phoneNumber = decoded.sdt; // Số điện thoại lưu trong token
    const passwordRegex = /^.{8,}$/;  // Mật khẩu phải có ít nhất 8 ký tự
    if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({ message: "Password must be at least 8 characters long." });        
    }
      // Truy vấn cơ sở dữ liệu với số điện thoại đã được chỉnh sửa
      const [rows] = await connection.query(
        'SELECT idKhachHang FROM khachhang WHERE sdt = ?',
        [phoneNumber]
      );
  
    if (rows.length === 0) {
    return res.status(404).json({ message: 'User not found!' });
    }
  
    const id = rows[0]?.idKhachHang;

    if (!id) {
        return res.status(400).json({ success: false, error: "Invalid customer ID" });
    }

    if (!newPassword) {
    return res.status(400).json({ success: false, error: "Missing 'newPassword' field" });
    }
  
      const saltRounds = 10;
              const hashedmatkhau = await bcrypt.hash(newPassword, saltRounds);
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
          if (!token) {
              return res.status(400).json({ success: false, message: 'Token missing' });
          }
      
          try {
              const decoded = jwt.verify(token, process.env.JWT_SECRET);  // Giải mã token để lấy thông tin người dùng
              // Thêm token vào blacklist
              jwtBlacklist.add(token);  // Đưa token vào blacklist để không sử dụng lại
      
              res.clearCookie('token');  // Nếu bạn dùng cookie để lưu token
              return res.status(200).json({
                success: true,
                message: "Password changed successfully!",
              });
          } catch (error) {
            return res.status(500).json({
                success: false,
                error: error.message,
          });
        }    
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  };  
  


const getAllproduct = async (req, res) => {
    try {
        // Truy vấn tất cả sản phẩm với các trường cần thiết, bao gồm trường 'hinhanh'
        const [rows, fields] = await connection.execute('SELECT * FROM sanpham');

        // Kiểm tra nếu không có sản phẩm nào
        if (rows.length === 0) {
            return res.status(404).json({
                message: 'Không có sản phẩm nào!',
            });
        }

        // Xử lý dữ liệu để tạo đường link cho ảnh
        const productsWithImages = rows.map(row => ({
            idSanPham: row.idSanPham,
            idChiTietLoaiSanPham: row.idChiTietLoaiSanPham,
            tensp: row.tensp,
            mausac: row.mausac,
            xuatxu: row.xuatxu,
            diemtb: row.diemtb,
            gia: row.gia,
            tonkho: row.tonkho,
            mota: row.mota,
            hinhanh: row.hinhanh 
        }));

        // Trả về dữ liệu sản phẩm và đường link hình ảnh
        return res.json({
            data: productsWithImages,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            message: 'Lỗi khi lấy dữ liệu sản phẩm',
            error: err,
        });
    }
};




const producttype = async (req, res) => {
    try {
        
        const [rows, fields] = await connection.execute('SELECT * FROM loaisanpham');
        console.log(res);
        return res.json({
            data: rows,
        });
    } catch (err) {
        return res.json({
            message: 'Error fetching users',
            error: err,
        });
    }
};


import cloudinary from 'cloudinary';
import c from 'config';

// Sử dụng CLOUDINARY_URL từ biến môi trường
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const addProduct = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "Cần ít nhất một ảnh!" });
        }

        const { idChiTietLoaiSanPham, tensp, xuatxu, diemtb, gia, tonkho, mota } = req.body;

        // Upload ảnh gốc (lấy ảnh đầu tiên)
        const mainImageUpload = await cloudinary.uploader.upload(req.files[0].path);
        const mainImageUrl = mainImageUpload.secure_url;

        // Lưu sản phẩm vào bảng `sanpham`
        const [productResult] = await connection.execute(
            `INSERT INTO sanpham (idChiTietLoaiSanPham, tensp, xuatxu, hinhanh, diemtb, gia, tonkho, mota) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [idChiTietLoaiSanPham, tensp, xuatxu, mainImageUrl, diemtb, gia, tonkho, mota]
        );

        const productId = productResult.insertId;

        let colorImagesData = []; // Lưu danh sách ảnh màu sắc

        // Nhận danh sách các màu sắc từ form-data
        const colors = req.body.colors; // Đây là mảng các giá trị màu sắc

        // Duyệt qua các ảnh còn lại và lưu vào bảng sanpham_mau_hinhanh
        const otherImages = req.files.slice(1); // Bỏ qua ảnh đầu tiên (ảnh gốc)

        // Kiểm tra xem số lượng ảnh có ít hơn số lượng màu sắc không
        if (colors && colors.length > otherImages.length) {
            return res.status(400).json({ message: "Số lượng ảnh không đủ cho các màu sắc. Vui lòng tải thêm ảnh." });
        }

        if (colors && colors.length > 0) {
            // Nếu số lượng ảnh ít hơn số lượng màu, thì gán null cho những màu không có ảnh
            for (let i = 0; i < colors.length; i++) {
                const tenmau = colors[i]; // Tên màu
                let img = null;

                // Nếu có ảnh cho màu này
                if (i < otherImages.length) {
                    img = otherImages[i]; // Lấy ảnh theo index
                } else {
                    img = { originalname: `no-color-image.jpg`, path: otherImages[0].path }; // Nếu thiếu ảnh, dùng ảnh đầu tiên làm ảnh "null"
                }

                // Lưu ảnh vào Cloudinary
                const uploadResult = await cloudinary.uploader.upload(img.path);
                const imageUrl = uploadResult.secure_url;

                // Lưu vào bảng `sanpham_mau_hinhanh`
                await connection.execute(
                    `INSERT INTO sanpham_mau_hinhanh (idSanPham, tenmau, hinhanh) VALUES (?, ?, ?)`,
                    [productId, tenmau || null, imageUrl]
                );

                colorImagesData.push({ tenmau: tenmau || null, hinhanh: imageUrl });
            }
        } else {
            // Nếu không có màu sắc, duyệt tất cả các ảnh còn lại và gán tenmau là null
            for (const img of otherImages) {
                const uploadResult = await cloudinary.uploader.upload(img.path);
                const imageUrl = uploadResult.secure_url;

                await connection.execute(
                    `INSERT INTO sanpham_mau_hinhanh (idSanPham, tenmau, hinhanh) VALUES (?, ?, ?)`,

                    [productId, null, imageUrl]
                );

                colorImagesData.push({ tenmau: null, hinhanh: imageUrl });
            }
        }

        return res.status(201).json({
            message: "Sản phẩm đã được thêm thành công!",
            product: {
                idSanPham: productId,
                tensp,
                xuatxu,
                hinhanh: mainImageUrl, // Hình ảnh gốc sản phẩm
                diemtb,
                gia,
                tonkho,
                mota,
                colors: colorImagesData, // Danh sách màu & ảnh màu
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi server" });
    }
};


const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            idChiTietLoaiSanPham,
            tensp,
            mausac,
            xuatxu,
            diemtb,
            gia,
            tonkho,
            mota
        } = req.body;

        if (!tensp || !gia || !tonkho) {
            return res.status(400).json({
                message: 'Tên sản phẩm, giá và số lượng tồn kho là bắt buộc!',
            });
        }

        // Lấy thông tin ảnh cũ từ DB
        const [oldProduct] = await connection.execute(
            `SELECT hinhanh FROM sanpham WHERE idSanPham = ?`,
            [id]
        );

        if (oldProduct.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm!' });
        }

        let oldImage = oldProduct[0].hinhanh;
        let newImage = req.file ? `/uploads/${req.file.filename}` : oldImage;

        // Nếu có ảnh mới -> Xóa ảnh cũ
        if (req.file && oldImage) {
            const imagePath = path.join(__dirname, "..", oldImage);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath); // Xóa file ảnh cũ
            }
        }

        // Cập nhật sản phẩm
        const [result] = await connection.execute(
            `
            UPDATE sanpham
            SET idChiTietLoaiSanPham = ?, tensp = ?, mausac = ?, xuatxu = ?, 
                diemtb = ?, gia = ?, tonkho = ?, mota = ?, hinhanh = ?
            WHERE idSanPham = ?
            `,
            [
                idChiTietLoaiSanPham,
                tensp,
                mausac,
                xuatxu,
                diemtb,
                gia,
                tonkho,
                mota,
                newImage,
                id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm!' });
        }

        return res.json({
            message: 'Sản phẩm đã được cập nhật thành công!',
            data: {
                idSanPham: id,
                idChiTietLoaiSanPham,
                tensp,
                mausac,
                xuatxu,
                diemtb,
                gia,
                tonkho,
                mota,
                hinhanh: newImage
            },
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            message: 'Lỗi khi cập nhật sản phẩm!',
            error: err,
        });
    }
};


const producttypedetails = async (req, res) => {
    try {
        
        const [rows, fields] = await connection.execute('SELECT * FROM chitietloaisanpham');
        console.log(res);
        return res.json({
            data: rows,
        });
    } catch (err) {
        return res.json({
            message: 'Error fetching users',
            error: err,
        });
    }
};






const getProductsByDetailType = async (req, res) => {
    try {
        const { id } = req.params;

        // Truy vấn lấy thông tin chi tiết loại sản phẩm và sản phẩm liên kết
        const [result] = await connection.execute(
            `
            SELECT 
                c.idChiTietLoaiSanPham, 
                c.tenchitiet, 
                p.idSanPham, 
                p.tensp, 
                p.mausac, 
                p.xuatxu, 
                p.hinhanh, 
                p.diemtb, 
                p.gia, 
                p.tonkho, 
                p.mota
            FROM 
                chitietloaisanpham c
            LEFT JOIN 
                sanpham p 
            ON 
                c.idChiTietLoaiSanPham = p.idChiTietLoaiSanPham
            WHERE 
                c.idChiTietLoaiSanPham = ?
            `,
            [id]
        );

        // Nhóm sản phẩm theo chi tiết loại sản phẩm
        const groupedData = {
            detailName: result[0]?.tenchitiet || null, // Lấy tên chi tiết nếu có
            products: result.map(product => ({
                idSanPham: product.idSanPham,
                tensp: product.tensp,
                mausac: product.mausac,
                xuatxu: product.xuatxu,
                hinhanh: product.hinhanh,
                diemtb: product.diemtb,
                gia: product.gia,
                tonkho: product.tonkho,
                mota: product.mota,
            })).filter(product => product.idSanPham !== null), // Loại bỏ sản phẩm null
        };

        // Trả về dữ liệu đã nhóm
        return res.json({
            data: groupedData,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            message: 'Error fetching products by detail type',
            error: err,
        });
    }
};


const allgetProductsByDetailType = async (req, res) => {
    try {
        // Truy vấn lấy tất cả chi tiết loại sản phẩm
        const [details] = await connection.execute('SELECT * FROM chitietloaisanpham');
        
        // Tạo mảng chứa kết quả sản phẩm theo chi tiết loại sản phẩm
        const productsByDetails = [];

        // Lặp qua từng chi tiết loại sản phẩm và lấy sản phẩm tương ứng
        for (const detail of details) {
            // Lấy sản phẩm thuộc chi tiết loại sản phẩm
            const [products] = await connection.execute(
                'SELECT * FROM sanpham WHERE idChiTietLoaiSanPham = ?',
                [detail.idChiTietLoaiSanPham]
            );
            // Thêm vào mảng kết quả
            productsByDetails.push({
                detailName: detail.tenchitiet,
                products: products.map(product => ({
                    ...product,
                    hinhanh: product.hinhanh, // Tạo đường link ảnh nếu có
                }))
            });
        }
        // Trả về dữ liệu sản phẩm theo chi tiết loại sản phẩm
        return res.json({
            data: productsByDetails,
        });
    } catch (err) {
        console.error(err);
        return res.json({
            message: 'Error fetching products by details',
            error: err,
        });
    }
};

const getProductById = async (req, res) => {
    try {
        const { id } = req.params; // Lấy idSanPham từ URL

        // Truy vấn lấy thông tin sản phẩm từ bảng sanpham
        const [product] = await connection.execute(
            `SELECT * FROM sanpham WHERE idSanPham = ?`,
            [id]
        );

        // Kiểm tra nếu không tìm thấy sản phẩm
        if (product.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const [colorsAndImages] = await connection.execute(
            `SELECT id AS idmau, tenmau, hinhanh FROM sanpham_mau_hinhanh WHERE idSanPham = ?`,
            [id]
        );
        
        // Đếm số lượng màu sắc có trong danh sách
        const totalColors = colorsAndImages.length;
        
        // Thêm danh sách màu sắc, hình ảnh và tổng số màu vào sản phẩm
        const productWithDetails = {
            totalColors: totalColors, // Số lượng màu của sản phẩm
            ...product[0],
            colors: colorsAndImages, // Danh sách màu sắc và hình ảnh (đã đổi `id` thành `idmau`)
        };
        
        // Trả về thông tin sản phẩm
        return res.json({
            data: productWithDetails
        });        
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            message: 'Error fetching product',
            error: err
        });
    }
};






const addProductType = async (req, res) => {
    try {
        const { tenloai } = req.body; // Lấy tên loại sản phẩm từ body của yêu cầu HTTP

        // Kiểm tra xem tên loại sản phẩm có hợp lệ không
        if (!tenloai) {
            return res.status(400).json({ message: 'Tên loại sản phẩm là bắt buộc' });
        }

        // Thực hiện truy vấn để thêm loại sản phẩm mới vào cơ sở dữ liệu
        const [result] = await connection.execute(
            `
            INSERT INTO loaisanpham (tenloai)
            VALUES (?)
            `,
            [tenloai]
        );

        // Trả về thông báo thành công cùng với id tự tạo
        return res.status(201).json({
            message: 'Loại sản phẩm đã được thêm thành công',
            data: {
                idSanPham: result.insertId, // insertId là id tự tạo từ cơ sở dữ liệu
                tenloai,
            },
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            message: 'Lỗi khi thêm loại sản phẩm',
            error: err,
        });
    }
};


const addProductTypeDetail = async (req, res) => {
    try {
        const { tenchitiet, idLoaiSanPham } = req.body; // Lấy dữ liệu từ body của yêu cầu HTTP

        // Kiểm tra xem các trường có hợp lệ không
        if (!tenchitiet || !idLoaiSanPham) {
            return res.status(400).json({ message: 'Tên chi tiết và id loại sản phẩm là bắt buộc' });
        }

        // Thực hiện truy vấn để thêm chi tiết loại sản phẩm mới vào cơ sở dữ liệu
        const [result] = await connection.execute(
            `
            INSERT INTO chitietloaisanpham (tenchitiet, idLoaiSanPham)
            VALUES (?, ?)
            `,
            [tenchitiet, idLoaiSanPham]
        );

        // Trả về thông báo thành công cùng với id tự tạo của chi tiết loại sản phẩm
        return res.status(201).json({
            message: 'Chi tiết loại sản phẩm đã được thêm thành công',
            data: {
                idChiTietLoaiSanPham: result.insertId, // id tự tạo từ cơ sở dữ liệu
                tenchitiet,
                idLoaiSanPham,
            },
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            message: 'Lỗi khi thêm chi tiết loại sản phẩm',
            error: err,
        });
    }
};



const updateProductType = async (req, res) => {
    try {
        const { id } = req.params; // Lấy idSanPham từ URL
        const { tenloai } = req.body; // Chỉ lấy tenloai từ body

        // Kiểm tra nếu không có tên loại sản phẩm
        if (!tenloai) {
            return res.status(400).json({ message: 'Tên loại sản phẩm là bắt buộc' });
        }

        // Thực hiện cập nhật loại sản phẩm
        const [result] = await connection.execute(
            `
            UPDATE loaisanpham
            SET tenloai = ?
            WHERE idLoaiSanPham = ?
            `,
            [tenloai, id]
        );

        // Kiểm tra nếu không có dòng nào bị ảnh hưởng (tức là không tìm thấy id)
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy loại sản phẩm' });
        }

        // Trả về thông tin đã cập nhật
        return res.json({
            message: 'Loại sản phẩm đã được cập nhật thành công',
            data: {
                idSanPham: id,
                tenloai,
            },
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            message: 'Lỗi khi cập nhật loại sản phẩm',
            error: err,
        });
    }
};



const updateProductTypeDetail = async (req, res) => {
    try {
        const { id } = req.params; // Lấy idChiTietLoaiSanPham từ URL
        const { tenchitiet, idLoaiSanPham } = req.body; // Lấy dữ liệu từ body

        // Kiểm tra nếu thiếu dữ liệu
        if (!idLoaiSanPham) {
            return res.status(400).json({ message: 'Tên chi tiết và id loại sản phẩm là bắt buộc' });
        }

        // Thực hiện cập nhật chi tiết loại sản phẩm
        const [result] = await connection.execute(
            `UPDATE chitietloaisanpham SET tenchitiet = ?, idLoaiSanPham = ? WHERE idChiTietLoaiSanPham = ?`,
            [tenchitiet, idLoaiSanPham, id]
        );

        // Kiểm tra nếu không tìm thấy idChiTietLoaiSanPham
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy chi tiết loại sản phẩm' });
        }

        // Trả về thông tin đã cập nhật
        return res.json({
            message: 'Chi tiết loại sản phẩm đã được cập nhật thành công',
            data: {
                idChiTietLoaiSanPham: id,
                tenchitiet,
                idLoaiSanPham,
            },
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            message: 'Lỗi khi cập nhật chi tiết loại sản phẩm',
            error: err,
        });
    }
};


const synonymsFilePath = path.join(__dirname, '../config/synonyms.json');

// Hàm tìm kiếm sản phẩm
const search = async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || query.trim() === "") {
      return res.status(400).json({ message: "Vui lòng nhập từ khóa tìm kiếm" });
    }

    // Tách từng từ trong query
    const queryTerms = query.trim().toLowerCase().split(' ');
    console.log("Original query terms:", queryTerms);

    // Đọc file synonyms.json
    let synonymsData = {};
    try {
      const data = await fs.readFile(synonymsFilePath, 'utf8');
      synonymsData = JSON.parse(data);
    } catch (err) {
      console.error("Error reading synonyms file:", err);
    }

    // Ánh xạ từ đồng nghĩa cho từng từ
    const searchTerms = queryTerms.map(term => {
      return synonymsData[term] || term; // Nếu có từ đồng nghĩa thì dùng, không thì giữ nguyên
    });
    console.log("Search terms after synonym:", searchTerms);

    // Query SQL với collation accent-sensitive
    const sqlQuery = `
      SELECT 
        sp.idSanPham,
        sp.tensp,
        sp.mausac,
        sp.xuatxu,
        sp.gia,
        sp.tonkho,
        sp.mota,
        ctlsp.tenchitiet,
        lsp.tenloai,
        (CASE
            WHEN sp.tensp LIKE ? COLLATE utf8mb4_bin THEN 3
            WHEN sp.mota LIKE ? COLLATE utf8mb4_bin THEN 2
            ELSE 1
        END) AS relevance_score
      FROM sanpham sp
      JOIN chitietloaisanpham ctlsp ON sp.idChiTietLoaiSanPham = ctlsp.idChiTietLoaiSanPham
      JOIN loaisanpham lsp ON ctlsp.idLoaiSanPham = lsp.idLoaiSanPham
      WHERE 
        sp.tensp LIKE ? COLLATE utf8mb4_bin
        OR sp.mota LIKE ? COLLATE utf8mb4_bin
        OR ctlsp.tenchitiet LIKE ? COLLATE utf8mb4_bin
        OR lsp.tenloai LIKE ? COLLATE utf8mb4_bin
      ORDER BY relevance_score DESC;
    `;

    // Tìm kiếm từng từ và tổng hợp kết quả
    let allResults = [];
    for (const term of searchTerms) {
      const likeTerm = `%${term}%`;
      const [results] = await connection.execute(sqlQuery, [
        likeTerm,
        likeTerm,
        likeTerm,
        likeTerm,
        likeTerm,
        likeTerm,
      ]);
      allResults = allResults.concat(results); // Gộp kết quả
    }

    // Loại bỏ kết quả trùng lặp (dựa trên idSanPham)
    const uniqueResults = Array.from(
      new Map(allResults.map(item => [item.idSanPham, item])).values()
    );

    if (uniqueResults.length === 0) {
      return res.status(200).json({ message: "Không tìm thấy sản phẩm nào", results: [] });
    }
    return res.status(200).json({ results: uniqueResults });
  } catch (error) {
    console.error("Error during search:", error);
    return res.status(500).json({ message: "Đã có lỗi xảy ra trong quá trình tìm kiếm" });
  }
};

// Xuất khẩu hàm getAllUsers
export default {
    getAllproduct,producttype,producttypedetails,getProductsByDetailType,allgetProductsByDetailType
    ,getProductById,sendSms,verifyOtp,changePassword, addProduct,addProductType
    ,addProductTypeDetail,updateProductType,updateProductTypeDetail,updateProduct,search
};
