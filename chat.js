/* Wander Cargo — AI chat widget. Talks to /api/chat (server-side Groq proxy). */
(() => {
  'use strict';
  const MAX_CHARS = 500;
  const HISTORY_SENT = 10; // last N messages sent to server

  const t = (en, zh) => (document.documentElement.lang === 'zh' ? zh : en);

  const root = document.createElement('div');
  root.className = 'ai-chat';
  root.innerHTML = `
    <button type="button" class="ai-fab" aria-label="Ask our AI assistant" aria-expanded="false">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h5"/></svg>
      <span class="ai-fab-label">AI</span>
    </button>
    <section class="ai-panel" role="dialog" aria-label="Wander Cargo AI assistant" hidden>
      <header class="ai-head">
        <div>
          <strong>Wander Cargo AI</strong>
          <span class="ai-sub" data-en="Shipping questions, answered instantly" data-zh="即时解答您的货运问题">Shipping questions, answered instantly</span>
        </div>
        <button type="button" class="ai-close" aria-label="Close chat">×</button>
      </header>
      <div class="ai-msgs" aria-live="polite">
        <div class="ai-msg assistant" data-en="Hi! I'm Wander Cargo's AI assistant. Ask me anything about shipping from China — FCL, LCL, consolidation, customs, transit times. (For prices, I'll point you to a real human quote.)" data-zh="您好！我是Wander Cargo的AI助手。欢迎咨询从中国发货的任何问题——整柜、拼箱、集运、清关、时效。（具体报价请联系我们的团队。）">Hi! I'm Wander Cargo's AI assistant. Ask me anything about shipping from China — FCL, LCL, consolidation, customs, transit times. (For prices, I'll point you to a real human quote.)</div>
      </div>
      <div class="ai-chips">
        <button type="button" data-en="What's the difference between FCL and LCL?" data-zh="FCL和LCL有什么区别？">What's the difference between FCL and LCL?</button>
        <button type="button" data-en="How does weekly consolidation from Yiwu work?" data-zh="义乌每周拼箱是怎么运作的？">How does weekly consolidation from Yiwu work?</button>
        <button type="button" data-en="Can you ship dangerous goods (DG)?" data-zh="你们能运危险品吗？">Can you ship dangerous goods (DG)?</button>
        <button type="button" data-en="How do I get a quote?" data-zh="如何获取报价？">How do I get a quote?</button>
      </div>
      <form class="ai-input">
        <input type="text" maxlength="${MAX_CHARS}" placeholder="Ask about shipping from China…" autocomplete="off" data-ph-en="Ask about shipping from China…" data-ph-zh="咨询中国发货相关问题…" />
        <button type="submit" class="ai-send" aria-label="Send">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
        </button>
      </form>
      <p class="ai-note" data-en="AI answers may contain mistakes. No prices here — get a real quote on WhatsApp." data-zh="AI回答仅供参考，报价请通过WhatsApp联系我们。">AI answers may contain mistakes. No prices here — get a real quote on WhatsApp.</p>
    </section>`;
  document.body.appendChild(root);

  const fab = root.querySelector('.ai-fab');
  const panel = root.querySelector('.ai-panel');
  const msgsEl = root.querySelector('.ai-msgs');
  const chipsEl = root.querySelector('.ai-chips');
  const form = root.querySelector('.ai-input');
  const input = form.querySelector('input');
  const history = [];
  let busy = false;

  const applyLang = () => {
    const zh = document.documentElement.lang === 'zh';
    root.querySelectorAll('[data-en]').forEach((el) => { el.textContent = zh ? el.dataset.zh : el.dataset.en; });
    input.placeholder = zh ? input.dataset.phZh : input.dataset.phEn;
  };
  applyLang();
  document.querySelectorAll('.lang-toggle button').forEach((b) => b.addEventListener('click', () => setTimeout(applyLang, 0)));

  const addMsg = (role, text) => {
    const div = document.createElement('div');
    div.className = `ai-msg ${role}`;
    div.textContent = text;
    msgsEl.appendChild(div);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return div;
  };

  const toggle = (open) => {
    panel.hidden = !open;
    fab.setAttribute('aria-expanded', String(open));
    root.classList.toggle('open', open);
    if (open) input.focus();
  };
  fab.addEventListener('click', () => toggle(panel.hidden));
  root.querySelector('.ai-close').addEventListener('click', () => toggle(false));
  // Close on Esc or tapping outside the panel (Messenger-style).
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) toggle(false); });
  document.addEventListener('click', (e) => {
    if (!panel.hidden && !root.contains(e.target)) toggle(false);
  });

  async function send(text) {
    text = text.trim().slice(0, MAX_CHARS);
    if (!text || busy) return;
    busy = true;
    form.classList.add('busy');
    chipsEl.hidden = true;
    addMsg('user', text);
    history.push({ role: 'user', content: text });
    const pending = addMsg('assistant', '…');
    pending.classList.add('pending');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-HISTORY_SENT) }),
      });
      const data = await res.json();
      const reply = res.ok ? data.reply : data.error;
      pending.textContent = reply || t('Sorry, something went wrong. Try WhatsApp instead.', '抱歉，出错了。请通过WhatsApp联系我们。');
      if (res.ok) history.push({ role: 'assistant', content: data.reply });
    } catch {
      pending.textContent = t('Connection problem — please try again or message us on WhatsApp.', '网络问题——请重试或通过WhatsApp联系我们。');
    }
    pending.classList.remove('pending');
    msgsEl.scrollTop = msgsEl.scrollHeight;
    busy = false;
    form.classList.remove('busy');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = '';
    send(v);
  });
  chipsEl.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') send(e.target.textContent);
  });
})();
