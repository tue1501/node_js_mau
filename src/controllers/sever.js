import express from 'express';
import dotenv from 'dotenv';
import initAPiRouter from './route/product.js'; 
import setupRoutes from './route/login.js'; 
import OrderRoutes from './route/order.js'; 
import Cart from './route/cart.js'; 
import Buy from './route/buy.js'; 


const app = express();

// import { route } from './route/web.js';
dotenv.config();

const PORT = process.env.PORT || 8080;
app.use(express.json());
initAPiRouter(app);  
setupRoutes(app);
OrderRoutes(app);
Cart(app);
Buy(app);
app.post('/vnpay-return', async (req, res) => {
    const vnp_Params = req.body;
    const vnp_SecureHash = vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHash'];

    const secureHash = createVnpHash(vnp_Params);

    // Kiểm tra hash
    if (vnp_SecureHash === secureHash) {
        const orderId = vnp_Params['vnp_TxnRef'];
        const responseCode = vnp_Params['vnp_ResponseCode'];

        if (responseCode === '00') {
            // Thanh toán thành công
            // Cập nhật trạng thái đơn hàng trong cơ sở dữ liệu
            await connection.execute('UPDATE donhang SET trangthai = 1 WHERE idDonhang = ?', [orderId]);
            return res.status(200).json({ message: 'Payment successful' });
        } else {
            // Thanh toán không thành công
            return res.status(400).json({ message: 'Payment failed', errorCode: responseCode });
        }
    } else {
        return res.status(400).json({ message: 'Invalid hash' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});