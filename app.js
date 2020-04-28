//настройки из firebase
firebase.initializeApp({
	apiKey: "AIzaSyByGiHYTSXajrLdspVr6_gdG0b5waEMzUg",
	authDomain: "chat-283a9.firebaseapp.com",
	databaseURL: "https://chat-283a9.firebaseio.com",
	projectId: "chat-283a9",
	storageBucket: "chat-283a9.appspot.com",
	messagingSenderId: "790014366633",
	appId: "1:790014366633:web:7308b8b1e5bee838642ab8"
});

const config = {
	'iceServers': [
		{
			urls:
				[
					'stun:stun1.l.google.com:19302',
					'stun:stun2.l.google.com:19302',
				],
		}
	]
}
let pc = new window.RTCPeerConnection(config);

let stream;
let remoteStream;
const database = firebase.database().ref(),
	userId = 'user' + new Date().getTime(),
	localVideo = document.getElementById('your'),
	remoteVideo = document.getElementById('user');

const callButton = document.querySelector('#callButton');
const videoConnect = document.querySelector('#videoConnect');
const hangupButton = document.querySelector('button#hangupButton');

hangupButton.onclick = hangup;
callButton.onclick = call;

database.on('child_added', read);

pc.ontrack = function (e) {
	remoteVideo.srcObject = e.streams[0];
	console.log('on stream', e.streams[0]);

};

pc.onicecandidate = function (e) {
	if (e.candidate) send(userId, JSON.stringify({ 'ice': e.candidate }));
};

function read(e) {
	var message = JSON.parse(e.val().message),
		sender = e.val().sender;

	if (sender !== userId) {
		if (message.ice != undefined) pc.addIceCandidate(new RTCIceCandidate(message.ice))
		else {
			switch (message.sdp.type) {
				case 'offer':
					pc.setRemoteDescription(new RTCSessionDescription(message.sdp))
						.then(() => pc.createAnswer())
						.then(answer => pc.setLocalDescription(answer))
						.then(() => send(userId, JSON.stringify({ 'sdp': pc.localDescription })))
						.catch(e => console.log(e));
					break;
				case 'answer':
					pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
					break;
				default: break;
			}
		}

	}
}

function send(senderId, data) {
	var message = database.push({
		sender: senderId,
		message: data
	});

	message.remove();
}

async function call() {
	//если звонок был завершен через hangup
	if (pc.signalingState === 'closed') {
		pc = new window.RTCPeerConnection(config);
		console.log('new pc')
	}

	//функция, которая использует getUserMedia () для получения потока с камеры и микрофона пользователя,
	//а затем добавляет каждую дорожку из потока в одноранговое соединение без указания потока для каждой дорожки
	stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
	for (const track of stream.getTracks()) {
		pc.addTrack(track, stream);
	}

	registerPeerConnectionListeners();

	localVideo.srcObject = stream;
	localStream = stream;
	console.log('Stream:', localVideo.srcObject);

	let remoteStream = null;

	pc.ontrack = ev => {
		if (ev.streams && ev.streams[0]) {
			remoteVideo.srcObject = ev.streams[0];
			console.log('pc2 received remote stream:', remoteVideo.srcObject);
		} else {
			if (!remoteStream) {
				remoteStream = new MediaStream();
				remoteVideo.srcObject = remoteStream;
				console.log(remoteStream);
			}

			console.log('Add a track to the remoteStream:', ev.track);
			remoteStream.addTrack(ev.track);
		}

	}

	pc.createOffer({ 'mandatory': { 'OfferToReceiveAudio': true, 'OfferToReceiveVideo': true } }).then(function (offer) {
		return pc.setLocalDescription(offer);
	})
		.then(function () {
			send(userId, JSON.stringify({
				'sdp': pc.localDescription
			}));
		})
		.catch(function (reason) {
			console.log(reason)
		});

	videoConnect.style.display = 'none';
	hangupButton.style.display = 'block';
}

function registerPeerConnectionListeners() {
	pc.addEventListener('icegatheringstatechange', () => {
		console.log(
			`ICE gathering state changed: ${pc.iceGatheringState}`);
	});

	pc.addEventListener('connectionstatechange', () => {
		console.log(`Connection state change: ${pc.connectionState}`);
	});

	pc.addEventListener('signalingstatechange', () => {
		console.log(`Signaling state change: ${pc.signalingState}`);
	});

	pc.addEventListener('iceconnectionstatechange ', () => {
		console.log(
			`ICE connection state change: ${pc.iceConnectionState}`);
	});
}

function hangup() {
	console.log('Ending call');
	localStream.getTracks().forEach(track => track.stop());
	pc.close();

	videoConnect.style.display = 'block';
	hangupButton.style.display = 'none';

	registerPeerConnectionListeners();
	pc = new window.RTCPeerConnection(config);
}

const muteAudioButton = document.querySelector('button#muteAudioButton');
muteAudioButton.onclick = muteAudio;
let mAudio = 1;
function muteAudio() {
	if (mAudio === 1) {
		localStream.getAudioTracks()[0].enabled = false;
		mAudio = 0;
		console.log('Mute audio');
		muteAudioButton.classList.add('video__btn-active');
	} else {
		localStream.getAudioTracks()[0].enabled = true;
		mAudio = 1;
		console.log('Unmute audio');
		muteAudioButton.classList.remove('video__btn-active');
	}

}

const muteVideoButton = document.querySelector('button#muteVideoButton');
muteVideoButton.onclick = muteVideo;
let mVideo = 1;
function muteVideo() {
	if (mVideo === 1) {
		localStream.getVideoTracks()[0].enabled = false;
		mVideo = 0;
		console.log('Mute video');
		muteVideoButton.classList.add('video__btn-active');
	} else {
		localStream.getVideoTracks()[0].enabled = true;
		mVideo = 1;
		console.log('Unmute video');
		muteVideoButton.classList.remove('video__btn-active');
	}

}

const fullscreenButton = document.querySelector('button#fullscreenButton');
const elem = document.getElementById("videos");
fullscreenButton.onclick = toggleFull;

function cancelFullScreen(el) {
	var requestMethod = el.cancelFullScreen || el.webkitCancelFullScreen || el.mozCancelFullScreen || el.exitFullscreen;
	if (requestMethod) {
		requestMethod.call(el);
	} else if (typeof window.ActiveXObject !== "undefined") {
		var wscript = new ActiveXObject("WScript.Shell");
		if (wscript !== null) {
			wscript.SendKeys("{F11}");
		}
	}
}

function requestFullScreen(el) {
	var requestMethod = el.requestFullScreen || el.webkitRequestFullScreen || el.mozRequestFullScreen ||
		el.msRequestFullscreen;

	if (requestMethod) {
		requestMethod.call(el);
	} else if (typeof window.ActiveXObject !== "undefined") {
		var wscript = new ActiveXObject("WScript.Shell");
		if (wscript !== null) {
			wscript.SendKeys("{F11}");
		}
	}
	return false
}

function toggleFull() {
	var elem = document.body;
	var isInFullScreen = (document.fullScreenElement && document.fullScreenElement !== null) || (document.mozFullScreen ||
		document.webkitIsFullScreen);

	if (isInFullScreen) {
		cancelFullScreen(document);
	} else {
		requestFullScreen(elem);
	}
	return false;
}