import express from "express";
import ProductController from '../controllers/ProductController.js';

const router = express.Router();
const initAPiRouter = (app) => {
    router.get('/product',ProductController.getAllproduct)

    router.get('/producttype',ProductController.producttype)

    router.get('/producttypedetails/',ProductController.producttypedetails)

    router.get('/getallProductsByDetailType', ProductController.allgetProductsByDetailType);

    router.get('/getProductsByDetailType/:id', ProductController.getProductsByDetailType);

    router.get('/getProductById/:id', ProductController.getProductById);

    return app.use('/api', router);
}
export default initAPiRouter ; 