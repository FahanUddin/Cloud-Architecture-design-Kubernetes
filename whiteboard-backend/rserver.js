const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
let redis = require('socket.io-redis');
const dotenv = require('dotenv');
const { Etcd3 } = require('etcd3');
const etcd = new Etcd3({ hosts: 'http://localhost:2379' });

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Redis adapter for Socket.IO
io.adapter(
    redis({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD,
    })
);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_CONNECTION_STRING);

// redis = require('redis');
// const redisClient = redis.createClient({ url: `redis://${process.env.REDIS_SERVER_IP}:${process.env.REDIS_SERVER_PORT}` });
// const initializeRedis = async () => {
//     await redisClient.connect();
// }
// initializeRedis();

// redisClient.on('error', (err) => {
//     console.log('Error occured while connecting toredis server');
//     throw (err)
// });

// Function to acquire a Raft-based lock
const acquireLock = async (lockKey, lockValue, ttl = 5) => {
    const lease = etcd.lease(ttl); // Create a lease with a TTL
    try {
        const result = await lease.put(lockKey).value(lockValue).exec();
        return { lease, result };
    } catch (err) {
        console.error('Failed to acquire lock:', err.message);
        lease.revoke(); // Cleanup in case of failure
        return null;
    }
};

// Function to release a Raft-based lock
const releaseLock = async (lockKey, lease) => {
    try {
        await lease.revoke(); // Revoke the lease to release the lock
        console.log('Lock released successfully.');
    } catch (err) {
        console.error('Error releasing lock:', err.message);
    }
};

// MongoDB Schemas
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
    text: String,
    createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
    user_id: String,
});

const Drawing = mongoose.model('Drawing', drawingSchema);
const User = mongoose.model('User', userSchema);

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

const addUserInDB = async (userId) => {
    let lockKey = 'currentLeader';
    let lockValue = Date.now().toString();
    try {
        const lock = await acquireLock(lockKey, lockValue);
        if (!lock) {
            console.log('Failed to acquire lock. Another node is updating the state.');
            return;
        }

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
    } finally {
        // Release the distributed lock
        await releaseLock(lockKey, lockValue);
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

const fetchDrawing = async () => {
    try {
        const drawing = await Drawing.find({});
        return drawing;
    } catch (err) {
        console.error('Error fetching drawing:', err.message);
        return [];
    }
};

const removeUser = async (userId) => {
    let lockKey = 'currentLeader';
    let lockValue = Date.now().toString();
    try {
        const lock = await acquireLock(lockKey, lockValue);
        if (!lock) {
            console.log('Failed to acquire lock. Another node is updating the state.');
            return;
        }

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
    } finally {
        // Release the distributed lock
        await releaseLock(lockKey, lockValue);
    }
};


const updateDrawingState = async (socket, data) => {
    const lockKey = 'drawingLock';
    const lockValue = Date.now().toString();
    try {
        // Acquire distributed lock
        const lockAcquired = await acquireLock(lockKey, lockValue);
        if (!lockAcquired) {
            console.log('Failed to acquire lock. Another node is updating the state.');
            return;
        }

        // Perform the drawing update
        const newDrawing = new Drawing(data);
        await newDrawing.save();

        // Broadcast the update to other clients
        io.emit('draw', data);

        // console.log('Drawing updated successfully.');
        return { success: true };

    } catch (err) {
        console.error('Error updating drawing state:', err.message);
    } finally {
        // Release the distributed lock
        releaseLock(lockKey, lockValue);
    }
}

const clearDrawingState = async (socket) => {
    const lockKey = 'drawingLock';
    const lockValue = Date.now().toString();
    try {
        // Acquire distributed lock
        const lockAcquired = await acquireLock(lockKey, lockValue);
        if (!lockAcquired) {
            console.log('Failed to acquire lock. Another node is updating the state.');
            return;
        }

        await clearDrawingCollection();

        console.log('Received clearCanvas from:', socket.id);
        io.emit('clearCanvas');

        return { success: true };

    } catch (err) {
        console.error('Error clearing canvas:', err.message);
    } finally {
        // Release the distributed lock
        releaseLock(lockKey, lockValue);
    }
}

const broadcastPeriodicUpdates = async () => {
    try {
        // Fetch the latest drawing state from the database
        const drawingUpdates = await fetchDrawing();
        if (drawingUpdates.length > 0) {
            // Emit the updates to all connected clients
            io.emit('periodicUpdate', drawingUpdates);
            // console.log('Broadcasted periodic updates:', drawingUpdates.length, 'items.');
        }
    } catch (err) {
        console.error('Error broadcasting periodic updates:', err.message);
    }
};

// Start the periodic broadcast when the server starts
setInterval(broadcastPeriodicUpdates, 5000);

// WebSocket logic
io.on('connection', async (socket) => {
    console.log('User connected:', socket.id);

    try {
        // clearDrawingCollection();
        // clearUsersCollection();

        let users = await addUserInDB(socket.id);
        io.emit('userJoinedSuccess', { success: true, user_id: socket.id });
        io.emit('allActiveUsers', users);
        const existingData = await fetchDrawing();
        io.to(socket.id).emit('initialData', existingData);

        socket.on('draw', async (data) => {
            await updateDrawingState(socket, data);
        });

        socket.on('clearCanvas', async () => {
            await clearDrawingState(socket);
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            let users = removeUser(socket.id);
            io.emit('userDisconnected', users);
        });
    } catch (error) {
        console.error('Error:', error);
    }
});

server.listen(process.env.SERVER_PORT, () => {
    process.on('SIGINT', () => {
        console.log('Server is shutting down. Bye!');
        process.exit();
    });
    console.log(`Server running on http://localhost:${process.env.SERVER_PORT}`);
});
