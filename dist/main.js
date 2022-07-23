const tAPI = window.__TAURI__;

// An enum of DB keys
const DB_KEY = {
    ActiveCollarServer: 'active_collar_server'
}
Object.freeze(DB_KEY);

// Active globals
let strServer = '';

// DOM caching
const domStatus = document.getElementById('status');
const domMode = document.getElementById("toyMode");
const domLevel = document.getElementById('toyLevel');
const domLevelTitle = document.getElementById('toyLevelTitle');
const domDuration = document.getElementById('toyDuration');
const domDurationTitle = document.getElementById('toyDurationTitle');

domLevel.onchange = () => {
    domLevelTitle.innerText = 'Strength: ' + domLevel.value;
}

domDuration.onchange = () => {
    const nDur = Number(domDuration.value);
    domDurationTitle.innerText = 'Duration: ' + (nDur >= 1000 ? (nDur / 1000).toFixed(1) + 's' : nDur + 'ms');
}

// Initialise the interface on load
function init() {
    // Load any default values and refresh UI
    domLevelTitle.innerText = 'Strength: ' + domLevel.value;
    const nDur = Number(domDuration.value);
    domDurationTitle.innerText = 'Duration: ' + (nDur >= 1000 ? (nDur / 1000).toFixed(1) + 's' : nDur + 'ms');
    // Now load any persistant states from disk (otherwise, their defaults)
    strServer = localStorage.getItem(DB_KEY.ActiveCollarServer) || strServer;
    // If a server is loaded, connect automatically!
    connect();
}

// Set the current Colla.rs server
function setServer() {
    const strNewServer = prompt('Paste the WebSocket URL of a Colla.rs server! (e.g; ws://...)', strServer);
    // Minor sanity checks
    if (!strNewServer || strServer === strNewServer) return;
    if (!strNewServer.startsWith('ws://') && !strNewServer.startsWith('wss://')) {
        return alert('Invalid WebSocket URL!');
    }
    // Set the server
    const fFirstServer = strServer.length === 0;
    strServer = strNewServer;
    localStorage.setItem(DB_KEY.ActiveCollarServer, strServer);
    // If no prior server was set: we can try to automatically connect
    if (fFirstServer)
        connect();
    else
        alert('You may need to restart to connect to the new collar!');
        // ... TODO: allow 'swapping' and/or reconnecting to collar servers, the backend is incapable of this atm.
}

// Attempt to connect to a Colla.rs server
function connect() {
    if (!strServer) return;
    tAPI.invoke('collar_connect', { server: strServer }).then(() => {
        setStatus('Connected!', 'black');
    })
    .catch(err => {
        setStatus('ERROR: Connection Errored Out!', 'red');
    });
}

// Execute the current remote configuration on the Colla.rs server
function execute() {
    if (!strServer) return;
    // Run the collar command
    tAPI.invoke('collar_run', { mode: domMode.value, level: Number(domLevel.value), duration: Number(domDuration.value) }).then(() => {
        // Await for any immediate collar reply
        tAPI.invoke('collar_read').then(strRet => {
            const cRes = JSON.parse(strRet);
            const fIssue = cRes.petActionRequired !== null;

            // Decide the formatting and colour based on success/failure
            setStatus((fIssue ?
                (cRes.message + ' (' + cRes.petActionRequired + ')') : (domMode.selectedOptions[0].innerText + ' successful!')
            ), fIssue ? 'red' : 'black');
        })
        .catch(err => {
            setStatus('ERROR: Socket Errored Out!', 'red');
        });
    })
    .catch(err => {
        setStatus('ERROR: Socket Errored Out!', 'red');
    });
}

function setStatus(strMsg, strColour) {
    domStatus.innerText = strMsg;
    domStatus.style.color = strColour;
}

init();