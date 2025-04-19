import express from "express";
import AdminController from '../controllers/AdminController.js';
import authenticateJWTadmin from '../middleware/authenticatead.js';
import checkSuperAdmin from '../middleware/checkSuperAdmin.js';

const router = express.Router();
const Admin = (app) => {
    router.post('/repcomment/:id', authenticateJWTadmin,AdminController.repcomment);
    router.get('/dashboard',authenticateJWTadmin,AdminController.getSummaryStatistics);
    router.get('/admin',authenticateJWTadmin,checkSuperAdmin,AdminController.getAlladmin);
    router.put('/updateadmin/:id', authenticateJWTadmin, checkSuperAdmin, AdminController.updateAdmin);
    router.post('/updateShopInfo', authenticateJWTadmin, checkSuperAdmin, AdminController.updateShopInfo);
    return app.use('/api', router);
}

export default Admin;