// =============================================================================
// 💬 छठ पूजा लाइव चैट (Real-Time Firebase Realtime Database Chat)
// =============================================================================

const SYSTEM_WELCOME = '🙏 छठ पूजा की शुभकामनाएँ! अपने मन की भावना साझा करें।';

let rtdb = null;
let db = null;
let messagesRef = null;
let isListening = false;
const pendingQueue = [];
const seenMessageKeys = new Set();

/**
 * Safely add a chat message bubble to the chat container.
 * Uses textContent exclusively to sanitize and prevent XSS.
 * Enforces the latest 50 messages limit in the UI.
 */
function addMessageToUI(key, messageText, isUserMessage = true) {
  if (key && seenMessageKeys.has(key)) return;
  if (key) seenMessageKeys.add(key);

  const container = document.getElementById('chhathChatMessages');
  if (!container) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-message ${isUserMessage ? 'user' : 'system'}`;

  const bubbleSpan = document.createElement('span');
  bubbleSpan.className = 'chat-bubble';
  bubbleSpan.textContent = messageText;

  msgDiv.appendChild(bubbleSpan);
  container.appendChild(msgDiv);

  // Keep latest 50 user messages (+ 1 system welcome)
  const userMessages = container.querySelectorAll('.chat-message.user');
  if (userMessages.length > 50) {
    const removeCount = userMessages.length - 50;
    for (let i = 0; i < removeCount; i += 1) {
      userMessages[i].remove();
    }
  }

  container.scrollTop = container.scrollHeight;
}

/**
 * Send chat message to Firebase Realtime Database path: chhathChat/messages
 */
export function sendChatMessage(rawValue) {
  const trimmed = (rawValue || '').trim();
  if (!trimmed) return;

  // Maximum 200 characters limit
  const safeText = trimmed.slice(0, 200);

  const chatInput = document.getElementById('chatInput');
  if (chatInput) {
    chatInput.value = '';
    chatInput.focus();
  }

  if (rtdb && db && messagesRef) {
    pushToFirebase(safeText);
  } else {
    // Queue message if Firebase is still establishing connection
    pendingQueue.push(safeText);
  }
}

function pushToFirebase(text) {
  if (!messagesRef || !db) return;

  const timestamp = (typeof db.serverTimestamp === 'function')
    ? db.serverTimestamp()
    : Date.now();

  try {
    db.push(messagesRef, {
      text: text,
      timestamp: timestamp
    }).catch((err) => {
      console.error('Firebase Realtime Database write error:', err);
    });
  } catch (err) {
    console.error('Firebase push exception:', err);
  }
}

/**
 * Start Real-Time Firebase Realtime Database synchronization.
 * Listens for new messages in real time using onChildAdded.
 */
export function startFirebaseChatSync(database, dbModule) {
  if (isListening || !database || !dbModule) return;

  rtdb = database;
  db = dbModule;
  messagesRef = db.ref(rtdb, 'chhathChat/messages');

  let queryRef = messagesRef;
  if (typeof db.query === 'function' && typeof db.limitToLast === 'function') {
    if (typeof db.orderByKey === 'function') {
      queryRef = db.query(messagesRef, db.orderByKey(), db.limitToLast(50));
    } else {
      queryRef = db.query(messagesRef, db.limitToLast(50));
    }
  }

  isListening = true;

  // Flush any queued messages
  while (pendingQueue.length > 0) {
    const text = pendingQueue.shift();
    pushToFirebase(text);
  }

  // Real-time listener: onChildAdded fires for existing recent 50 messages on load,
  // and fires instantly whenever ANY user sends a message.
  db.onChildAdded(queryRef, (snapshot) => {
    const data = snapshot.val();
    if (data && typeof data.text === 'string' && data.text.trim()) {
      addMessageToUI(snapshot.key, data.text.trim(), true);
    }
  }, (error) => {
    console.warn('Realtime chat onChildAdded warning:', error);
  });
}

/**
 * Attach UI event listeners to Send button, Enter key, and quick messages.
 */
function setupChatEventListeners() {
  if (window.__chhathChatListenersAttached) return;

  const chatInput = document.getElementById('chatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');
  const quickButtons = document.querySelectorAll('.quick-message');

  if (!chatInput && !chatSendBtn && !quickButtons.length) return;
  window.__chhathChatListenersAttached = true;

  // 1. Send Button
  if (chatSendBtn) {
    chatSendBtn.addEventListener('click', () => {
      sendChatMessage(chatInput ? chatInput.value : '');
    });
  }

  // 2. Enter Key
  if (chatInput) {
    chatInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.keyCode === 13) {
        event.preventDefault();
        sendChatMessage(chatInput.value);
      }
    });
  }

  // 3. Quick Message Buttons
  quickButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const msg = btn.dataset.message || btn.textContent.trim();
      sendChatMessage(msg);
    });
  });
}

// -------------------------------------------------------------
// Initialization and Firebase handshake
// -------------------------------------------------------------
window.__initChhathChat = (database, dbModule) => {
  startFirebaseChatSync(database, dbModule);
};

function init() {
  setupChatEventListeners();

  if (window.__chhathFirebase) {
    startFirebaseChatSync(window.__chhathFirebase.database, window.__chhathFirebase.dbModule);
  } else {
    window.addEventListener('chhatsong:firebase-ready', (event) => {
      if (event.detail && event.detail.database && event.detail.dbModule) {
        startFirebaseChatSync(event.detail.database, event.detail.dbModule);
      }
    }, { once: true });
  }

  // Fallback: If presence.js takes longer than 1.5 seconds, connect directly
  setTimeout(async () => {
    if (isListening) return;

    try {
      const firebaseModule = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
      const dbModule = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');

      const firebaseConfig = {
        apiKey: 'AIzaSyDYZFCorRFRMy9TWEiTMp8AAc7IHTlB4ME',
        authDomain: 'chhath-song-b5e61.firebaseapp.com',
        databaseURL: 'https://chhath-song-b5e61-default-rtdb.asia-southeast1.firebasedatabase.app',
        projectId: 'chhath-song-b5e61',
        appId: '1:420844144157:web:28ca6a38f2e2772038e8f4'
      };

      const app = (firebaseModule.getApps && firebaseModule.getApps().length)
        ? firebaseModule.getApp()
        : firebaseModule.initializeApp(firebaseConfig);
      const database = dbModule.getDatabase(app);

      startFirebaseChatSync(database, dbModule);
    } catch (err) {
      console.warn('Fallback Firebase connect error:', err);
    }
  }, 1500);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
