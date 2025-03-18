import express from "express";
import OrderController from '../controllers/OrderController.js';
import authenticateJWT from '../middleware/authenticate.js';
const router = express.Router();
const OrderRoutes = (app) => {

    router.get('/order',authenticateJWT, OrderController.orderbyid);

    router.post('/deleteorder',authenticateJWT, OrderController.deleteorder);

    // Route to get all orders
    router.get('/ordersall', OrderController.getAllOrders);

    return app.use('/api', router);
}
export default OrderRoutes;