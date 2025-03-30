import connection from '../config/database.js';

export const fetchOrdersByStatus = async (req, res) => {
    try {
        const { fromDate, toDate } = req.body;

        if (!fromDate || !toDate) {
            return res.status(400).json({ success: false, message: 'Thiếu fromDate hoặc toDate' });
        }

        // Truy vấn dữ liệu đơn hàng theo khoảng thời gian
        const [orders] = await connection.execute(
            `SELECT idDonhang, idKhachHang, tenkh, sdtkh, ngaytao, tongtien, ghichu, trangthai 
             FROM donhang 
             WHERE ngaytao BETWEEN ? AND ? 
             AND trangthai IN (0, 1, 2, 3, 4)`,
            [fromDate, toDate]
        );

        // Tạo danh sách trạng thái đơn hàng với count, tổng tiền và danh sách đơn hàng
        const orderStatusMap = {
            DaHuy: { count: 0, totalAmount: 0, orders: [] },         // 0 - Đã hủy
            ChoXacNhan: { count: 0, totalAmount: 0, orders: [] },    // 1 - Chờ xác nhận
            DaXacNhan: { count: 0, totalAmount: 0, orders: [] },     // 2 - Đã xác nhận
            DangVanChuyen: { count: 0, totalAmount: 0, orders: [] }, // 3 - Đang vận chuyển
            DangGiaoHang: { count: 0, totalAmount: 0, orders: [] }   // 4 - Đang giao hàng
        };

        // Phân loại đơn hàng theo trạng thái và tính tổng tiền
        orders.forEach(order => {
            switch (order.trangthai) {
                case 0:
                    orderStatusMap.DaHuy.count++;
                    orderStatusMap.DaHuy.totalAmount += order.tongtien;
                    orderStatusMap.DaHuy.orders.push(order);
                    break;
                case 1:
                    orderStatusMap.ChoXacNhan.count++;
                    orderStatusMap.ChoXacNhan.totalAmount += order.tongtien;
                    orderStatusMap.ChoXacNhan.orders.push(order);
                    break;
                case 2:
                    orderStatusMap.DaXacNhan.count++;
                    orderStatusMap.DaXacNhan.totalAmount += order.tongtien;
                    orderStatusMap.DaXacNhan.orders.push(order);
                    break;
                case 3:
                    orderStatusMap.DangVanChuyen.count++;
                    orderStatusMap.DangVanChuyen.totalAmount += order.tongtien;
                    orderStatusMap.DangVanChuyen.orders.push(order);
                    break;
                case 4:
                    orderStatusMap.DangGiaoHang.count++;
                    orderStatusMap.DangGiaoHang.totalAmount += order.tongtien;
                    orderStatusMap.DangGiaoHang.orders.push(order);
                    break;
            }
        });

        res.json({ success: true, data: orderStatusMap });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách đơn hàng theo trạng thái:', error);
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