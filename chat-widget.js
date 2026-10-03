(() => {
  if (document.querySelector('.chhath-chat')) return;

  const widget = document.createElement('section');
  widget.className = 'chhath-chat';
  widget.setAttribute('aria-label', 'लाइव चैट');
  widget.innerHTML = `
    <div class="chat-header" role="button" tabindex="0" aria-expanded="false" aria-controls="chhathChatMessages">
      <span class="chat-title"><span class="live-dot" aria-hidden="true"></span><span>💬 लाइव चैट</span></span>
      <small>community</small>
      <span class="live-count-badge" id="chatLiveCount" aria-label="0 लोग लाइव चैट में">0</span>
    </div>
    <div class="chat-messages" id="chhathChatMessages" aria-live="polite">
      <div class="chat-message system"><span class="chat-bubble">🙏 नमस्ते! अपना संदेश साझा करें।</span></div>
    </div>
    <div class="chat-quick" aria-label="त्वरित संदेश">
      <button type="button" class="quick-message" data-message="नमस्ते!">नमस्ते!</button>
      <button type="button" class="quick-message" data-message="बहुत सुंदर गीत">बहुत सुंदर गीत</button>
      <button type="button" class="quick-message" data-message="❤️ शुभकामनाएँ">❤️ शुभकामनाएँ</button>
    </div>
    <div class="chat-compose">
      <input id="chatInput" class="chat-input" type="text" maxlength="200" placeholder="अपना संदेश लिखें..." aria-label="अपना संदेश लिखें">
      <button id="chatSendBtn" class="chat-send" type="button">➤ भेजें</button>
    </div>`;
  document.body.appendChild(widget);
})();
