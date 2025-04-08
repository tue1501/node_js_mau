import connection from '../config/database.js'
import sendNotification from '../middleware/notification.js';
const orderbyid = async (req, res) => {
    const id = req.user.id;
    try {
        // Lấy danh sách đơn hàng của khách hàng, bao gồm cả ghi chú
        const [orders] = await connection.execute(
            `SELECT iddonhang, ghichu, trangthai, ngaytao, ngaygiaohang,idGiamGia, tongtien,tt_cod, tt_online FROM donhang WHERE idKhachHang = ?`,
            [id]
        );

        const orderDetails = [];

        for (const order of orders) {
            // Lấy sản phẩm trong đơn hàng, đổi idSanPham thành idMau
            const [products] = await connection.execute(
                `SELECT 
                    p.idSanPham,
                    c.idMau,
                    c.sl,
                    p.tensp,
                    p.gia,
                    p.xuatxu,
                    p.tonkho,
                    p.mota,
                    c.iddanhgia,
                    mh.tenmau,
                    -- Lấy ảnh từ bảng màu, nếu không có thì lấy ảnh từ bảng sản phẩm
                    COALESCE(mh.hinhanh, p.hinhanh) AS hinhanh
                FROM chitietdonhang c
                LEFT JOIN sanpham_mau_hinhanh mh ON c.idMau = mh.id
                LEFT JOIN sanpham p ON mh.idSanPham = p.idSanPham
                LEFT JOIN donhang dh ON c.idDonhang = dh.iddonhang
                WHERE c.idDonhang = ?`,
                [order.iddonhang]
            );

            // Cập nhật đường dẫn hình ảnh đầy đủ
            const updatedProducts = products.map(product => ({
                ...product,
                hinhanh: product.hinhanh 
            }));
            // Thêm vào mảng kết quả
            orderDetails.push({
                iddonhang: order.iddonhang,
                trangthai: order.trangthai,
                tt_cod: order.tt_cod,
                ngaytao: order.ngaytao,
                ngaygiaohang: order.ngaygiaohang,
                tongtien: order.tongtien,
                tt_online: order.tt_online,
                idGiamGia: order.idGiamGia,
                ghichu: order.ghichu, // Lấy ghi chú từ bảng donhang
                products: updatedProducts
            });
        }

        return res.status(200).json({ data: orderDetails });
    } catch (err) {
        console.error(err);
        return res.json({
            message: 'Error fetching products by details',
            error: err,
        });
    }
};


const deleteorder = async (req, res) => {
    const id = req.user.id; // idKhachHang từ token
    const { iddonhang } = req.body; // Lấy idDonHang từ body

    try {
        if (!id) {
            return res.status(400).json({ message: 'Customer ID is required' });
        }

        if (!iddonhang) {
            return res.status(400).json({ message: 'Order ID is required' });
        }

        // Kiểm tra đơn hàng có tồn tại và thuộc về khách hàng không
        const [rows] = await connection.query(
            'SELECT idKhachHang, idGiamGia FROM donhang WHERE idDonHang = ? AND idKhachHang = ?',
            [iddonhang, id]
        );

        if (rows.length !== 1) {
            return res.status(404).json({ message: 'Order not found or does not belong to this customer!' });
        }

        const order = rows[0];
        const idGiamGia = order.idGiamGia;

        // Bắt đầu transaction để đảm bảo tính toàn vẹn
        await connection.beginTransaction();

        // Cập nhật trạng thái đơn hàng thành 4
        const updateOrderQuery = `
            UPDATE donhang 
            SET trangthai = 4
            WHERE idDonHang = ?
        `;
        const [updateOrderResult] = await connection.execute(updateOrderQuery, [iddonhang]);

        if (updateOrderResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Order not found' });
        }

        // Nếu có idGiamGia, cập nhật trạng thái trong chitietgiamgia
        if (idGiamGia) {
            const updateChitietQuery = `
                UPDATE chitietgiamgia 
                SET trangthai = 0
                WHERE idKhachHang = ? AND idGiamGia = ?
            `;
            const [updateChitietResult] = await connection.execute(updateChitietQuery, [id, idGiamGia]);

            if (updateChitietResult.affectedRows > 0) {
                console.log(`Đã cập nhật ${updateChitietResult.affectedRows} bản ghi trong chitietgiamgia`);
            }
        }

        // Commit transaction
        await connection.commit();
        return res.status(200).json({ message: 'Order updated successfully' });
    } catch (error) {
        // Rollback nếu có lỗi
        await connection.rollback();
        console.error('Lỗi khi cập nhật đơn hàng:', error);
        return res.status(500).json({ message: 'Error updating order', error: error.message });
    }
};


const getAllOrders = async (req, res) => {
    try {
        // Truy vấn đơn hàng với trường ngày tạo (ngaytao) và ngày giao hàng (ngaygiaohang) trong khoảng thời gian từ fromDate đến toDate
        const [orders] = await connection.execute(
            `SELECT idDonhang, tenkh, sdtkh, ngaytao, ngaygiaohang, tongtien, ghichu, trangthai
            FROM donhang`,
        );
        
        // Kiểm tra nếu không có đơn hàng nào
        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: 'Không có đơn hàng nào trong khoảng thời gian này' });
        }

        res.json({ success: true, data: orders });
    } catch (error) {
        console.error('Lỗi khi lấy đơn hàng :', error);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

const getOrderById = async (req, res) => {
    const { id } = req.params;
    
    try {
        // Lấy thông tin đơn hàng theo ID
        const [orders] = await connection.execute(
            `SELECT dh.iddonhang, dh.ghichu, kh.hoten
            FROM donhang dh
            JOIN khachhang kh ON dh.idKhachHang = kh.idKhachHang
            WHERE dh.iddonhang = ?`,
            [id]
        );
        
        if (orders.length === 0) {
            return res.status(404).json({ message: 'Order not found!' });
        }
        
        const order = orders[0];        // Lấy sản phẩm trong đơn hàng, đổi idSanPham thành idMau
        const [products] = await connection.execute(
            `SELECT 
            p.idSanPham,
            c.idMau,
            c.sl,
            p.tensp,
            p.gia,
            p.xuatxu,
            p.tonkho,
            p.mota,
            c.*,
            -- Lấy ảnh từ bảng màu, nếu không có thì lấy ảnh từ bảng sản phẩm
            COALESCE(mh.hinhanh, p.hinhanh) AS hinhanh
            FROM chitietdonhang c
            LEFT JOIN sanpham_mau_hinhanh mh ON c.idMau = mh.id
            LEFT JOIN sanpham p ON mh.idSanPham = p.idSanPham
            WHERE c.idDonhang = ?`,
            [order.iddonhang]
        );
        return res.status(200).json({
            iddonhang: order.iddonhang,
            hoten: order.hoten,
            ghichu: order.ghichu,
            products: products
        });
    } catch (err) {
        console.error(err);
        return res.json({
            message: 'Error fetching order by ID',
            error: err,
        });
    }
};
const order = async (req, res) => {
    const { id } = req.params;
    const  idkhachhang  = req.user.id;
    try {
        // Lấy thông tin đơn hàng theo ID
        const [orders] = await connection.execute(
            `SELECT idDonhang, trangthai, tt_cod, tt_online
            FROM donhang 
            WHERE idDonhang = ? AND idKhachHang = ?`,
            [id, idkhachhang]
        );
        return res.status(200).json({
            orders: orders,
        });
    } catch (err) {
        console.error(err);
        return res.json({
            message: 'Error fetching order by ID',
            error: err,
        });
    }
};
const updateorder = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // "increase" hoặc "decrease"

    try {
        if (!id || !status) {
            return res.status(400).json({ message: 'Missing order ID or status' });
        }

        // Kiểm tra xem đơn hàng có tồn tại không
        const [rows] = await connection.query(
            'SELECT trangthai FROM donhang WHERE idDonHang = ?',
            [id]
        );

        if (rows.length !== 1) {
            return res.status(404).json({ message: 'Order not found!' });
        }

        let newTrangThai = rows[0].trangthai;

        // Kiểm tra giới hạn trước khi cập nhật
        if (status === "increase") {
            if (newTrangThai >= 4) {
                return res.status(400).json({ message: 'Order status cannot be greater than 4' });
            }
            newTrangThai += 1;
        } else if (status === "decrease") {
            if (newTrangThai <= 0) {
                return res.status(400).json({ message: 'Order status cannot be less than 0' });
            }
            newTrangThai -= 1;
        } else {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        // Cập nhật trạng thái trong database
        const query = `UPDATE donhang SET trangthai = ? WHERE idDonHang = ?`;
        const [result] = await connection.execute(query, [newTrangThai, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Order not found or update failed' });
        }

        // Lấy tất cả token từ bảng khachhang
        const [tokenRows] = await connection.execute(
            'SELECT token FROM khachhang WHERE token IS NOT NULL'
        );
        console.log('tokenRows:', tokenRows); // Để kiểm tra dữ liệu trả về

        // Tạo danh sách token từ các giá trị trong DB
        let allTokens = [];
        tokenRows.forEach(row => {
            if (row.token) {
                let tokens = [];
                if (typeof row.token === 'string') {
                    try {
                        // Thử parse chuỗi JSON
                        tokens = JSON.parse(row.token);
                    } catch (err) {
                        console.error(`Lỗi khi parse token: ${row.token}`, err);
                        // Nếu không phải JSON, tách bằng dấu phẩy
                        tokens = row.token.split(',').map(t => t.trim());
                    }
                } else if (Array.isArray(row.token)) {
                    // Nếu driver đã parse thành mảng
                    tokens = row.token;
                }

                // Đảm bảo tokens là mảng và thêm vào allTokens
                if (Array.isArray(tokens)) {
                    allTokens = allTokens.concat(tokens);
                } else {
                    console.warn(`Token không phải mảng: ${row.token}`);
                }
            }
        });

        // Gửi thông báo từng cái một nếu có token
        if (allTokens.length > 0) {
            for (const token of allTokens) {
                await sendNotification({
                    title: 'Petland',
                    body: `Đơn hàng ${id} đã được cập nhật trạng thái `,
                    token: token
                });
                console.log(`Đã gửi thông báo tới token: ${token}`);
            }
        }

        return res.status(200).json({ message: 'Order updated successfully', newTrangThai });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error updating order', error });
    }
};
export default {
    orderbyid,
    deleteorder,
    getAllOrders,
    getOrderById,
    order,
    updateorder
};