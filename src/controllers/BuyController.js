import axios from 'axios';
import connection from '../config/database.js';  // Đảm bảo bạn có kết nối với cơ sở dữ liệu
import crypto from 'crypto';  
import jwt from 'jsonwebtoken';
// Hàm thanh toán MoMo
const payment = async (req, res, orderId, totalAmount, orderDescription) => {
    var accessKey = 'F8BBA842ECF85';
    var secretKey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    var partnerCode = 'MOMO';
    var redirectUrl = 'http://localhost:8080/api/products';
    var ipnUrl = 'https://webhook.site/b3088a6a-2d17-4f8d-a383-71389a6c600b';
    var requestType = "payWithMethod";
    var orderInfo = orderDescription || 'pay with MoMo';  // Sử dụng mô tả đơn hàng truyền vào
    var amount = totalAmount.toString();  // Chuyển tổng tiền thành chuỗi
    var partnerName = "Test";
    var storeId = "MomoTestStore";
    var orderId = partnerCode + new Date().getTime();  // Ví dụ: MOMO1553512345678
    var requestId = orderId;  // Sử dụng orderId làm requestId
    var extraData = '';
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
        return res.status(200).json(result.data);
    } catch (error) {
        return res.status(500).json({
            statuscode: 500,
            message: "server err"
        });
    }
};

// Hàm Pay để xử lý đơn hàng và phương thức thanh toán
const Pay = async (req, res) => {
    const { idMau, note, iddiscount, quantity, paymentMethod } = req.body;
    const idkhachhang = req.user.id; // Lấy ID từ token đã giải mã

    try {
        if (!Array.isArray(idMau) || idMau.length === 0 || !Array.isArray(quantity) || quantity.length !== idMau.length) {
            return res.status(400).json({ message: 'Invalid product color-image IDs or quantities provided' });
        }

        if (!['COD', 'MoMo'].includes(paymentMethod)) {
            return res.status(400).json({ message: 'Invalid payment method' });
        }

        const [customer] = await connection.execute(
            'SELECT hoten, sdt, diachi FROM khachhang WHERE idKhachHang = ?',
            [idkhachhang]
        );

        if (customer.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        const { hoten: customerName, sdt: customerPhone, diachi: customerAddress } = customer[0];

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
        const placeholders = idMau.map(() => '?').join(',');
        const [products] = await connection.execute(
            `SELECT smh.idSanPham, smh.id as idMau, s.tensp, s.gia, smh.hinhanh, smh.tenmau
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
        }

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

        const now = new Date();
        const ttCod = paymentMethod === 'COD' ? 1 : 0;
        const ttOnline = paymentMethod === 'VNPay' ? 1 : 0;

        const [orderResult] = await connection.query(
            'INSERT INTO donhang (idkhachhang, tenkh, sdtkh, ngaytao, ngaygiaohang, ghichu, idGiamGia, tt_cod, noinhan, tt_online, trangthai, tongtien) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, 0, ?)',
            [idkhachhang, customerName, customerPhone, now, note, iddiscount, ttCod, customerAddress, ttOnline, total]
        );

        const orderId = orderResult.insertId;

        // Lưu thông tin chi tiết đơn hàng
        const detailsPromises = idMau.map((colorImageId, index) => {
            const productQuantity = quantity[index];
            return connection.query(
                'INSERT INTO chitietdonhang (idMau, idDonhang, sl, iddanhgia) VALUES (?, ?, ?, null)',
                [colorImageId, orderId, productQuantity]
            );
        });

        await Promise.all(detailsPromises);

        if (iddiscount) {
            await connection.execute(
                'UPDATE chitietgiamgia SET trangthai = 1 WHERE idKhachHang = ? AND idGiamGia = ?',
                [idkhachhang, iddiscount]
            );
        }

        const [orderDetails] = await connection.execute(
            `SELECT c.idMau, s.tensp, smh.tenmau, c.sl, s.gia, smh.hinhanh
             FROM chitietdonhang c
             JOIN sanpham_mau_hinhanh smh ON c.idMau = smh.id
             JOIN sanpham s ON smh.idSanPham = s.idSanPham
             WHERE c.idDonhang = ?`,
            [orderId]
        );

        // Gọi hàm thanh toán MoMo và truyền mã đơn hàng và mô tả
        if (paymentMethod === 'MoMo') {
            return payment(req, res, orderId, total, note);  
        } else {
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
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error', error });
    }
};


export default {
    Pay,
    payment
};
