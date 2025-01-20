import connection from '../config/database.js';  // Đảm bảo bạn có kết nối với cơ sở dữ liệu


const Pay = async (req, res) => {
    const { idkhachhang, idsanpham, note, iddiscount, quantity,paymentMethod  } = req.body;

    try {
        // Kiểm tra dữ liệu nhập vào
        if (!Array.isArray(idsanpham) || idsanpham.length === 0 || !Array.isArray(quantity) || quantity.length !== idsanpham.length) {
            return res.status(400).json({ message: 'Invalid products or quantities provided' });
        }

        // Kiểm tra phuong thức thanh toán
        if (!['COD', 'VNPay'].includes(paymentMethod)) {
            return res.status(400).json({ message: 'Invalid payment method' });
        }

        // Truy vấn thông tin khách hàng
        const [customer] = await connection.execute(
            'SELECT hoten, sdt FROM khachhang WHERE idKhachHang = ?',
            [idkhachhang]
        );

        if (customer.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        const { hoten: customerName, sdt: customerPhone , diachi : customerAddress } = customer[0];
        
        // Kiểm tra xem khách hàng có thể sử dụng mã giảm giá không
        if (iddiscount) {
            const [discountDetails] = await connection.execute(
                'SELECT * FROM chitietgiamgia WHERE idKhachHang = ? AND idGiamGia = ? AND trangthai = 0',
                [idkhachhang, iddiscount]
            );

            if (discountDetails.length === 0) {
                return res.status(400).json({ message: 'Discount is not available or invalid for the customer' });
            }
        }

        // Truy vấn giá các sản phẩm
        const placeholders = idsanpham.map(() => '?').join(',');
        const [products] = await connection.execute(
            `SELECT idSanPham, tensp, gia FROM sanpham WHERE idSanPham IN (${placeholders})`,
            idsanpham
        );

        // Tính tổng giá dựa trên số lượng
        let total = 0;
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            const productQuantity = quantity[idsanpham.indexOf(product.idSanPham)] || 1;
            total += product.gia * productQuantity;
        }
        
        // Kiểm tra và áp dụng giảm giá nếu có
        if (iddiscount) {
            const [discount] = await connection.execute(
                'SELECT * FROM giamgia WHERE idGiamGia = ?',
                [iddiscount]
            );

            if (discount.length > 0) {
                const discountType = discount[0].danggiamgia; // 'percent' hoặc 'amount'
                const discountValue = discount[0].giamgia;  // Giá trị giảm giá
                const discountmax = discount[0].giamax;  // Giảm giá tối đa
                const discountmin = discount[0].giamin;  // Giảm giá tối thiểu
    
                let discountAmount = 0;  // Khởi tạo biến giảm giá
    
                // Giảm giá theo phần trăm
                if (discountType === 'percent') {
                    if (total >= discountmin) {
                        discountAmount = total * (discountValue / 100);  // Giảm theo phần trăm
        
                        // Kiểm tra nếu giá trị giảm giá không vượt quá mức tối đa
                        if (discountAmount > discountmax) {
                            discountAmount = discountmax;  // Giảm giá không được vượt quá discountmax
                        }
        
                        total -= discountAmount;  // Trừ giảm giá từ tổng
                    }
                } else if (discountType === 'amount') {
                    // Giảm giá theo số tiền cố định, chỉ áp dụng nếu tổng >= discountmin
                    if (total >= discountmin) {
                        total -= discountValue;  // Trừ số tiền giảm giá từ tổng
                    }
                }
    
                // Đảm bảo tổng tiền không âm
                if (total < 0) total = 0;
            }
        }

        // Lấy thời gian hiện tại
        const now = new Date();

        // Thêm đơn hàng vào cơ sở dữ liệu
        const ttCod = paymentMethod === 'COD' ? 1 : 0;
        const ttOnline = paymentMethod === 'VNPay' ? 1 : 0;

        // Thêm đơn hàng
        const [orderResult] = await connection.query(
            'INSERT INTO donhang (idkhachhang, tenkh, sdtkh, ngaytao, ngaygiaohang, ghichu, idGiamGia, tt_cod, noinhan, tt_online, trangthai, tongtien) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, 0, ?)',
            [idkhachhang, customerName, customerPhone, now, note, iddiscount, ttCod, customerAddress, ttOnline, total]
        );

        // Lấy ID của đơn hàng vừa được thêm
        const orderId = orderResult.insertId;

        // Thêm chi tiết đơn hàng vào cơ sở dữ liệu
        const detailsPromises = idsanpham.map((productId, index) => {
            const productQuantity = quantity[index];
            return connection.query(
                'INSERT INTO chitietdonhang (idSanPham, idDonhang, sl, iddanhgia) VALUES (?, ?, ?, null)',
                [productId, orderId, productQuantity]
            );
        });

        // Chờ cho tất cả chi tiết đơn hàng được thêm vào
        await Promise.all(detailsPromises);

        // Cập nhật trạng thái giảm giá thành 1 sau khi sử dụng
        if (iddiscount) {
            await connection.execute(
                'UPDATE chitietgiamgia SET trangthai = 1 WHERE idKhachHang = ? AND idGiamGia = ?',
                [idkhachhang, iddiscount]
            );
        }

        // Truy vấn chi tiết đơn hàng vừa thêm
        const [orderDetails] = await connection.execute(
            'SELECT c.idSanPham, s.tensp, c.sl, s.gia FROM chitietdonhang c JOIN sanpham s ON c.idSanPham = s.idSanPham WHERE c.idDonhang = ?',
            [orderId]
        );

        // Trả về toàn bộ thông tin đơn hàng
        return res.status(200).json({
            message: 'Order placed successfully',
            order: {
                orderId,
                customerName,
                customerPhone,
                products: orderDetails,
                total,
                note
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error', error });
    }
};






export default {
    Pay
};
