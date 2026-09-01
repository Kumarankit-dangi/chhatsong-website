import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getDatabase, ref, push, onValue, onDisconnect, set, remove } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDYZFCorRFRMy9TWEiTMp8AAc7IHTlB4ME',
  authDomain: 'chhath-song-b5e61.firebaseapp.com',
  databaseURL: 'https://chhath-song-b5e61-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'chhath-song-b5e61',
  appId: '1:420844144157:web:28ca6a38f2e2772038e8f4'
};

const liveUsers = document.getElementById('liveUsers');
const pageKey = document.body.dataset.pageKey || location.pathname.replace(/\//g, '').replace(/\.html$/, '') || 'home';
const isRootPage = ['/', '/index.html', '/chhatsong-website/', '/chhatsong-website/index.html'].includes(location.pathname);
const isSiteTotalPage = isRootPage || pageKey === 'chhath';
const liveStorageKey = `chhatsong-live-count-${isSiteTotalPage ? 'site-total' : pageKey}`;
const liveChannelName = `chhatsong-live-channel-${isSiteTotalPage ? 'site-total' : pageKey}`;
const sessionId = (crypto && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

function renderCount(count) {
  const safeCount = Number.isFinite(Number(count)) ? Math.max(1, Number(count)) : 1;
  if (!liveUsers) return;
  liveUsers.textContent = `${safeCount} live`;
}

function countLiveSessions(data) {
  if (!data || typeof data !== 'object') return 0;

  let total = 0;
  Object.values(data).forEach((pageData) => {
    if (!pageData || typeof pageData !== 'object') return;
    total += Object.keys(pageData).length;
  });

  return total || 1;
}

function setFallbackCount(count) {
  try {
    const normalized = Math.max(1, Number(count) || 1);
    localStorage.setItem(liveStorageKey, String(normalized));
  } catch (error) {
    console.warn('Unable to store live count fallback:', error);
  }

  if ('BroadcastChannel' in window) {
    const ch = new BroadcastChannel(liveChannelName);
    ch.postMessage({ count: Math.max(1, Number(count) || 1) });
    ch.close();
  }
}

function getFallbackCount() {
  try {
    const saved = Number(localStorage.getItem(liveStorageKey) || 1);
    return Number.isFinite(saved) ? Math.max(1, saved) : 1;
  } catch (error) {
    return 1;
  }
}

try {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const database = getDatabase(app);
  const presenceRef = ref(database, isSiteTotalPage ? 'presence' : `presence/${pageKey}`);

  onValue(presenceRef, (snapshot) => {
    if (isSiteTotalPage) {
      const data = snapshot.val() || {};
      const total = countLiveSessions(data);
      renderCount(total);
      setFallbackCount(total);
      return;
    }

    const data = snapshot.val() || {};
    const count = snapshot.exists() ? Object.keys(data).length || 1 : 1;
    renderCount(count);
    setFallbackCount(count);
  }, () => {
    renderCount(getFallbackCount());
  });

  signInAnonymously(auth).then(() => {
    const sessionRef = ref(database, `presence/${pageKey}/${sessionId}`);
    const connectedRef = ref(database, '.info/connected');

    onValue(connectedRef, (connectedSnap) => {
      if (connectedSnap.val() !== true) return;

      set(sessionRef, { online: true, connectedAt: Date.now() }).then(() => {
        onDisconnect(sessionRef).remove().catch(() => {});
      }).catch((error) => {
        console.error('Firebase presence error:', error);
        renderCount(getFallbackCount());
      });
    });

    const dropConnection = () => {
      remove(sessionRef).catch(() => {});
    };

    window.addEventListener('pagehide', dropConnection);
  }).catch((error) => {
    console.error('Firebase presence error:', error);
    renderCount(getFallbackCount());
  });
} catch (error) {
  console.error('Firebase init error:', error);
  renderCount(getFallbackCount());
}

if ('BroadcastChannel' in window) {
  const channel = new BroadcastChannel(liveChannelName);
  channel.onmessage = (event) => {
    const count = Number(event.data?.count || getFallbackCount());
    renderCount(count);
  };
}
