import express from "express";
import LoginController from '../controllers/LoginController.js';
const router = express.Router();
const setupRoutes = (app) => {

    router.post('/register', LoginController.Register);

    router.post('/login', LoginController.Login);

    router.get('/user/:id', LoginController.informations);

    router.put('/address/:id', LoginController.addaddress);

    router.put('/resertpass/:id', LoginController.resertpass);
    
    router.post('/password/:id', LoginController.password);
    
    router.post('/adddiscount/:id', LoginController.adddiscount);
    
    router.get('/discountbyid/:id', LoginController.discountbyid);
    
    return app.use('/api', router);
}
export default setupRoutes;