import express from 'express';
import dotenv from 'dotenv';
import initAPiRouter from './route/product.js'; 
import setupRoutes from './route/login.js'; 
import Cart from './route/cart.js'; 
import Buy from './route/buy.js'; 
import Evaluate from './route/evaluate.js';
import session  from 'express-session';
import OrderRoutes from './route/order.js';
import connectDB from './config/db.js' ;  // Đảm bảo đường dẫn đúng
import path from 'path';
import { fileURLToPath } from 'url';


// Cấu hình express để phục vụ hình ảnh từ thư mục uploads


dotenv.config();

const app = express(); 
const PORT = process.env.PORT || 8080;
app.use(express.json());

app.use(session({
    secret: 'PETLAND', // Khóa bí mật để mã hóa session
    resave: false,             // Không lưu lại session nếu không thay đổi
    saveUninitialized: true,   // Lưu session ngay cả khi chưa có thay đổi
    cookie: {
      httpOnly: true,          // Cookie chỉ có thể được truy cập bởi server
      secure: false,           // Đặt true nếu đang sử dụng https
      maxAge: 3600000,         // Thời gian session hết hạn (1 giờ)
    }
  }));

initAPiRouter(app);  
setupRoutes(app);
Cart(app);
Buy(app);
OrderRoutes(app);
Evaluate(app);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
connectDB();

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

