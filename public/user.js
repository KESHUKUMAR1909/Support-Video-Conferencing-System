const socket = io();
let pc;
let roomId;

const shareBtn = document.getElementById("shareBtn");
const localVideo = document.getElementById("localVideo");
const roomText = document.getElementById("roomText");

shareBtn.onclick = async () => {
    // Step 1: Request support → get room ID
    socket.emit("request-support");

    socket.on("support-room", async (id) => {
        roomId = id;
        roomText.innerText = `Room ID: ${roomId}`;

        // Step 2: Capture screen
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        localVideo.srcObject = stream;

        // Step 3: Setup PeerConnection
        pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.onicecandidate = (event) => {
            if(event.candidate){
                socket.emit("ice-candidate", { roomId, candidate: event.candidate });
            }
        };

        // Step 4: When support joins → create offer
        socket.on("support-joined", async () => {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("offer", { roomId, sdp: offer });
        });

        // Receive answer from support
        socket.on("answer", async ({ sdp }) => {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        });

        // Receive ICE candidates from support
        socket.on("ice-candidate", async ({ candidate }) => {
            try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
            catch(err){ console.error(err); }
        });
    });
};
