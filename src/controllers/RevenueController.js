import connection from '../config/database.js';

export const fetchOrdersByStatus = async (req, res) => {
    try {
        const { fromDate, toDate } = req.body;

        if (!fromDate || !toDate) {
            return res.status(400).json({ success: false, message: 'Thiếu fromDate hoặc toDate' });
        }

        // Truy vấn tổng tiền (tongtien) trong khoảng thời gian
        const [orders] = await connection.execute(
            `SELECT tt_online, tongtien, trangthai 
             FROM donhang 
             WHERE ngaytao BETWEEN ? AND ? 
             AND trangthai IN (0, 1, 2, 3, 4)`,
            [fromDate, toDate]
        );

        // Tạo danh sách trạng thái đơn hàng với tổng tiền
        const orderStatusMap = {
            DaHuy: { totalAmount: 0 },         // 0 - Đã hủy
            ChoXacNhan: { totalAmount: 0 },    // 1 - Chờ xác nhận
            DaXacNhan: { totalAmount: 0 },     // 2 - Đã xác nhận
            DangVanChuyen: { totalAmount: 0 }, // 3 - Đang vận chuyển
            DangGiaoHang: { totalAmount: 0 }   // 4 - Đang giao hàng
        };

        // Phân loại đơn hàng theo trạng thái và cộng tổng tiền (tongtien) nếu tt_online = 1
        orders.forEach(order => {
            if (order.tt_online === 1) { // Chỉ cộng nếu tt_online = 1
                switch (order.trangthai) {
                    case 0: // Đã hủy
                        orderStatusMap.DaHuy.totalAmount += order.tongtien;
                        break;
                    case 1: // Chờ xác nhận
                        orderStatusMap.ChoXacNhan.totalAmount += order.tongtien;
                        break;
                    case 2: // Đã xác nhận
                        orderStatusMap.DaXacNhan.totalAmount += order.tongtien;
                        break;
                    case 3: // Đang vận chuyển
                        orderStatusMap.DangVanChuyen.totalAmount += order.tongtien;
                        break;
                    case 4: // Đang giao hàng
                        orderStatusMap.DangGiaoHang.totalAmount += order.tongtien;
                        break;
                }
            }
        });

        // Trả về tổng tiền theo trạng thái
        res.json({ success: true, data: orderStatusMap });
    } catch (error) {
        console.error('Lỗi khi lấy tổng tiền theo trạng thái:', error);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};


const filterOrdersByDate = async (req, res) => {
    try {
        const { fromDate, toDate } = req.body;

        // Kiểm tra xem đã có đủ tham số ngày chưa
        if (!fromDate || !toDate) {
            return res.status(400).json({ success: false, message: 'Thiếu fromDate hoặc toDate' });
        }

        // Truy vấn đơn hàng với trường ngày tạo (ngaytao) và ngày giao hàng (ngaygiaohang) trong khoảng thời gian từ fromDate đến toDate
        const [orders] = await connection.execute(
            `SELECT idDonhang, idKhachHang, tenkh, sdtkh, ngaytao, ngaygiaohang, tongtien, ghichu, trangthai
             FROM donhang
             WHERE (ngaytao BETWEEN ? AND ? OR ngaygiaohang BETWEEN ? AND ?)`,
            [fromDate, toDate, fromDate, toDate]
        );

        // Kiểm tra nếu không có đơn hàng nào
        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: 'Không có đơn hàng nào trong khoảng thời gian này' });
        }

        res.json({ success: true, data: orders });
    } catch (error) {
        console.error('Lỗi khi lọc đơn hàng theo ngày:', error);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

const inforshop = async (req, res) => {
    try {
        const [rows] = await connection.query(
            'SELECT * FROM cuahang '
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'không có thông tin cửa hàng' });
        }
        return res.status(200).json({
            data: rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }   
}

export default { fetchOrdersByStatus,filterOrdersByDate,inforshop };