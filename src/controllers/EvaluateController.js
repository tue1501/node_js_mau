
import connection from '../config/database.js';  // Đảm bảo bạn có kết nối với cơ sở dữ liệu


const getEvaluate = async (req, res) => {
    try {
        const { idSanPham } = req.params;

        // Kiểm tra xem idSanPham có hợp lệ không
        if (!idSanPham) {
            return res.status(400).json({ message: "Thiếu ID sản phẩm" });
        }

        // Truy vấn lấy đánh giá, kết hợp bảng khách hàng và quản trị viên
        const [rows] = await connection.execute(
            `SELECT 
                d.id, 
                d.idSanPham, 
                d.noidung, 
                d.traloi, 
                d.diem, 
                d.ngaydanhgia, 
                d.ngaytraloi, 
                k.hoten AS hoten, 
                q.hoten AS hotenqtv
            FROM danhgia d
            JOIN khachhang k ON d.idKhachHang = k.idKhachHang
            LEFT JOIN qtv q ON d.idQtv = q.idQtv
            WHERE d.idSanPham = ?`,
            [idSanPham]
        );

        // Nếu không có đánh giá nào
        if (rows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy đánh giá nào cho sản phẩm này" });
        }

        // Trả về kết quả
        res.status(200).json(rows);
    } catch (error) {
        console.error("Lỗi khi lấy đánh giá:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
};


export default {
    getEvaluate
};