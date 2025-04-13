import express from "express";
import NotificationController from '../controllers/NotificationController.js';
import authenticateJWT from '../middleware/authenticate.js';

const router = express.Router();
const Notification = (app) => {
    router.get('/Notification',authenticateJWT, NotificationController.getNotification);
    router.post('/updateNotification',authenticateJWT, NotificationController.updateNotification);
    router.post('/sendNotification', NotificationController.sendNotificationToUser);
    return app.use('/api', router);
}

export default Notification;