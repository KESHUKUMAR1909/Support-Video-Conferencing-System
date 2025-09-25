const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public")); // serve HTML, JS, CSS

let activeRooms = []; // keep track of rooms

io.on('connection', (socket) => {
    console.log("User connected:", socket.id);

    // User requests support → create unique room
    socket.on("request-support", () => {
        const roomId = '_support_123';
        socket.join(roomId);
        activeRooms.push(roomId);
        socket.emit("support-room", roomId); // send roomId to user
        io.emit("active-rooms", activeRooms); // notify support of new room
        console.log(`Room created: ${roomId} by user ${socket.id}`);
    });

    // Support/Admin joins room
    socket.on("join-room", (roomId) => {
        socket.join(roomId);
        console.log(`Support/Admin joined room: ${roomId}`);
        socket.to(roomId).emit("support-joined"); // notify user
    });

    // WebRTC signaling
    socket.on("offer", ({roomId , sdp }) => {
        socket.to(roomId).emit("offer", {sdp, from: socket.id });
    });

    socket.on("answer", ({ roomId, sdp }) => {
        socket.to(roomId).emit("answer", { sdp, from: socket.id });
    });

    socket.on("ice-candidate", ({ roomId, candidate }) => {
        socket.to(roomId).emit("ice-candidate", { candidate, from: socket.id });
    });

    // Handle disconnect
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        // Optional: remove rooms if needed
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
