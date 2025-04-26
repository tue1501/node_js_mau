
import connection from '../config/database.js'
const checkSuperAdmin = async (req, res, next) => {
    try {
        const userId = req.admin.idad; // Lấy idQtv từ token đã xác thực

        // Truy vấn để lấy quyền của admin
        const [rows] = await connection.execute(
            `SELECT q.idQuyen 
             FROM qtv AS qtv
             JOIN quyen AS q ON qtv.idQuyen = q.idQuyen
             WHERE qtv.idQtv = ?`,
            [userId]
        );

        // Nếu không có kết quả hoặc quyền không phải superadmin (idQuyen = 2), từ chối truy cập
        if (rows.length === 0 || rows[0].idQuyen !== 2) {
            return res.status(403).json({ message: 'Chỉ superadmin mới có quyền thực hiện hành động này!' });
        }

        next(); // Nếu là superadmin, tiếp tục xử lý request
    } catch (err) {
        console.error('Lỗi kiểm tra quyền:', err);
        return res.status(500).json({ message: 'Lỗi hệ thống khi kiểm tra quyền!' });
    }
};

export default checkSuperAdmin;
