import express from "express";
import DiscountController from '../controllers/DiscountController.js';
import authenticateJWT from '../middleware/authenticate.js';

// Định nghĩa các route
const router = express.Router();
const discount = (app) => {
    router.get('/vouchers', DiscountController.getAllVouchers);
    router.get('/vouchers/:id', DiscountController.getVoucherById);
    router.post('/vouchers', DiscountController.createVoucher);
    router.put('/vouchers/:id', DiscountController.updateVoucher);
    router.delete('/vouchers/:id', DiscountController.deleteVoucher);
    return app.use('/api', router);
}

export default discount;
