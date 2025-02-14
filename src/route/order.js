import express from "express";
import OrderController from '../controllers/OrderController.js';
const router = express.Router();
const OrderRoutes = (app) => {

    router.get('/order/:id', OrderController.orderbyid);

    router.post('/deleteorder/:id', OrderController.deleteorder);

    return app.use('/api', router);
}
export default OrderRoutes;