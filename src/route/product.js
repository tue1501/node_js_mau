import express from "express";
import ProductController from '../controllers/ProductController.js';
import authenticateJWT from '../middleware/authenticate.js';

import upload from '../middleware/uploadMiddleware.js';

// import AuthController from '../controllers/AuthController.js';
const router = express.Router();
const initAPiRouter = (app) => {
    router.get('/product',authenticateJWT,ProductController.getAllproduct)

    router.post('/add-product', upload.single("hinhanh"), ProductController.addProduct);

    router.get('/producttype',authenticateJWT,ProductController.producttype)

    router.get('/producttypedetails/',authenticateJWT,ProductController.producttypedetails)

    router.get('/getallProductsByDetailType',authenticateJWT, ProductController.allgetProductsByDetailType);

    router.get('/getProductsByDetailType/:id',authenticateJWT, ProductController.getProductsByDetailType);

    router.get('/getProductById/:id',authenticateJWT, ProductController.getProductById);

    // router.get('/otp',AuthController.otp);

    // router.post('/send-otp',ProductController.sendOtp);

    router.post('/send-sms', ProductController.sendSms);

    router.post('/verify-otp', ProductController.verifyOtp);

    router.post('/change-password',  ProductController.changePassword);

    return app.use('/api', router);
}
export default initAPiRouter ;