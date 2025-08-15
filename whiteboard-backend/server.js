const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const redis = require('socket.io-redis');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.SERVER_PORT || 5000;

io.adapter(redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD
}));
mongoose.connect(process.env.MONGO_CONNECTION_STRING);

const drawingSchema = new mongoose.Schema({
    type: String,
    x: Number,
    y: Number,
    prevX: Number,
    prevY: Number,
    width: Number,
    height: Number,
    radius: Number,
    color: String,
    size: String,
    font: String,
    text: String
});

const userSchema = new mongoose.Schema({
    user_id: String,
});

const clearUsersCollection = async () => {
    try {
        await User.deleteMany({});
        console.log('Users collection cleared.');
    } catch (err) {
        console.error('Error clearing users collection:', err.message);
    }
};

const clearDrawingCollection = async () => {
    try {
        await Drawing.deleteMany({});
        console.log('Drawing collection cleared.');
    } catch (err) {
        console.error('Error clearing drawing collection:', err.message);
    }
};

const Drawing = mongoose.model('Drawing', drawingSchema);
const User = mongoose.model('Users', userSchema);

io.on('connection', async (socket) => {
    console.log('User connected:', socket.id);
    try {
        clearDrawingCollection();
        clearUsersCollection();
        // let users = await addUserInDB(socket.id);
        // io.emit('userJoinedSuccess', { success: true, user_id: socket.id });
        // io.emit('allActiveUsers', users);
        // const existingData = await Drawing.find({});
        // io.to(socket.id).emit('initialData', existingData);

        // socket.on('draw', async (data) => {
        //     const newDrawing = new Drawing(data);
        //     await newDrawing.save();
        //     io.emit('draw', data);
        // });

        // socket.on('clearCanvas', async () => {
        //     await clearDrawingCollection();
        //     console.log('Received clearCanvas from:', socket.id);
        //     io.emit('clearCanvas');
        // });

        // socket.on('disconnect', () => {
        //     console.log('User disconnected:', socket.id);
        //     let users = removeUser(socket.id);
        //     io.emit('userDisconnected', users);
        // });
    } catch (error) {
        console.error('Error:', error);
    }
});

const addUserInDB = async (userId) => {
    try {
        const existingUser = await User.findOne({ user_id: userId });
        if (existingUser) {
            console.log('User already exists:', existingUser);
            return; // Exit if user exists
        }
        let userData = { user_id: userId };
        const newUser = new User(userData);
        const savedUser = await newUser.save();
        console.log('User added:', savedUser);
        return fetchUsers();
    } catch (err) {
        console.error('Error adding user:', err.message);
        return [];
    }
}

const fetchUsers = async () => {
    try {
        const users = await User.find();
        return users;
    } catch (err) {
        console.error('Error fetching users:', err.message);
        return [];
    }
};

const removeUser = async (userId) => {
    try {
        const existingUser = await User.findOne({ user_id: userId });
        if (!existingUser) {
            console.log('User not found with the provided ID.');
            return; // Exit if user does not exist
        }
        const deletedUser = await User.deleteOne({ user_id: userId });
        console.log('User removed:', deletedUser);
        return fetchUsers();
    } catch (err) {
        console.error('Error removing user:', err.message);
    }
};

server.listen(PORT, () => {
    process.on('SIGINT', () => {
        console.log('Server is shutting down. Bye!');
        process.exit();
    });
    console.log(`Server running on http://localhost:${PORT}`);
});
