import express from 'express';
import UserController from '../controllers/UserController.js';

const router = express.Router();

const User = (app) => {
    // Route to get all users
    router.get('/users', UserController.getAllUsers);

    // Route to search users by name
    router.get('/users/search/name', UserController.searchByName);

    // Route to search users by phone number
    router.get('/users/search/phone', UserController.searchByPhone);

    // Route to update user information
    router.put('/users/:id', UserController.updateUser);

    return app.use('/api', router);
}

export default User;
