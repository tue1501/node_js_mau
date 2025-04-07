import express from "express";
import OrderController from '../controllers/OrderController.js';
import authenticateJWT from '../middleware/authenticate.js';
import authenticateJWTadmin from '../middleware/authenticatead.js';
const router = express.Router();
const OrderRoutes = (app) => {

    router.get('/order',authenticateJWT, OrderController.orderbyid);

    router.post('/deleteorder',authenticateJWT, OrderController.deleteorder);

    // Route to get all orders
    router.get('/ordersall' , authenticateJWTadmin,OrderController.getAllOrders);

    // Route to get order details by order ID
    router.get('/orders/:id', OrderController.getOrderById);

    // Route to get order details by order ID
    router.get('/order/:id', authenticateJWT,OrderController.order);

    router.post('/updateorder/:id',authenticateJWTadmin,OrderController.updateorder);

    return app.use('/api', router);
}
export default OrderRoutes;