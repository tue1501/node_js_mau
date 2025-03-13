import express from "express";
import RevenueController from '../controllers/RevenueController.js';
// import authenticateJWT from '../middleware/authenticate.js';

const router = express.Router();
const revenue = (app) => {
    router.post('/getRevenueByDateRange',RevenueController.fetchOrdersByStatus);
    router.post('/filterOrdersByDate',RevenueController.filterOrdersByDate);
    return app.use('/api', router);
}

export default revenue;