import express from "express";
import EvaluateController from '../controllers/EvaluateController.js';
import authenticateJWT from '../middleware/authenticate.js';

const router = express.Router();
const Evaluate = (app) => {
    router.get("/evaluate/:idSanPham",authenticateJWT, EvaluateController.getEvaluate);
    router.get("/evaluateByIdMau/:idMau",authenticateJWT, EvaluateController.getEvaluateByIdMau);
    router.post("/evaluate",authenticateJWT, EvaluateController.addEvaluate);
    router.get("/evaluate", EvaluateController.getallEvaluate);
    return app.use('/api', router);
}

export default Evaluate;