const liveStorageKey = 'chhatsong-live-count-site-total';
const liveChannelName = 'chhatsong-live-channel-site-total';
const pageKey = document.body?.dataset?.pageKey || location.pathname.replace(/\//g, '').replace(/\.html$/, '') || 'home';
const sessionId = (window.crypto && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

function getLiveUserNodes() {
  return Array.from(document.querySelectorAll('#liveUsers'));
}

function renderCount(count) {
  const safeCount = Number.isFinite(Number(count)) ? Math.max(0, Number(count)) : 0;
  const nodes = getLiveUserNodes();

  if (!nodes.length) return;

  const label = `${safeCount} live users`;
  nodes.forEach((node) => {
    node.textContent = label;
  });
}

function pruneSessionMap(map) {
  const now = Date.now();
  const nextMap = {};

  Object.entries(map || {}).forEach(([id, value]) => {
    if (!value || typeof value !== 'object') return;
    const lastSeen = Number(value.connectedAt || 0);
    if (!Number.isFinite(lastSeen) || now - lastSeen > 60000) return;
    nextMap[id] = { ...value, connectedAt: lastSeen, pageKey: value.pageKey || pageKey };
  });

  return nextMap;
}

function readSessionMap() {
  try {
    const raw = localStorage.getItem(liveStorageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return pruneSessionMap(parsed && typeof parsed === 'object' ? parsed : {});
  } catch (error) {
    return {};
  }
}

function writeSessionMap(map) {
  try {
    const normalized = pruneSessionMap(map);
    localStorage.setItem(liveStorageKey, JSON.stringify(normalized));
    return Object.keys(normalized).length;
  } catch (error) {
    return 0;
  }
}

function setFallbackCount(count) {
  const normalized = Math.max(0, Number(count) || 0);
  try {
    localStorage.setItem(liveStorageKey, JSON.stringify(pruneSessionMap(readSessionMap())));
  } catch (error) {
    // ignore storage issues
  }

  if ('BroadcastChannel' in window) {
    try {
      const ch = new BroadcastChannel(liveChannelName);
      ch.postMessage({ count: normalized });
      ch.close();
    } catch (error) {
      // ignore broadcast issues
    }
  }
}

function getFallbackCount() {
  const map = readSessionMap();
  return Object.keys(map).length;
}

function registerLocalSession() {
  const map = readSessionMap();
  map[sessionId] = { sessionId, pageKey, connectedAt: Date.now() };
  const total = writeSessionMap(map);
  renderCount(total);
  setFallbackCount(total);
}

function unregisterLocalSession() {
  const map = readSessionMap();
  delete map[sessionId];
  const total = writeSessionMap(map);
  renderCount(total);
  setFallbackCount(total);
}

function attachCleanupHandlers() {
  const cleanup = () => {
    unregisterLocalSession();
  };

  window.addEventListener('pagehide', cleanup, { once: true });
  window.addEventListener('beforeunload', cleanup, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') cleanup();
  });
}

function syncFromStorage() {
  renderCount(getFallbackCount());
}

if ('BroadcastChannel' in window) {
  const channel = new BroadcastChannel(liveChannelName);
  channel.onmessage = (event) => {
    const count = Number(event.data?.count ?? getFallbackCount());
    renderCount(count);
  };
}

window.addEventListener('storage', (event) => {
  if (event.key === liveStorageKey) {
    syncFromStorage();
  }
});

registerLocalSession();
attachCleanupHandlers();

try {
  const firebaseModule = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
  const authModule = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
  const dbModule = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');

  const firebaseConfig = {
    apiKey: 'AIzaSyDYZFCorRFRMy9TWEiTMp8AAc7IHTlB4ME',
    authDomain: 'chhath-song-b5e61.firebaseapp.com',
    databaseURL: 'https://chhath-song-b5e61-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'chhath-song-b5e61',
    appId: '1:420844144157:web:28ca6a38f2e2772038e8f4'
  };

  const app = firebaseModule.initializeApp(firebaseConfig);
  const auth = authModule.getAuth(app);
  const database = dbModule.getDatabase(app);
  const presenceRef = dbModule.ref(database, 'presence/site-total');

  dbModule.onValue(presenceRef, (snapshot) => {
    const data = snapshot.val() || {};
    const total = Object.keys(data).length || getFallbackCount();
    renderCount(total);
    setFallbackCount(total);
  }, () => {
    syncFromStorage();
  });

  authModule.signInAnonymously(auth).then(() => {
    const sessionRef = dbModule.ref(database, `presence/site-total/${sessionId}`);
    const connectedRef = dbModule.ref(database, '.info/connected');

    dbModule.onValue(connectedRef, (connectedSnap) => {
      if (connectedSnap.val() !== true) return;

      dbModule.set(sessionRef, { online: true, pageKey, connectedAt: Date.now() }).then(() => {
        dbModule.onDisconnect(sessionRef).remove().catch(() => {});
      }).catch(() => {
        syncFromStorage();
      });
    });
  }).catch(() => {
    syncFromStorage();
  });
} catch (error) {
  syncFromStorage();
}
