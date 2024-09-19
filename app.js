let peerConnection;
const iceCandidates = [];

// Функция логирования
function logMessage(message) {
    const logArea = document.getElementById('log-area');
    logArea.value += message + '\n';
    logArea.scrollTop = logArea.scrollHeight;
}

// ICE Server configuration
const config = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },  // Google STUN
        { urls: "stun:stun1.l.google.com:19302" }, // Google STUN #2
        { urls: "stun:stun2.l.google.com:19302" }, // Google STUN #3
        { urls: "stun:stun3.l.google.com:19302" }, // Google STUN #4
        { urls: "stun:stun4.l.google.com:19302" }, // Google STUN #5

        { urls: "stun:stun.ekiga.net" },            // Ekiga
        { urls: "stun:stun.freeswitch.org" },       // FreeSwitch
        { urls: "stun:stun.ideasip.com" },          // IdeaSIP
        { urls: "stun:stun.sipnet.net" },           // Sipnet
        { urls: "stun:stun.iptel.org" },            // Iptel
        { urls: "stun:stun.voipbuster.com" },       // Voipbuster
        { urls: "stun:stun.counterpath.com" },      // Counterpath
        { urls: "stun:stun.server.org" },           // General STUN Server
        { urls: "stun:stun.softjoys.com" },         // Softjoys
        { urls: "stun:stun.voxgratia.org" },        // Voxgratia

        { urls: "stun:stun.stunprotocol.org:3478" }, // STUN Protocol
        { urls: "stun:stun.sipgate.net" },          // Sipgate
        { urls: "stun:stun.sipgate.net:10000" },    // Sipgate port 10000
        { urls: "stun:stun.t-online.de:3478" },     // T-online

        // TURN-серверы (TURN часто работает лучше, но медленнее из-за маршрутизации)
        {
            urls: 'turn:turn.anyfirewall.com:443?transport=tcp',
            credential: 'webrtc',
            username: 'webrtc'
        },
        {
            urls: 'turn:numb.viagenie.ca',
            credential: 'webrtc',
            username: 'guest'
        },
        {
            urls: 'turn:relay.backups.cz',
            credential: 'webrtc',
            username: 'webrtc'
        }
    ]
};

document.addEventListener("DOMContentLoaded", () => {
    const roleSelection = document.getElementById("role-selection");
    const connectionCard = document.getElementById("connection-card");
    const hostFields = document.getElementById("host-fields");
    const guestFields = document.getElementById("guest-fields");
    const roleTitle = document.getElementById("role-title");

    const hostBtn = document.getElementById("host-btn");
    const guestBtn = document.getElementById("guest-btn");

    const generateOfferBtn = document.getElementById("generate-offer-btn");
    const connectHostBtn = document.getElementById("connect-host-btn");
    const generateAnswerBtn = document.getElementById("generate-answer-btn");
    const connectGuestBtn = document.getElementById("connect-guest-btn");

    const hostOfferTextarea = document.getElementById("host-offer");
    const guestAnswerTextarea = document.getElementById("guest-answer");
    const hostOfferInput = document.getElementById("host-offer-input");
    const guestAnswerOutput = document.getElementById("guest-answer-output");

    const iceTextarea = document.getElementById("ice-candidate");
    const addIceBtn = document.getElementById("add-ice-btn");

    // Role selection
    hostBtn.addEventListener("click", () => {
        roleSelection.classList.add("hidden");
        connectionCard.classList.remove("hidden");
        hostFields.classList.remove("hidden");
        roleTitle.textContent = "Role: Host";
        createPeerConnection();
        generateOfferBtn.disabled = false;  // Активируем кнопку генерации offer
        logMessage("Host: Ready to generate offer.");
    });

    guestBtn.addEventListener("click", () => {
        roleSelection.classList.add("hidden");
        connectionCard.classList.remove("hidden");
        guestFields.classList.remove("hidden");
        roleTitle.textContent = "Role: Guest";
        createPeerConnection();
        hostOfferInput.disabled = false;  // Активируем поле для ввода offer от хоста
        logMessage("Guest: Waiting for host's offer.");

        // Проверяем, заполнено ли поле hostOfferInput и активируем кнопку Generate Answer
        hostOfferInput.addEventListener('input', () => {
            const hostOfferValue = hostOfferInput.value.trim();  // Убираем лишние пробелы для точной проверки
            try {
                // Проверяем, является ли содержимое корректным JSON
                JSON.parse(hostOfferValue);
                if (hostOfferValue !== "") {
                    generateAnswerBtn.disabled = false;  // Активируем кнопку генерации answer
                    logMessage("Guest: Host's offer received. Ready to generate answer.");
                } else {
                    generateAnswerBtn.disabled = true;  // Блокируем кнопку, если поле пустое
                }
            } catch (e) {
                generateAnswerBtn.disabled = true;  // Если JSON некорректный, блокируем кнопку
                logMessage("Guest: Invalid offer. Please provide valid JSON.");
            }
        });
    });

    // Host generates an offer
    generateOfferBtn.addEventListener("click", async () => {
        try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            hostOfferTextarea.value = JSON.stringify(offer);
            logMessage("Host: Offer generated and set as local description.");
            guestAnswerTextarea.disabled = false;  // Активируем поле для ввода answer от гостя
            connectHostBtn.disabled = false;  // Активируем кнопку Connect Host
        } catch (error) {
            logMessage("Host: Error generating offer: " + error);
        }
    });

    // Host connects after receiving the guest's answer
    connectHostBtn.addEventListener("click", async () => {
        const guestAnswerValue = guestAnswerTextarea.value.trim();
        if (guestAnswerValue === "") {
            logMessage("Host: Please provide the guest's answer.");
            return;
        }
        try {
            const guestAnswer = JSON.parse(guestAnswerValue);
            await peerConnection.setRemoteDescription(guestAnswer);
            logMessage("Host: Remote description (answer) set successfully.");
            logMessage("Host: Waiting for ICE candidates...");
            addIceBtn.disabled = false;  // Активируем возможность добавления ICE кандидатов
        } catch (error) {
            logMessage("Host: Error setting remote description (answer): " + error);
        }
    });

    // Guest generates an answer based on host's offer
    generateAnswerBtn.addEventListener("click", async () => {
        const hostOfferValue = hostOfferInput.value.trim();
        if (hostOfferValue === "") {
            logMessage("Guest: Please provide the host's offer.");
            return;
        }
        try {
            const hostOffer = JSON.parse(hostOfferValue);
            await peerConnection.setRemoteDescription(hostOffer);
            logMessage("Guest: Offer received and set as remote description.");

            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            guestAnswerOutput.value = JSON.stringify(answer);
            logMessage("Guest: Answer generated and set as local description.");
            logMessage("Guest: Waiting for ICE candidates...");
            connectGuestBtn.disabled = false;  // Активируем кнопку Connect Guest
        } catch (error) {
            logMessage("Guest: Error generating answer: " + error);
        }
    });

    // Guest connects after generating the answer
    connectGuestBtn.addEventListener("click", () => {
        logMessage("Guest is connecting...");
        addIceBtn.disabled = false;  // Активируем возможность добавления ICE кандидатов
    });

    // ICE Candidate exchange
    addIceBtn.addEventListener("click", () => {
        const iceCandidateValue = iceTextarea.value.trim();
        if (iceCandidateValue === "") {
            logMessage("Please provide an ICE candidate.");
            return;
        }
        try {
            const iceCandidate = JSON.parse(iceCandidateValue);
            peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate))
                .then(() => logMessage("Successfully added ICE candidate"))
                .catch(e => logMessage("Error adding ICE candidate: " + e));
        } catch (error) {
            logMessage("Error parsing or adding ICE candidate: " + error);
        }
    });

    // Создание PeerConnection и генерация ICE-кандидатов
    function createPeerConnection() {
        peerConnection = new RTCPeerConnection(config);

        // Отслеживаем ICE-кандидаты
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                iceTextarea.value += JSON.stringify(event.candidate) + "\n";
                logMessage("Generated ICE candidate: " + JSON.stringify(event.candidate));
            } else {
                logMessage("All ICE candidates have been generated.");
            }
        };

        // Ловим ошибки ICE-соединения
        peerConnection.oniceconnectionstatechange = () => {
            logMessage("ICE connection state: " + peerConnection.iceConnectionState);
            if (peerConnection.iceConnectionState === 'connected') {
                logMessage("ICE connection established successfully.");
            } else if (peerConnection.iceConnectionState === 'failed') {
                logMessage("ICE connection failed. Check STUN/TURN servers.");
            } else if (peerConnection.iceConnectionState === 'disconnected') {
                logMessage("ICE connection disconnected.");
            }
        };

        // Ловим ошибки глобализации ICE
        peerConnection.onicegatheringstatechange = () => {
            logMessage("ICE gathering state: " + peerConnection.iceGatheringState);
            if (peerConnection.iceGatheringState === "complete") {
                logMessage("ICE gathering is complete.");
            }
        };

        logMessage("PeerConnection created.");
    }
});
