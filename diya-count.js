const diyaButton = document.getElementById('diyaLightBtn');
const diyaCount = document.getElementById('diyaCount');
const fallbackKey = 'chhatsong-diya-count';

function renderCount(value) {
  const count = Math.max(0, Math.floor(Number(value) || 0));
  if (diyaCount) diyaCount.innerHTML = `<strong>${count.toLocaleString('en-IN')}</strong>दीप जले`;
}

function pulseDiya() {
  if (!diyaButton) return;
  diyaButton.classList.remove('is-lit');
  void diyaButton.offsetWidth;
  diyaButton.classList.add('is-lit');
}

function updateFallbackCount() {
  const next = Math.max(0, Number(localStorage.getItem(fallbackKey) || 0)) + 1;
  localStorage.setItem(fallbackKey, String(next));
  renderCount(next);
}

if (diyaButton && diyaCount) {
  renderCount(localStorage.getItem(fallbackKey));

  diyaButton.addEventListener('click', () => {
    pulseDiya();

    const firebase = window.__chhathFirebase;
    if (!firebase) {
      updateFallbackCount();
      return;
    }

    const counterRef = firebase.dbModule.ref(firebase.database, 'diyaCount');
    firebase.dbModule.runTransaction(counterRef, (current) => Math.max(0, Number(current) || 0) + 1)
      .catch(() => updateFallbackCount());
  });

  window.addEventListener('chhatsong:firebase-ready', (event) => {
    const { database, dbModule } = event.detail || {};
    if (!database || !dbModule) return;
    const counterRef = dbModule.ref(database, 'diyaCount');
    dbModule.onValue(counterRef, (snapshot) => renderCount(snapshot.val()), () => renderCount(localStorage.getItem(fallbackKey)));
  }, { once: true });
}
