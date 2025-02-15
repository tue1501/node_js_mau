import express from "express";
import OrderController from '../controllers/OrderController.js';
import authenticateJWT from '../middleware/authenticate.js';
const router = express.Router();
const OrderRoutes = (app) => {

    router.get('/order/:id',authenticateJWT, OrderController.orderbyid);

    router.post('/deleteorder/:id',authenticateJWT, OrderController.deleteorder);

    return app.use('/api', router);
}
export default OrderRoutes;