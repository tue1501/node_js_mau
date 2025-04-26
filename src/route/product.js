import express from "express";
import ProductController from '../controllers/ProductController.js';
import authenticateJWT from '../middleware/authenticate.js';
import verifyToken from '../middleware/authenticate.js';
import authenticateJWTphone from '../middleware/authenticatephone.js';
import authenticateJWTadminoruser from '../middleware/authenticateaduser.js';
import upload from '../middleware/upload.js';
import { uploadMultiple } from "../middleware/upload.js"; // Import middleware

const router = express.Router();
const initAPiRouter = (app) => {
    router.get('/product',authenticateJWTadminoruser,ProductController.getAllproduct)

    router.post('/add-product', uploadMultiple, ProductController.addProduct);

    router.get('/producttype',authenticateJWTadminoruser,ProductController.producttype)

    router.get('/producttypedetails/',authenticateJWTadminoruser,ProductController.producttypedetails)

    router.get('/getallProductsByDetailType',authenticateJWTadminoruser, ProductController.allgetProductsByDetailType);

    router.get('/getProductsByDetailType/:id',authenticateJWTadminoruser, ProductController.getProductsByDetailType);

    router.get('/getProductById/:id',authenticateJWTadminoruser, ProductController.getProductById);

    router.post('/send-sms', ProductController.sendOtp);

    router.post('/verify-otp',authenticateJWTphone,ProductController.verifyOtp);

    router.post('/change-password',authenticateJWTphone,ProductController.changePassword);

    router.post('/addProductType',  authenticateJWTadminoruser,ProductController.addProductType);

    router.post('/addProductTypeDetail',  authenticateJWTadminoruser,ProductController.addProductTypeDetail);

    router.put('/updateProductType/:id', authenticateJWTadminoruser,ProductController.updateProductType);

    router.put('/updateProductTypeDetail/:id', authenticateJWTadminoruser,ProductController.updateProductTypeDetail);

    router.put('/updateProduct/:idSanPham', uploadMultiple, ProductController.updateProduct);

    router.get('/getProductByColorId/:id',authenticateJWT,ProductController.getProductByColorId);

    router.put('/updateProductImage/:id', uploadMultiple, ProductController.updateProductImage);

    router.post('/search', ProductController.search);

    router.put('/updatecolor/:id', authenticateJWTadminoruser,uploadMultiple,ProductController.updateProductcolor);

    router.post('/createProductColor', authenticateJWTadminoruser,uploadMultiple,ProductController.createProductColor);

    return app.use('/api', router);
}
export default initAPiRouter ;