import express from 'express';
import dotenv from 'dotenv';
import initAPiRouter from './route/product.js'; 
import setupRoutes from './route/login.js'; 
import Cart from './route/cart.js'; 
import Buy from './route/buy.js'; 
// import { route } from './route/web.js';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
app.use(express.json());
initAPiRouter(app);  
setupRoutes(app);
Cart(app);
Buy(app);
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
