import express from "express";
import BuyController from '../controllers/BuyController.js';
import authenticateJWT from '../middleware/authenticate.js';

const router = express.Router();
const Buy = (app) => {
    router.post('/Pay',authenticateJWT, BuyController.Pay);
    router.post('/payment',authenticateJWT, BuyController.payment);
    return app.use('/api', router);
}

export default Buy;