import connection from '../config/database.js'
import dotenv from 'dotenv';
import sendNotification from '../middleware/notification.js';
dotenv.config();

const repcomment = async (req, res) => {
    try {
        // Lấy id từ URL params
        const { id } = req.params;
        const idQtv = req.admin.id; // Giả sử req.admin được gán từ middleware
        const { traloi } = req.body;

        const ngaytraloi = new Date().toISOString().slice(0, 19).replace('T', ' '); // Định dạng YYYY-MM-DD HH:MM:SS

        // Kiểm tra dữ liệu đầu vào
        if (!id || !idQtv || !traloi) {
            return res.status(400).json({ message: 'Thiếu id, idQtv hoặc nội dung trả lời!' });
        }

        // Thêm phản hồi vào bảng danhgia
        const query = `
            UPDATE danhgia 
            SET idQtv = ?, ngaytraloi = ?, traloi = ? 
            WHERE id = ?
        `;
        const [result] = await connection.execute(query, [idQtv, ngaytraloi, traloi, id]);

        // Kiểm tra xem có bản ghi nào được cập nhật không
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy đánh giá để trả lời!' });
        }

        // Lấy tất cả các trường trong bảng danhgia sau khi cập nhật, bao gồm idKhachHang
        const [rows] = await connection.execute('SELECT * FROM danhgia WHERE id = ?', [id]);
        const danhGia = rows[0];

        // Lấy token từ bảng khachhang dựa trên idKhachHang
        const [tokenRows] = await connection.execute(
            'SELECT token FROM khachhang WHERE idKhachHang = ? AND token IS NOT NULL',
            [danhGia.idKhachHang]
        );

        // Tạo danh sách token từ giá trị trong DB
        let allTokens = [];
        if (tokenRows.length > 0 && tokenRows[0].token) {
            const tokenData = tokenRows[0].token;
            if (typeof tokenData === 'string') {
                try {
                    // Thử parse chuỗi JSON
                    const parsedTokens = JSON.parse(tokenData);
                    if (Array.isArray(parsedTokens)) {
                        allTokens = allTokens.concat(parsedTokens);
                    } else {
                        console.warn(`Token không phải mảng JSON: ${tokenData}`);
                    }
                } catch (err) {
                    console.error(`Lỗi khi parse token: ${tokenData}`, err);
                    // Nếu không phải JSON, tách bằng dấu phẩy
                    const splitTokens = tokenData.split(',').map(t => t.trim());
                    allTokens = allTokens.concat(splitTokens);
                }
            } else if (Array.isArray(tokenData)) {
                // Nếu driver đã parse thành mảng
                allTokens = allTokens.concat(tokenData);
            }
        }

        // Gửi thông báo từng cái một nếu có token
        if (allTokens.length > 0) {
            for (const token of allTokens) {
                await sendNotification({
                    title: 'Trả lời đánh giá',
                    body: `Đánh giá của bạn đã được trả lời: ${traloi}`,
                    token: token
                });
            }
        }

        return res.status(200).json({
            message: 'Phản hồi đã được gửi thành công!',
            data: danhGia // Trả về bản ghi vừa được cập nhật
        });
    } catch (error) {
        console.error('Lỗi khi trả lời đánh giá:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống khi trả lời đánh giá!', error: error.message });
    }
};
export const getSummaryStatistics = async (req, res) => {
    try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Lấy ngày đầu và cuối tháng hiện tại
        const getLocalDateStr = (date) => {
            const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
            return local.toISOString().split('T')[0];
        };
        
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const startStr = getLocalDateStr(startOfMonth);
        const endStr = getLocalDateStr(endOfMonth);

        // 1. Tổng doanh thu tháng hiện tại (trangthai = 4)
        const [revenueRows] = await connection.execute(
            `SELECT SUM(tongtien) AS totalRevenue 
             FROM donhang 
             WHERE ngaygiaohang BETWEEN ? AND ? AND trangthai = 4`,
            [startStr, endStr]
        );
        const monthlyRevenue = revenueRows[0].totalRevenue || 0;

        // 2. Số đơn hàng hôm nay
        const [orderRows] = await connection.execute(
            `SELECT COUNT(*) AS todayOrderCount 
             FROM donhang 
             WHERE DATE(ngaytao) = ?`,
            [todayStr]
        );
        const todayOrderCount = orderRows[0].todayOrderCount;

        // 3. Tổng số khách hàng
        const [customerRows] = await connection.execute(`SELECT COUNT(*) AS totalCustomers FROM khachhang`);
        const totalCustomers = customerRows[0].totalCustomers;

        // 4. Tổng số sản phẩm
        const [productRows] = await connection.execute(`SELECT COUNT(*) AS totalProducts FROM sanpham`);
        const totalProducts = productRows[0].totalProducts;

        res.json({
            success: true,
            data: {
                monthlyRevenue,
                todayOrderCount,
                totalCustomers,
                totalProducts
            }
        });

    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu tổng:', error);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};
export const getAlladmin = async (req, res) => {
    try {
        const [rows] = await connection.query(`
            SELECT 
                qtv.idQtv,
                qtv.hoten,
                qtv.ngaysinh,
                qtv.gioitinh,
                qtv.sdt,
                qtv.cmnd,
                quyen.idQuyen,
                quyen.tenquyen
            FROM qtv
            JOIN quyen ON qtv.idQuyen = quyen.idQuyen
        `);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'No users found!' });
        }
        return res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ message: 'Error fetching users.' });
    }
};
const updateAdmin = async (req, res) => {
    try {
        const { id } = req.params; // ID của admin cần cập nhật
        const { hoten, sdt, ngaysinh, gioitinh, cmnd, idQuyen } = req.body; // Thông tin cần cập nhật

        if (!id) {
            return res.status(400).json({ message: 'Thiếu ID admin!' });
        }

        // Kiểm tra xem admin có đang cố gắng sửa quyền của chính mình không
        
        if (id == req.admin.id && idQuyen !== undefined) {
            return res.status(403).json({ message: 'Bạn không thể sửa quyền của chính mình!' });
        }
        // Cập nhật admin
        const [result] = await connection.execute(
            `UPDATE qtv 
            SET hoten = ?, sdt = ?, ngaysinh = ?, gioitinh = ?, cmnd = ?
            WHERE idQtv = ?`,
            [hoten, sdt, ngaysinh || null, gioitinh || null, cmnd || null, id]
        );
        
        if (idQuyen) {
            const [rows] = await connection.execute(
                'UPDATE qtv SET idQuyen = ? WHERE idQtv = ?',
                [idQuyen, id]
            );
            if (rows.length === 0) {
                return res.status(404).json({ message: 'Quyền không tồn tại!' });
            }
        }
        // Kiểm tra nếu không tìm thấy admin cần cập nhật hoặc không có thay đổi
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy admin hoặc không có thay đổi!' });
        }
        
        // Trả về kết quả cập nhật thành công
        return res.status(200).json({ message: 'Cập nhật admin thành công!' });
        
    } catch (err) {
        // Xử lý lỗi khi cập nhật
        console.error('Lỗi khi cập nhật admin:', err);
        return res.status(500).json({ message: 'Lỗi hệ thống khi cập nhật admin!', error: err.message });
    }
};
const updateShopInfo = async (req, res) => {
    const { sdt, diachi, email, facebook } = req.body;

    try {
        const [result] = await connection.query(
            `UPDATE cuahang 
             SET sdt = ?, diachi = ?, email = ?, facebook = ?
             WHERE id = 1`
        , [sdt, diachi, email, facebook]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy cửa hàng để cập nhật' });
        }

        return res.status(200).json({ message: 'Cập nhật thông tin cửa hàng thành công' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật thông tin' });
    }
}


export default { repcomment,getSummaryStatistics,getAlladmin,updateAdmin,updateShopInfo};