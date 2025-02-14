import express from "express";
import ProductController from '../controllers/ProductController.js';
// import AuthController from '../controllers/AuthController.js';
const router = express.Router();
const initAPiRouter = (app) => {
    router.get('/product',ProductController.getAllproduct)

    router.get('/producttype',ProductController.producttype)

    router.get('/producttypedetails/',ProductController.producttypedetails)

    router.get('/getallProductsByDetailType', ProductController.allgetProductsByDetailType);

    router.get('/getProductsByDetailType/:id', ProductController.getProductsByDetailType);

    router.get('/getProductById/:id', ProductController.getProductById);

    // router.get('/otp',AuthController.otp);

    // router.post('/send-otp',ProductController.sendOtp);

    router.post('/send-sms', ProductController.sendSms);

    router.post('/verify-otp', ProductController.verifyOtp);

    router.post('/change-password',  ProductController.changePassword);

    return app.use('/api', router);
}
export default initAPiRouter ; 