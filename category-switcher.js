(() => {
  const links = [
    ['chhath', '🪔 छठ पूजा', 'index.html'],
    ['navratri', '🔱 नवरात्रि', 'index.html?playlist=navratri'],
    ['bhojpuri', '🎵 भोजपुरी', 'bhojpuri.html'],
   
    ['haryanvi', '🎵 हरियाणवी', 'haryanvi.html'],
    ['punjabi', '🎵 पंजाबी', 'punjabi.html'],
    ['purane', '📼 पुराने गीत', 'purane.html'],
    ['jhadu-pocha', '🧹 झाड़ू-पोछा', 'jhadu-pocha.html'],
    ['papa', '📻 पापा के ज़माने के गाने', 'papa.html'],
    ['dil-ka-lafda', '💔 Dil Ka Lafda', 'dil-ka-lafda.html']
  ];

  const pageName = location.pathname.split('/').pop() || 'index.html';
  const query = new URLSearchParams(location.search);
  const current = pageName === 'index.html'
    ? (query.get('playlist') === 'navratri' ? 'navratri' : 'chhath')
    : pageName.replace(/\.html$/i, '');
  let target = document.querySelector('.playlist-switcher, .music-menu, .category-menu, .home-link');
  const floating = !target;
  if (!target) {
    target = document.createElement('div');
    target.className = 'site-category-anchor';
    document.body.prepend(target);
  }

  const currentCategory = links.find(([key]) => key === current);
  const wrapper = document.createElement('div');
  wrapper.className = 'site-category-switcher';
  if (floating) wrapper.classList.add('site-category-switcher--floating');
  wrapper.innerHTML = `
    <button class="site-category-switcher__button" type="button" aria-expanded="false" aria-haspopup="true">
      <span>${currentCategory?.[1] || '🎵 Categories'}</span><span class="site-category-switcher__arrow" aria-hidden="true">▾</span>
    </button>
    <div class="site-category-switcher__menu" role="menu">
      ${links.map(([key, label, href]) => `<a role="menuitem" href="${href}"${key === current ? ' aria-current="page"' : ''}>${label}</a>`).join('')}
    </div>`;
  target.replaceWith(wrapper);

  const button = wrapper.querySelector('button');
  const close = () => {
    wrapper.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
  };
  button.addEventListener('click', () => {
    const open = wrapper.classList.toggle('is-open');
    button.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', (event) => {
    if (!wrapper.contains(event.target)) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
})();
