import express from "express";
import EmailController from '../controllers/EmailController.js';
import authenticateJWT from '../middleware/authenticate.js';

const router = express.Router();
const Emai = (app) => {
    router.post('/sendmail', EmailController.sendEmailController);
    return app.use('/api', router);
}

export default Emai;