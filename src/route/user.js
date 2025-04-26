import express from 'express';
import UserController from '../controllers/UserController.js';
import authenticateJWTadmin from '../middleware/authenticatead.js';
import authenticateJWT from '../middleware/authenticate.js';
import authenticateJWTadminoruser from '../middleware/authenticateaduser.js';
const router = express.Router();

const User = (app) => {
    // Route to get all users
    router.get('/users', authenticateJWTadmin,UserController.getAllUsers);

    // Route to search users by name
    router.get('/users/search/name', authenticateJWTadmin,UserController.searchByName);

    // Route to search users by phone number
    router.get('/users/search/phone', authenticateJWTadmin,UserController.searchByPhone);

    // Route to update user information
    router.put('/users/:id', authenticateJWTadminoruser,UserController.updateUser);

    return app.use('/api', router); 
}

export default User;
