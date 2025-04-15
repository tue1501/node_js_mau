import { sendEmail } from '../middleware/emailService.js';
import jwt from 'jsonwebtoken';
import twilio from 'twilio';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import axios from 'axios';
import { fileURLToPath } from "url";
import connection from '../config/database.js';
import path from "path";
import fs from 'fs/promises'; // Import fs.promises để dùng với async/await
import { jwtBlacklist } from '../middleware/jwtBlacklist.js';  // Import blacklist từ jwtBlacklist.js
import cloudinary from 'cloudinary';
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = new twilio(accountSid, authToken);
const otpStore = new Map(); 
const sendOtp = async (req, res) => {
    try {
        const { sdt, gmail } = req.body; // Lấy sdt hoặc gmail từ request
        
        // Kiểm tra xem có ít nhất một trường được cung cấp
        if (!sdt && !gmail) {
            return res.status(400).json({ success: false, error: "Missing 'sdt' or 'gmail' field" });
        }
        
        // Truy vấn dữ liệu khách hàng từ cơ sở dữ liệu
        let queryField = sdt ? 'sdt' : 'gmail';
      let queryValue = sdt || gmail;
      const [rows] = await connection.query(
        `SELECT * FROM khachhang WHERE ${queryField} = ?`,
        [queryValue]
      );
  
      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `${sdt ? 'Số điện thoại' : 'Email'} không tồn tại`,
        });
      }
  
      // Tạo mã OTP ngẫu nhiên 6 chữ số
      const otp = Math.floor(100000 + Math.random() * 900000);
      otpStore.set(queryValue, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });
  
      // Tạo token JWT
      const token = jwt.sign(
        { [queryField]: queryValue }, // Lưu sdt hoặc gmail vào token
        process.env.JWT_SECRET,
        { expiresIn: '10m' }
      );
  
      // Gửi OTP qua SMS nếu có sdt
      if (sdt) {
        //  // Định dạng số điện thoại với mã quốc gia +1 nếu cần
        // const to = sdt.startsWith('+1') ? sdt : '+1' + sdt;  
        // // Nội dung tin nhắn OTP
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
        }
        // Gửi OTP qua Gmail nếu có gmail
        if (gmail) {
            // Lấy tệp HTML từ URL
            const response = await axios.get('https://congthuc007.github.io/picturelinhtinh/');
            let htmlContent = response.data;

            // Thay thế {{otp_code}} trong tệp HTML bằng mã OTP
            const personalizedHtml = htmlContent.replace('{{otp_code}}', otp);

            // Tiêu đề email
            const subject = 'Mã OTP xác thực của bạn';

            // Gửi email
            const result = await sendEmail({
                to: gmail,
                html: personalizedHtml,  // Gửi email với nội dung HTML đã được thay thế OTP
            });

            return res.status(200).json({
                success: true,
                message: 'OTP sent successfully via email!',
                info: result,
                token,
            });
        }
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
      const { sdt, gmail } = req.user; // Lấy sdt hoặc gmail từ token
      const identifier = sdt || gmail; // Xác định khóa (sdt hoặc gmail)
  
      if (!identifier || !otp) {
        return res.status(400).json({ success: false, error: "Missing identifier or 'otp' field" });
      }
  
      const storedOtpData = otpStore.get(identifier);
  
      if (!storedOtpData) {
        return res.status(400).json({ success: false, error: "OTP expired or not found" });
      }
  
      if (storedOtpData.otp !== parseInt(otp, 10)) {
        return res.status(400).json({ success: false, error: "Invalid OTP" });
      }
  
      if (Date.now() > storedOtpData.expiresAt) {
        otpStore.delete(identifier);
        return res.status(400).json({ success: false, error: "OTP expired" });
      }
  
      otpStore.delete(identifier);
  
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
  
  // Đổi mật khẩu
  const changePassword = async (req, res) => {
    try {
      const { newPassword } = req.body;
      const authHeader = req.headers['authorization'];
  
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: "Unauthorized: No token provided" });
      }
  
      const token = authHeader.split(' ')[1];
      let decoded;
  
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ success: false, error: "Invalid or expired token" });
      }
  
      const { sdt, gmail } = decoded; // Lấy sdt hoặc gmail từ token
      const identifier = sdt || gmail;
      const queryField = sdt ? 'sdt' : 'gmail';
  
      const passwordRegex = /^.{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({ message: "Password must be at least 8 characters long." });
      }
  
      const [rows] = await connection.query(
        `SELECT idKhachHang FROM khachhang WHERE ${queryField} = ?`,
        [identifier]
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
  
      const query = `
        UPDATE khachhang 
        SET matkhau = COALESCE(?, matkhau)
        WHERE idKhachHang = ?
      `;
      const [result] = await connection.execute(query, [hashedmatkhau || null, id]);
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Customer not found' });
      }
  
      jwtBlacklist.add(token);
      res.clearCookie('token');
  
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



const addProduct = async (req, res) => {
    try {
        // Kiểm tra có file ảnh hay không
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "Cần ít nhất một ảnh!" });
        }

        const { idChiTietLoaiSanPham, tensp, xuatxu, diemtb, gia, mota } = req.body;
        const { sl } = req.body;

        // Khai báo productId trước để tránh lỗi ReferenceError
        let productId;

        // Upload ảnh chính (ảnh đầu tiên)
        const mainImageUpload = await cloudinary.uploader.upload(req.files[0].path);
        const mainImageUrl = mainImageUpload.secure_url;

        let colorImagesData = [];
        let colors = [];
        let stocks = [];

        // Kiểm tra JSON hợp lệ
        try {
            colors = req.body.colors ? JSON.parse(req.body.colors) : [];
            stocks = req.body.tonkho ? JSON.parse(req.body.tonkho) : [];
        } catch (error) {
            return res.status(400).json({ message: "Dữ liệu màu sắc hoặc tồn kho không hợp lệ!" });
        }

        // Lấy danh sách ảnh khác ngoài ảnh chính
        const otherImages = req.files.slice(1);
        if (otherImages.length !== colors.length) {
            return res.status(400).json({ message: "Số lượng ảnh không khớp với số lượng màu sắc!" });
        }
        // Kiểm tra số lượng màu sắc và tồn kho có khớp nhau không
        if (colors.length !== stocks.length) {
            return res.status(400).json({ message: "Số lượng màu sắc phải khớp với số lượng tồn kho!" });
        }

        // Kiểm tra tồn kho có phải số hợp lệ không
        for (let i = 0; i < stocks.length; i++) {
            if (isNaN(stocks[i])) {
                return res.status(400).json({ message: `Tồn kho của màu ${colors[i]} phải là một số hợp lệ!` });
            }
        }
        // Nếu không có màu sắc
        if (colors.length === 0) {
            const [productResult] = await connection.execute(
                `INSERT INTO sanpham (idChiTietLoaiSanPham, tensp, xuatxu, hinhanh, gia, mota) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [idChiTietLoaiSanPham, tensp, xuatxu, mainImageUrl, gia, mota]
            );

            // Kiểm tra insertId
            if (!productResult.insertId) {
                return res.status(500).json({ message: "Lỗi khi tạo sản phẩm, không có ID trả về!" });
            }

            productId = productResult.insertId; // Gán productId sau khi có giá trị hợp lệ

                // Nếu chỉ có một ảnh, lưu bản ghi với màu NULL, ảnh NULL, và số lượng tồn kho
                await connection.execute(
                    `INSERT INTO sanpham_mau_hinhanh (idSanPham, tenmau, hinhanh, so_luong) VALUES (?, NULL, NULL, ?)`,
                    [productId, sl]
                );
        } else {

            // Lưu sản phẩm vào bảng `sanpham`
            const [productResult] = await connection.execute(
                `INSERT INTO sanpham (idChiTietLoaiSanPham, tensp, xuatxu, hinhanh, gia, mota) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [idChiTietLoaiSanPham, tensp, xuatxu, mainImageUrl, gia, mota]
            );

            // Kiểm tra insertId
            if (!productResult.insertId) {
                return res.status(500).json({ message: "Lỗi khi tạo sản phẩm, không có ID trả về!" });
            }

            productId = productResult.insertId; // Lấy ID của sản phẩm vừa thêm

            // Lưu màu sắc, ảnh và tồn kho cho từng màu
            for (let i = 0; i < colors.length; i++) {
                const color = colors[i];
                const stock = parseInt(stocks[i], 10);
                let img = otherImages[i];

                if (!img) {
                    return res.status(400).json({ message: `Màu ${color} thiếu ảnh!` });
                }

                const uploadResult = await cloudinary.uploader.upload(img.path);
                const imageUrl = uploadResult.secure_url;

                await connection.execute(
                    `INSERT INTO sanpham_mau_hinhanh (idSanPham, tenmau, hinhanh, so_luong) VALUES (?, ?, ?, ?)`,
                    [productId, color, imageUrl, stock || 0]
                );

                colorImagesData.push({ tenmau: color, hinhanh: imageUrl, tonkho: stock });
            }
        }

        // Trả về kết quả thành công
        return res.status(201).json({
            message: "Sản phẩm đã được thêm thành công!",
            product: {
                idSanPham: productId,
                tensp,
                xuatxu,
                hinhanh: mainImageUrl,
                diemtb,
                gia,
                mota,
                colors: colorImagesData
            }
        });

    } catch (error) {
        console.error("Lỗi xảy ra:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};


const updateProduct = async (req, res) => {
    try {
        const { idSanPham } = req.params;
        const { idChiTietLoaiSanPham, tensp, xuatxu, gia, mota } = req.body;

        const [checkLoaiSP] = await connection.execute(
            `SELECT idChiTietLoaiSanPham FROM chitietloaisanpham WHERE idChiTietLoaiSanPham = ?`,
            [idChiTietLoaiSanPham]
        );
        if (checkLoaiSP.length === 0) {
            return res.status(400).json({ message: "Loại sản phẩm không tồn tại!" });
        }
        
        // Kiểm tra dữ liệu đầu vào
        if (!tensp || !gia) {
            return res.status(400).json({ message: "Thiếu thông tin sản phẩm!" });
        }

        const [results] = await connection.execute(
            `UPDATE sanpham SET idChiTietLoaiSanPham = ?, tensp = ?, xuatxu = ?, gia = ?, mota = ? WHERE idSanPham = ?`,
            [idChiTietLoaiSanPham, tensp, xuatxu, gia, mota, idSanPham]
        );

        if (results.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm để cập nhật!" });
        }

        return res.status(200).json({ message: "Cập nhật thông tin sản phẩm thành công!" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Lỗi server khi cập nhật sản phẩm!" });
    }
};

const updateProductImage = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.files) {
            return res.status(400).json({ message: "Không có ảnh nào được tải lên!" });
        }
        const img = req.files[0]; // Lấy ảnh đầu tiên từ mảng files
        const uploadResult = await cloudinary.uploader.upload(img.path);
        const imageUrl = uploadResult.secure_url;

        const [results] = await connection.execute(
            `UPDATE sanpham SET hinhanh = ? WHERE idSanPham = ?`,
            [imageUrl, id]
        );

        if (results.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm để cập nhật ảnh!" });
        }

        return res.status(200).json({
            message: "Cập nhật ảnh sản phẩm thành công!",
            imageUrl,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Lỗi server khi cập nhật ảnh sản phẩm!" });
    }
};

const updateProductcolor = async (req, res) => {
    try {
        const { id } = req.params;
        const { tenmau, so_luong } = req.body;

        // Kiểm tra dữ liệu bắt buộc
        if (!tenmau || !so_luong) {
            return res.status(400).json({ message: "Thiếu thông tin tên màu hoặc số lượng!" });
        }

        let imageUrl = null;

        // Nếu có ảnh thì upload
        if (req.files && req.files.length > 0) {
            const img = req.files[0];
            const uploadResult = await cloudinary.uploader.upload(img.path);
            imageUrl = uploadResult.secure_url;
        }

        // Tạo câu truy vấn động tùy theo có ảnh hay không
        let query = `UPDATE sanpham_mau_hinhanh SET tenmau = ?, so_luong = ?`;
        const queryParams = [tenmau, so_luong];

        if (imageUrl) {
            query += `, hinhanh = ?`;
            queryParams.push(imageUrl);
        }

        query += ` WHERE id = ?`;
        queryParams.push(id);

        const [results] = await connection.execute(query, queryParams);

        if (results.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm màu để cập nhật!" });
        }

        return res.status(200).json({
            message: "Cập nhật màu sản phẩm thành công!",
            tenmau,
            so_luong,
            ...(imageUrl && { imageUrl }),
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Lỗi server khi cập nhật màu sản phẩm!" });
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
            `SELECT id AS idmau, tenmau, hinhanh,so_luong FROM sanpham_mau_hinhanh WHERE idSanPham = ?`,
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
const getProductByColorId = async (req, res) => {
    try {
        const { id } = req.params; // Lấy idmau từ URL

        // Truy vấn lấy thông tin sản phẩm theo idmau
        const [result] = await connection.execute(
            `
            SELECT 
            sp.idSanPham,
            sp.tensp,
            sp.xuatxu,
            sp.gia,
            sp.mota,
            smh.tenmau,
            COALESCE(smh.hinhanh, sp.hinhanh) AS hinhanh, -- Nếu smh.hinhanh null thì lấy sp.hinhanh
            smh.so_luong    
            FROM 
            sanpham_mau_hinhanh smh
            JOIN 
            sanpham sp ON smh.idSanPham = sp.idSanPham
            WHERE 
            smh.id = ?
            `,
            [id]
        );

        // Kiểm tra nếu không tìm thấy sản phẩm
        if (result.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm với idmau này' });
        }

        // Trả về thông tin sản phẩm
        return res.json({
            data: result[0],
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            message: 'Lỗi khi lấy thông tin sản phẩm theo idmau',
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

    // Đọc file synonyms.json
    let synonymsData = {};
    try {
        const data = await fs.readFile(synonymsFilePath, 'utf8');
        synonymsData = JSON.parse(data);
    } catch (err) {
        console.error("Error reading synonyms file:", err);
    }

    // Ánh xạ từ đồng nghĩa cho từng từ
    const searchTerms = queryTerms.flatMap(term => {
        const synonym = synonymsData[term];
        return Array.isArray(synonym) ? synonym : [synonym || term];
    });

    // SQL Query có xử lý relevance và ảnh
    const sqlQuery = `
        SELECT 
            sp.idSanPham,
            sp.tensp,
            sp.xuatxu,
            sp.gia,
            sp.tonkho,
            sp.mota,
            ctlsp.tenchitiet,
            lsp.tenloai,
            COALESCE(mh.hinhanh, sp.hinhanh) AS hinhanh,
            (CASE
                WHEN LOWER(sp.tensp) LIKE LOWER(?) COLLATE utf8mb4_bin THEN 3
                WHEN LOWER(sp.mota) LIKE LOWER(?) COLLATE utf8mb4_bin THEN 2
                ELSE 1
            END) AS relevance_score
        FROM sanpham sp
        JOIN chitietloaisanpham ctlsp ON sp.idChiTietLoaiSanPham = ctlsp.idChiTietLoaiSanPham
        JOIN loaisanpham lsp ON ctlsp.idLoaiSanPham = lsp.idLoaiSanPham
        LEFT JOIN sanpham_mau_hinhanh mh ON sp.idSanPham = mh.idSanPham
        WHERE 
            LOWER(sp.tensp) LIKE LOWER(?) COLLATE utf8mb4_bin
            OR LOWER(sp.mota) LIKE LOWER(?) COLLATE utf8mb4_bin
            OR LOWER(ctlsp.tenchitiet) LIKE LOWER(?) COLLATE utf8mb4_bin
            OR LOWER(lsp.tenloai) LIKE LOWER(?) COLLATE utf8mb4_bin
        ORDER BY relevance_score DESC;
    `;

    let allResults = [];

    for (const term of searchTerms) {
        const likeTerm = `%${term}%`;
        const [results] = await connection.execute(sqlQuery, [
            likeTerm,
            likeTerm,
            likeTerm,
            likeTerm,
            likeTerm,
            likeTerm
    ]);
    allResults = allResults.concat(results);
    }

    // Loại bỏ kết quả trùng lặp theo idSanPham
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
    ,getProductById,sendOtp,verifyOtp,changePassword, addProduct,addProductType
    ,addProductTypeDetail,updateProductType,updateProductTypeDetail,updateProduct,search,updateProductImage,getProductByColorId,updateProductcolor
};
