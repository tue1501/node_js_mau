import express from "express";
import ProductController from '../controllers/ProductController.js';
import authenticateJWT from '../middleware/authenticate.js';
import verifyToken from '../middleware/authenticate.js';
import authenticateJWTphone from '../middleware/authenticatephone.js';
import upload from '../middleware/upload.js';
import { uploadMultiple } from "../middleware/upload.js"; // Import middleware

const router = express.Router();
const initAPiRouter = (app) => {
    router.get('/product',[authenticateJWT,verifyToken],ProductController.getAllproduct)

    router.post('/add-product', uploadMultiple, ProductController.addProduct);

    router.get('/producttype',authenticateJWT,ProductController.producttype)

    router.get('/producttypedetails/',authenticateJWT,ProductController.producttypedetails)

    router.get('/getallProductsByDetailType',authenticateJWT, ProductController.allgetProductsByDetailType);

    router.get('/getProductsByDetailType/:id',authenticateJWT, ProductController.getProductsByDetailType);

    router.get('/getProductById/:id',authenticateJWT, ProductController.getProductById);

    router.post('/send-sms', ProductController.sendSms);

    router.post('/verify-otp',authenticateJWTphone,ProductController.verifyOtp);

    router.post('/change-password',authenticateJWTphone,ProductController.changePassword);

    router.post('/addProductType',  authenticateJWT,ProductController.addProductType);

    router.post('/addProductTypeDetail',  authenticateJWT,ProductController.addProductTypeDetail);

    router.put('/updateProductType/:id', authenticateJWT,ProductController.updateProductType);

    router.put('/updateProductTypeDetail/:id', authenticateJWT,ProductController.updateProductTypeDetail);

    router.put('/updateProduct/:idSanPham', uploadMultiple, ProductController.updateProduct);

    router.get('/getProductByColorId/:id',authenticateJWT,ProductController.getProductByColorId);

    router.post('/search', ProductController.search);

    return app.use('/api', router);
}
export default initAPiRouter ;