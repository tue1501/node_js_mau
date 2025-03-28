import express from 'express';

import EmailController from '../controllers/EmailController.js';

const router = express.Router();

// Định nghĩa các route liên quan đến email
const emailRoutes = (app) => {
    // Đăng ký route POST gửi email
    router.post('/sendmail', EmailController.send);
    
    // Sử dụng router trong ứng dụng
    return app.use('/api', router);
};

export default emailRoutes;
