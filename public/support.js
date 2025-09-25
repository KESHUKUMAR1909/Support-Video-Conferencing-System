const socket = io();
let pc;

const joinBtn = document.getElementById("joinBtn");
const roomInput = document.getElementById("roomInput");
const remoteVideo = document.getElementById("remoteVideo");

joinBtn.onclick = async () => {
    const roomId = roomInput.value.trim();
    if(!roomId) return alert("Enter Room ID");

    socket.emit("join-room", roomId);

    pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

    pc.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    pc.onicecandidate = (event) => {
        if(event.candidate) socket.emit("ice-candidate", { roomId, candidate: event.candidate });
    };

    socket.on("offer", async ({ sdp }) => {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", { roomId, sdp: answer });
    });

    socket.on("ice-candidate", async ({ candidate }) => {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
        catch(err){ console.error(err); }
    });
};
