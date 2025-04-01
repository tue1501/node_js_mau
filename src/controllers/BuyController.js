import axios from 'axios';
import connection from '../config/database.js';  // Đảm bảo bạn có kết nối với cơ sở dữ liệu
import crypto from 'crypto';  
import jwt from 'jsonwebtoken';
// Hàm thanh toán MoMo
const payment = async (req, res, orderId, totalAmount, orderDescription) => {
    var accessKey = 'F8BBA842ECF85';
    var secretKey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    var partnerCode = 'MOMO';
    var redirectUrl = 'http://localhost:8080/api/redirectUrl';
    var ipnUrl = 'https://nodejsmau-production.up.railway.app/api/momo-ipn'; // Thay thế URL webhook cũ
    var requestType = "payWithMethod";
    var originalOrderId = orderId; // Lưu lại orderId gốc trước khi thay đổi
    var orderInfo = orderDescription || 'pay with MoMo';  // Sử dụng mô tả đơn hàng truyền vào
    var amount = totalAmount.toString();  // Chuyển tổng tiền thành chuỗi
    var partnerName = "Test";
    var storeId = "MomoTestStore";
    var orderId = new Date().getTime() + orderId  // Tạo orderId mới mỗi lần thanh toán lại
    console.log(orderId);
    var requestId = orderId; // requestId cũng mới
    var extraData = originalOrderId; // Lưu `orderId` gốc vào extraData
    var orderGroupId = '';
    var autoCapture = true;
    var lang = 'vi';
    var rawSignature = "accessKey=" + accessKey + "&amount=" + amount + "&extraData=" + extraData + "&ipnUrl=" + ipnUrl + "&orderId=" + orderId + "&orderInfo=" + orderInfo + "&partnerCode=" + partnerCode + "&redirectUrl=" + redirectUrl + "&requestId=" + requestId + "&requestType=" + requestType;
    var signature = crypto.createHmac('sha256', secretKey)
        .update(rawSignature)
        .digest('hex');
    const requestBody = JSON.stringify({
        partnerCode: partnerCode,
        partnerName: partnerName,
        storeId: storeId,
        requestId: requestId,
        amount: amount,
        orderId: orderId,
        orderInfo: orderInfo,
        redirectUrl: redirectUrl,
        ipnUrl: ipnUrl,
        lang: lang,
        requestType: requestType,
        autoCapture: autoCapture,
        extraData: extraData,
        orderGroupId: orderGroupId,
        signature: signature
    });
    const options = {
        method: 'POST',
        url: 'https://test-payment.momo.vn/v2/gateway/api/create',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestBody)
        },
        data: requestBody
    }
    
    try {
        let result = await axios(options);
        // In thêm thông tin đơn hàng vào bảng donhang
        console.log(extraData);
        const [order] = await connection.execute(
            'SELECT * FROM donhang WHERE idDonhang = ?',
            [extraData]
        );  
        const orderInfo = order[0];
        // Kiểm tra đơn hàng có tồn tại không
        return res.status(200).json({
            message: "Tạo thanh toán thành công",
            data: orderInfo, // Thông tin đơn hàng từ database
            momo : result.data ,
        });
    } catch (error) {
        console.error("Error occurred:", error); // In lỗi ra console để dễ dàng kiểm tra
        return res.status(500).json({
            statuscode: 500,
            message: "server err",
            error: error.message // In chi tiết lỗi ra để dễ dàng debug
        });
    }
};

const handleMomoIPN = async (req, res) => {
    try {
        const { extraData, requestId, resultCode } = req.body;
        
        console.log(extraData, requestId, resultCode); // Ghi log để kiểm tra dữ liệu nhận được từ MoMo
        const [rows] = await connection.execute(
            'SELECT idDonhang FROM donhang WHERE idDonhang = ?',
            [extraData]
        )
        if (rows.length > 0) {
            if (resultCode === 0) { // resultCode = 0 nghĩa là thanh toán thành công
                await connection.execute(
                    'UPDATE donhang SET tt_online = 1 WHERE idDonhang = ?',
                    [extraData]
                );
                return res.status(200).json({ message: "Payment successful, order updated!" });
            } else {
                return res.status(400).json({ message: "Payment failed or cancelled!" });
            }
        } else {
            return res.status(400).json({ message: "Order not found!" });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error', error });
    }
};

const Pay = async (req, res) => {
    const { idMau, note, iddiscount, quantity, paymentMethod } = req.body;
    const idkhachhang = req.user.id; // Lấy ID từ token đã giải mã
    
    try {
        // Kiểm tra mảng idMau và quantity
        if (!Array.isArray(idMau) || idMau.length === 0 || !Array.isArray(quantity) || quantity.length !== idMau.length) {
            return res.status(400).json({ message: 'Invalid product color-image IDs or quantities provided' });
        }

        if (!['COD', 'MoMo'].includes(paymentMethod)) {
            return res.status(400).json({ message: 'Invalid payment method' });
        }

        // Lấy thông tin khách hàng
        const [customer] = await connection.execute(
            'SELECT hoten, sdt, diachi FROM khachhang WHERE idKhachHang = ?',
            [idkhachhang]
        );

        if (customer.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        const { hoten: customerName, sdt: customerPhone, diachi: customerAddress } = customer[0];

        // Kiểm tra nếu địa chỉ của khách hàng là null
        if (!customerAddress) {
            return res.status(400).json({ message: 'Customer address is required to place an order' });
        }

        // Kiểm tra mã giảm giá nếu có
        if (iddiscount) {
            const [discountDetails] = await connection.execute(
                'SELECT * FROM chitietgiamgia WHERE idKhachHang = ? AND idGiamGia = ? AND trangthai = 0',
                [idkhachhang, iddiscount]
            );

            if (discountDetails.length === 0) {
                return res.status(400).json({ message: 'Discount is not available or invalid for the customer' });
            }
        }

        // Lấy thông tin sản phẩm dựa trên `idMau`
        const placeholders = idMau.map(() => '?').join(',');  // Tạo các placeholders cho mảng
        const [products] = await connection.execute(
            `SELECT smh.idSanPham, smh.id as idMau, s.tensp, s.gia, smh.hinhanh, smh.tenmau, smh.so_luong
             FROM sanpham_mau_hinhanh smh
             JOIN sanpham s ON smh.idSanPham = s.idSanPham
             WHERE smh.id IN (${placeholders})`,
            idMau
        );

        let total = 0;
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            const productQuantity = quantity[idMau.indexOf(product.idMau)] || 1;
            total += product.gia * productQuantity;

            // Trừ số lượng sản phẩm trong bảng mau_hinhanh
            const newQuantity = product.so_luong - productQuantity;
            if (newQuantity < 0) {
                return res.status(400).json({ message: `Not enough quantity for product ${product.tensp}` });
            }
            await connection.execute(
                'UPDATE sanpham_mau_hinhanh SET so_luong = ? WHERE id = ?',
                [newQuantity, product.idMau]
            );
        }

        // Tính toán giảm giá nếu có
        if (iddiscount) {
            const [discount] = await connection.execute(
                'SELECT * FROM giamgia WHERE idGiamGia = ?',
                [iddiscount]
            );

            if (discount.length > 0) {
                const discountType = discount[0].danggiamgia; 
                const discountValue = discount[0].giamgia;
                const discountmax = discount[0].giamax; 
                const discountmin = discount[0].giamin; 

                let discountAmount = 0;

                if (discountType === 'percent') {
                    if (total >= discountmin) {
                        discountAmount = total * (discountValue / 100);

                        if (discountAmount > discountmax) {
                            discountAmount = discountmax;
                        }

                        total -= discountAmount;
                    }
                } else if (discountType === 'amount') {
                    if (total >= discountmin) {
                        total -= discountValue;
                    }
                }

                if (total < 0) total = 0;
            }
        }

        // Tạo đơn hàng
        const now = new Date();
        const ttCod = paymentMethod === 'COD' ? 1 : 0;
        const ttOnline = paymentMethod === 'MoMo' ? 0 : 0;

        const [orderResult] = await connection.query(
            'INSERT INTO donhang (idkhachhang, tenkh, sdtkh, ngaytao, ngaygiaohang, ghichu, idGiamGia, tt_cod, noinhan, tt_online, trangthai, tongtien) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, 0, ?)',
            [idkhachhang, customerName, customerPhone, now, note, iddiscount, ttCod, customerAddress, ttOnline, total]
        );

        const orderId = orderResult.insertId;

        // Lấy thông tin đơn hàng vừa tạo
        const [newOrder] = await connection.execute(
            'SELECT * FROM donhang WHERE idDonhang = ?',
            [orderId]
        );
        const orderInfo = newOrder[0];
        if (newOrder.length === 0) {
            return res.status(404).json({ message: 'Failed to retrieve the newly created order' });
        }

        // Lưu thông tin chi tiết đơn hàng
        const detailsPromises = idMau.map((colorImageId, index) => {
            const productQuantity = quantity[index];
            return connection.query(
                'INSERT INTO chitietdonhang (idMau, idDonhang, sl, iddanhgia) VALUES (?, ?, ?, null)',
                [colorImageId, orderId, productQuantity]
            );
        });

        await Promise.all(detailsPromises);

        // Cập nhật trạng thái mã giảm giá nếu có
        if (iddiscount) {
            await connection.execute(
                'UPDATE chitietgiamgia SET trangthai = 1 WHERE idKhachHang = ? AND idGiamGia = ?',
                [idkhachhang, iddiscount]
            );
        }

        // Xóa các sản phẩm đã mua trong giỏ hàng
        const placeholdersForCart = idMau.map(() => '?').join(',');  // Tạo các placeholders cho mảng
        await connection.execute(
            `DELETE FROM giohang WHERE idKhachHang = ? AND idMau IN (${placeholdersForCart})`,
            [idkhachhang, ...idMau]  // Truyền idkhachhang và các idMau vào câu lệnh
        );

        // Lấy chi tiết đơn hàng để trả về kết quả
        const [orderDetails] = await connection.execute(
            `SELECT c.idMau, s.tensp, smh.tenmau, c.sl, s.gia, smh.hinhanh
             FROM chitietdonhang c
             JOIN sanpham_mau_hinhanh smh ON c.idMau = smh.id
             JOIN sanpham s ON smh.idSanPham = s.idSanPham
             WHERE c.idDonhang = ?`,
            [orderId]
        );

        // Gọi hàm thanh toán MoMo nếu phương thức thanh toán là MoMo
        if (paymentMethod === 'MoMo') {
            return payment(req, res, orderId, total, note);  
        } else {
            return res.status(200).json({
                message: 'Order placed successfully',
                data: orderInfo,
                order: {
                    orderId,
                    customerName,
                    customerPhone,
                    products: orderDetails,
                    total,
                    note
                },
            });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error', error });
    }
};
// Hàm xử lý thanh toán MoMo
const thanhtoanmomo = async (req, res) => {
    try {
        const { iddonhang } = req.body;
        const [order] = await connection.execute(
            'SELECT * FROM donhang WHERE idDonhang = ?',
            [iddonhang]
        );
        if (order.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }
        const orderId = order[0].idDonhang;
        const totalAmount = order[0].tongtien;
        const orderDescription = order[0].ghichu || 'Thanh toán đơn hàng';  // Mô tả đơn hàng
        // Gọi hàm thanh toán MoMo
        return payment(req, res, orderId, totalAmount, orderDescription);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error });
    }
};
const redirectUrl = async (req, res) => {
    try {
        const { iddonhang } = req.body;
        const [order] = await connection.execute(
            'SELECT * FROM donhang WHERE idDonhang = ?',
            [iddonhang]
        );
        return res.status(200).json(order[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error });
    }
}



export default {
    Pay,
    payment,
    thanhtoanmomo,
    handleMomoIPN,
    redirectUrl
};
