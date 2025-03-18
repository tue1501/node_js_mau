import connection from '../config/database.js';
import dotenv from 'dotenv';
dotenv.config();

const getAllUsers = async (req, res) => {
    try {
        const [rows] = await connection.query('SELECT * FROM khachhang');
        if (rows.length === 0) {
            return res.status(404).json({ message: 'No users found!' });
        }
        return res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ message: 'Error fetching users.' });
    }
};

const searchByName = async (req, res) => {
    const { name } = req.query;
    try {
        const [rows] = await connection.query('SELECT * FROM khachhang WHERE LOWER(hoten) LIKE LOWER(?)', [`%${name}%`]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'No users found!' });
        }
        return res.status(200).json(rows);
    } catch (error) {
        console.error('Error searching users by name:', error);
        return res.status(500).json({ message: 'Error searching users by name.' });
    }
};

const searchByPhone = async (req, res) => {
    const { phone } = req.query;
    try {
        const [rows] = await connection.query('SELECT * FROM khachhang WHERE sdt LIKE ?', [`%${phone}%`]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'No users found!' });
        }
        return res.status(200).json(rows);
    } catch (error) {
        console.error('Error searching users by phone:', error);
        return res.status(500).json({ message: 'Error searching users by phone.' });
    }
};

export default { getAllUsers, searchByName, searchByPhone };
