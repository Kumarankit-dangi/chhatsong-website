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
const normalizedPath = (location.pathname || '/').replace(/\/+$/, '') || '/';
const isRootPage = ['','/','/index.html','/chhatsong-website','/chhatsong-website/index.html'].includes(normalizedPath);
const isSiteTotalPage = true;
const liveStorageKey = `chhatsong-live-count-site-total`;
const liveChannelName = `chhatsong-live-channel-site-total`;
const sessionId = (crypto && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

function renderCount(count) {
  const safeCount = Number.isFinite(Number(count)) ? Math.max(0, Number(count)) : 0;
  if (!liveUsers) return;
  liveUsers.textContent = `${safeCount} live users`;
}

function countLiveSessions(data) {
  if (!data || typeof data !== 'object') return 0;

  const values = Object.values(data);
  if (!values.length) return 0;

  const looksLikePageMap = values.some((value) => value && typeof value === 'object' && !Array.isArray(value) && Object.values(value).some((nested) => nested && typeof nested === 'object'));

  if (looksLikePageMap) {
    let total = 0;
    Object.values(data).forEach((pageData) => {
      if (!pageData || typeof pageData !== 'object') return;
      total += Object.keys(pageData).length;
    });
    return total;
  }

  return Object.keys(data).length;
}

function setFallbackCount(count) {
  try {
    const normalized = Math.max(0, Number(count) || 0);
    localStorage.setItem(liveStorageKey, String(normalized));
  } catch (error) {
    console.warn('Unable to store live count fallback:', error);
  }

  if ('BroadcastChannel' in window) {
    const ch = new BroadcastChannel(liveChannelName);
    ch.postMessage({ count: Math.max(0, Number(count) || 0) });
    ch.close();
  }
}

function getFallbackCount() {
  try {
    const saved = Number(localStorage.getItem(liveStorageKey) || 0);
    return Number.isFinite(saved) ? Math.max(0, saved) : 0;
  } catch (error) {
    return 0;
  }
}

try {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const database = getDatabase(app);
  const presenceRef = ref(database, 'presence/site-total');

  onValue(presenceRef, (snapshot) => {
    const data = snapshot.val() || {};
    const total = countLiveSessions(data);
    renderCount(total);
    setFallbackCount(total);
  }, () => {
    renderCount(getFallbackCount());
  });

  signInAnonymously(auth).then(() => {
    const sessionRef = ref(database, `presence/site-total/${sessionId}`);
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
