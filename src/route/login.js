import express from "express";
import LoginController from '../controllers/LoginController.js';
import authenticateJWT from '../middleware/authenticate.js';

const router = express.Router()



const setupRoutes = (app) => {

    router.post('/register', LoginController.Register);

    router.post('/login', LoginController.Login);

    router.get('/user/:id',authenticateJWT, LoginController.informations);

    router.put('/address/:id',authenticateJWT, LoginController.addaddress);

    router.put('/resertpass/:id',authenticateJWT, LoginController.resertpass);
    
    // router.post('/password/:id',authenticateJWT, LoginController.password);
    
    router.post('/adddiscount/:id',authenticateJWT, LoginController.adddiscount);
    
    router.get('/discountbyid/:id',authenticateJWT, LoginController.discountbyid);

    router.get('/logout/:id', authenticateJWT, LoginController.logout);

    return app.use('/api', router);
}
export default setupRoutes;