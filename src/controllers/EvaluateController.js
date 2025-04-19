import connection from '../config/database.js';  // Đảm bảo bạn có kết nối với cơ sở dữ liệu


const getEvaluate = async (req, res) => {
    try {
        const { idSanPham } = req.params;

        // Kiểm tra xem idSanPham có hợp lệ không
        if (!idSanPham) {
            return res.status(400).json({ message: "Thiếu ID sản phẩm" });
        }

        // Truy vấn lấy đánh giá của tất cả màu thuộc sản phẩm
        const [rows] = await connection.execute(
            `SELECT 
                d.id, 
                d.idMau, 
                d.noidung, 
                d.traloi, 
                d.diem, 
                d.ngaydanhgia, 
                d.ngaytraloi, 
                k.hoten AS hoten, 
                q.hoten AS hotenqtv, 
                m.tenMau, 
                s.tenSP AS tensp

            FROM danhgia d
            JOIN khachhang k ON d.idKhachHang = k.idKhachHang
            LEFT JOIN qtv q ON d.idQtv = q.idQtv
            JOIN sanpham_mau_hinhanh m ON d.idMau = m.id
            JOIN sanpham s ON m.idSanPham = s.idSanPham  
            WHERE d.idMau IN (SELECT id FROM sanpham_mau_hinhanh WHERE idSanPham = ?);
            `,
            [idSanPham]
        );        
        // Nếu không có đánh giá nào
        if (rows.length === 0) {
            return res.status(404).json({ message: "Không có đánh giá nào" });
        }

        // Trả về kết quả
        res.status(200).json(rows);
    } catch (error) {
        console.error("Lỗi khi lấy đánh giá:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
};
const addEvaluate = async (req, res) => {
    try {
        const idKhachHang = req.user.id;
        const { idmau, iddonhang } = req.body;
        let { noidung, diem } = req.body;
        // Kiểm tra idMau và idKhachHang (bắt buộc)
        if (!idmau || !idKhachHang || !iddonhang) {
            return res.status(400).json({ message: "Thiếu dữ liệu cần thiết" });
        }

        // Đảm bảo noidung không null, nếu không có thì để chuỗi rỗng
        if (noidung === undefined || noidung === null) {
            noidung = "";
        }

        // Đảm bảo diem không null, nếu không có thì để 0
        if (diem === undefined || diem === null) {
            diem = 0;
        }
        // Kiểm tra xem đơn hàng này đã được đánh giá chưa
        const [orderDetails] = await connection.execute(
            `SELECT idDanhGia FROM chitietdonhang WHERE idDonHang = ? AND idMau = ?`,
            [iddonhang, idmau]
        );
        if (orderDetails.length > 0 && orderDetails[0].idDanhGia !== null) {
            return res.status(400).json({ message: "Bạn đã đánh giá đơn hàng này rồi" });
        }

        // Thêm đánh giá vào cơ sở dữ liệu
        const [result] = await connection.execute(
            `INSERT INTO danhgia (idMau, idKhachHang, noidung, diem, ngaydanhgia) 
            VALUES (?, ?, ?, ?, NOW())`,
            [idmau, idKhachHang, noidung, diem]
        );

        if (result.affectedRows === 1) {
            const newIdDanhGia = result.insertId;
            // Cập nhật idDanhGia trong bảng chitietdonhang
            await connection.execute(
                `UPDATE chitietdonhang SET idDanhGia = ? WHERE idDonHang = ? AND idMau = ?`,
                [newIdDanhGia, iddonhang, idmau]
            );
            return res.status(201).json({ message: "Thêm đánh giá thành công" });
        } else {
            return res.status(500).json({ message: "Lỗi khi thêm đánh giá" });
        }
    } catch (error) {
        console.error("Lỗi khi thêm đánh giá:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

const getEvaluateByIdMau = async (req, res) => {
    try {
        const { idMau } = req.params;

        // Kiểm tra xem idMau có hợp lệ không
        if (!idMau) {
            return res.status(400).json({ message: "Thiếu ID màu" });
        }

        // Truy vấn lấy đánh giá theo idMau
        const [rows] = await connection.execute(
            `SELECT 
                d.id, 
                d.idMau, 
                d.noidung, 
                d.traloi, 
                d.diem, 
                d.ngaydanhgia, 
                d.ngaytraloi, 
                k.hoten AS hoten, 
                q.hoten AS hotenqtv, 
                m.tenMau, 
                s.tenSP AS tensp
            FROM danhgia d
            JOIN khachhang k ON d.idKhachHang = k.idKhachHang
            LEFT JOIN qtv q ON d.idQtv = q.idQtv
            JOIN sanpham_mau_hinhanh m ON d.idMau = m.id
            JOIN sanpham s ON m.idSanPham = s.idSanPham  
            WHERE d.idMau = ?;`,
            [idMau]
        );        

        // Nếu không có đánh giá nào
        if (rows.length === 0) {
            return res.status(404).json({ message: "Không có đánh giá nào cho màu này" });
        }

        // Trả về kết quả
        res.status(200).json(rows);
    } catch (error) {
        console.error("Lỗi khi lấy đánh giá:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

const getallEvaluate = async (req, res) => {
    try {

        // Truy vấn lấy đánh giá của tất cả màu thuộc sản phẩm
        const [rows] = await connection.execute(
            `SELECT 
                d.id, 
                d.idMau, 
                d.noidung, 
                d.traloi, 
                d.diem, 
                d.ngaydanhgia, 
                d.ngaytraloi, 
                k.hoten AS hoten, 
                q.hoten AS hotenqtv, 
                m.tenMau, 
                s.tenSP AS tensp,
                COALESCE(m.hinhanh, s.hinhanh) AS hinhanh
            FROM danhgia d
            JOIN khachhang k ON d.idKhachHang = k.idKhachHang
            LEFT JOIN qtv q ON d.idQtv = q.idQtv
            JOIN sanpham_mau_hinhanh m ON d.idMau = m.id
            JOIN sanpham s ON m.idSanPham = s.idSanPham`
        );             

        // Trả về kết quả
        res.status(200).json(rows);
    } catch (error) {
        console.error("Lỗi khi lấy đánh giá:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
};


export default {
    getEvaluate,addEvaluate,getEvaluateByIdMau,getallEvaluate
};