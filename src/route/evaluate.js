import express from "express";
import EvaluateController from '../controllers/EvaluateController.js';
import authenticateJWT from '../middleware/authenticate.js';

const router = express.Router();
const Evaluate = (app) => {
    router.get("/evaluate/:idSanPham",authenticateJWT, EvaluateController.getEvaluate);
    router.post("/evaluate",authenticateJWT, EvaluateController.addEvaluate);
    return app.use('/api', router);
}

export default Evaluate;