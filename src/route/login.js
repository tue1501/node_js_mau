import express from "express";
import LoginController from '../controllers/LoginController.js';
import authenticateJWT from '../middleware/authenticate.js';
import checkSuperAdmin from '../middleware/checkSuperAdmin.js';

const router = express.Router()



const setupRoutes = (app) => {

    router.post('/register', LoginController.Register);

    router.post('/login', LoginController.Login);

    router.post('/loginqtv', LoginController.LoginQtv);

    router.post('/addadmin', LoginController.addAdmin);

    router.post('/loginelenew', LoginController.Loginelenew);

    router.get('/user',authenticateJWT, LoginController.informations);

    router.put('/address',authenticateJWT, LoginController.addaddress);

    router.put('/resertpass',authenticateJWT, LoginController.resertpass);
    
    // router.post('/password/:id',authenticateJWT, LoginController.password);
    
    router.post('/adddiscount',authenticateJWT, LoginController.adddiscount);
    
    router.get('/discountbyid',authenticateJWT, LoginController.discountbyid);

    router.get('/logout', authenticateJWT, LoginController.logout);

    router.post('/add-admin', LoginController.addAdmin);

    return app.use('/api', router);
}
export default setupRoutes;