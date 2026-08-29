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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const presenceRef = ref(database, 'presence');

function renderCount(count) {
  if (!liveUsers) return;
  liveUsers.textContent = `${count} live`;
}

onValue(presenceRef, (snapshot) => {
  renderCount(snapshot.exists() ? snapshot.size : 0);
}, () => {
  if (liveUsers) liveUsers.textContent = 'offline';
});

signInAnonymously(auth).then(({ user }) => {
  const userRef = ref(database, `presence/${user.uid}`);
  const connectionRef = push(userRef);
  const connectedRef = ref(database, '.info/connected');

  onValue(connectedRef, (connectedSnap) => {
    if (connectedSnap.val() !== true) return;

    onDisconnect(connectionRef).remove().then(() => {
      return set(connectionRef, true);
    }).catch((error) => {
      console.error('Firebase presence error:', error);
    });
  });

  const dropConnection = () => {
    remove(connectionRef).catch(() => {});
  };

  window.addEventListener('pagehide', dropConnection);
}).catch((error) => {
  console.error('Firebase presence error:', error);
  if (liveUsers) liveUsers.textContent = 'offline';
});
