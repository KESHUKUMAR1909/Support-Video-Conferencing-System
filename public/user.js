const socket = io();
let pc;
let roomId;

const shareBtn = document.getElementById("shareBtn");
const localVideo = document.getElementById("localVideo");
const roomText = document.getElementById("roomText");

// ---------------- Socket Event Listeners ----------------

// Receive room ID from server
socket.on("support-room", (id) => {
    roomId = id;
    roomText.innerText = `Room ID: ${roomId}`;
});

// When support/admin joins, create and send offer
socket.on("support-joined", async () => {
    if (!pc) return;
    try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", { roomId, sdp: offer });
    } catch (err) {
        console.error("Failed to create/send offer:", err);
    }
});

// Receive answer from support
socket.on("answer", async ({ sdp }) => {
    if (!pc) return;
    try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    } catch (err) {
        console.error("Failed to set remote description:", err);
    }
});

// Receive ICE candidates from support
socket.on("ice-candidate", async ({ candidate }) => {
    if (!pc) return;
    try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
        console.error("Failed to add ICE candidate:", err);
    }
});

// ---------------- Share Screen Button ----------------
shareBtn.onclick = async () => {
    try {
        // Step 1: Request support → get room ID
        socket.emit("request-support");

        // Step 2: Capture screen (mobile-friendly)
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });

        // Mobile autoplay fix
        localVideo.muted = true; 
        localVideo.srcObject = stream;
        await localVideo.play();

        // Step 3: Setup RTCPeerConnection
        pc = new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                // Optional: Add TURN server for mobile NAT traversal
                // { urls: "turn:YOUR_TURN_SERVER", username: "user", credential: "pass" }
            ]
        });

        // Add local tracks to peer connection
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // Send ICE candidates to server
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("ice-candidate", { roomId, candidate: event.candidate });
            }
        };

        alert("Screen sharing started. Waiting for support to join...");

    } catch (err) {
        console.error("Screen capture failed:", err);
        alert("Screen sharing is not supported on this device/browser.");
    }
};
