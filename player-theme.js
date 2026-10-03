(() => {
  const shell = document.querySelector('.player, .offer');
  const audio = document.getElementById('audio');
  const previous = document.getElementById('prev');
  const play = document.getElementById('play');
  const next = document.getElementById('next');
  const track = document.getElementById('track');
  const time = document.getElementById('time');
  const progress = document.getElementById('progressWrap') || document.getElementById('progress');
  if (!shell || !audio || !previous || !play || !next || !track || !time || !progress) return;

  const transport = document.createElement('div');
  transport.className = 'transport';
  [previous, play, next].forEach((button) => transport.appendChild(button));
  play.classList.add('main-control');

  const song = document.createElement('div');
  song.className = 'song';
  const songTop = document.createElement('div');
  songTop.className = 'song-top';
  songTop.append(track, time);

  let playState = document.getElementById('playState');
  if (!playState) {
    playState = document.createElement('span');
    playState.className = 'play-state';
    playState.id = 'playState';
    playState.innerHTML = '<i></i><span>रुका हुआ</span>';
  }
  songTop.insertBefore(playState, time);

  progress.classList.add('player-theme-progress-wrap');
  const progressTrack = progress.querySelector('.progress') || progress;
  progressTrack.classList.add('player-theme-progress');
  song.append(songTop, progress);

  const side = document.createElement('div');
  side.className = 'side-controls';
  const existingSide = shell.querySelector('.side-controls, .fm, .volume');
  if (existingSide) side.appendChild(existingSide);
  else side.textContent = 'MUSIC';

  shell.replaceChildren(transport, song, side);
  shell.classList.add('player-theme-ready');

  const statusText = playState.querySelector('span:last-child');
  const statusDot = playState.querySelector('i, .play-state-dot');
  const renderState = () => {
    const playing = !audio.paused;
    if (statusText) statusText.textContent = playing ? 'चल रहा है' : 'रुका हुआ';
    playState.classList.toggle('is-playing', playing);
    if (statusDot) statusDot.style.background = playing ? '#61b8ff' : '#ffbd4a';
  };
  audio.addEventListener('play', renderState);
  audio.addEventListener('pause', renderState);
  renderState();
})();
