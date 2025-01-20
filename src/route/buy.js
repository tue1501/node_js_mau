import express from "express";
import BuyController from '../controllers/BuyController.js';


const router = express.Router();
const Buy = (app) => {
    router.post('/Pay', BuyController.Pay);
    return app.use('/api', router);
}

export default Buy;