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
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Welcome to Petland API</title>
        <meta name="zalo-platform-site-verification" content="MDwO2hti7o5tsuqTzD01527_YY_DYLjsDJ0n" />
      </head>
      <body>
        <h1>Welcome to Petland API!</h1>
        <!-- Start of Fchat.vn -->
        <div class="zalo-follow-only-button" data-oaid="3898210170335764168"></div>
        <script src="https://sp.zalo.me/plugins/sdk.js"></script>
        <!-- End of Fchat.vn -->
      </body>
    </html>
  `);
});





app.post("/send-message", async (req, res) => {
  try {
    const { user_id, message } = req.body;

    const response = await axios.post(
      "https://openapi.zalo.me/v2.0/oa/message",
      {
        recipient: { user_id },
        message: { text: message },
      },
      {
        headers: {
          "Content-Type": "application/json",
          access_token: "O2KTE12JBNfg914-6P0jSced43KPYq83Q4iBG6EWMWH4UdCAQBq_5XffTHO7YGiM2KXZK1pxLc4CFXDuFT8cG18YGqCV_mnq3aixC3kxKXqn229O1izm57DxF5Hxl0WHMqnf8L6h9p1zHX5sMurdI7Di1WrogKC0G6y4B5UWDJnTP4GYUe5p1abs8qLybbH3QYmwVcJiR79LLYinTE4V8LioGWPyWGiO2cn13o-nCmif0qOt0hXtAG9ZIXSIeW4l8d1c6GQ5BGGcPXf24wz6UHvARq0TkYTH6LrLVnQG17CVU6LzEf0lJG5zHsa8gNSaFcyW50YPKb1pK0LnN9rlQYnAAN1U_5LgAqWRTYgQIsyXJdPPC8q2G4j5HGrWapGRO5m8066zVJnFLIezMgH146fSCornK4A217GMYIj_",
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});





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

