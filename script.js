/**
 * SouthStack IDE — Core Logic v2.1 (Final & Fully Audited - Claude Fixes Applied)
 */

// ══════════════════════════════════
// POLYFILLS & UTILITIES
// ══════════════════════════════════
String.prototype.hashCode = function () {
  let h = 0;
  for (let i = 0; i < this.length; i++) {
    h = ((h << 5) - h) + this.charCodeAt(i);
    h |= 0;
  }
  return h;
};

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Markdown Parser ──────────────
function parseMd(raw) {
  const blocks = [];
  let s = raw.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const lbl = lang || 'code';
    blocks.push(
      `<pre>` +
      `<div class="code-header">` +
        `<span>${esc(lbl)}</span>` +
        `<div style="display:flex;gap:6px">` +
          `<button class="copy-btn" onclick="copyCode(this)">Copy</button>` +
          `<button class="insert-btn" onclick="insertCode(this)">⬆ Insert</button>` +
        `</div>` +
      `</div>` +
      `<code class="language-${esc(lbl)}">${esc(code.trim())}</code>` +
      `</pre>`
    );
    return `\x00B${blocks.length - 1}\x00`;
  });
  s = s
    .replace(/`([^`\n]+)`/g,    (_, c) => `<code>${esc(c)}</code>`)
    .replace(/^#{1,6}\s+(.+)$/gm, (_, t) => `<strong>${esc(t)}</strong><br>`)
    .replace(/\*\*([^*]+)\*\*/g, (_, t) => `<strong>${esc(t)}</strong>`)
    .replace(/\*([^*\n]+)\*/g,   (_, t) => `<em>${esc(t)}</em>`)
    .replace(/\n/g, '<br>');
  return s.replace(/\x00B(\d+)\x00/g, (_, i) => blocks[+i]);
}

window.copyCode = btn => {
  const code = btn.closest('pre')?.querySelector('code');
  if (!code) return;
  navigator.clipboard.writeText(code.innerText).then(() => {
    btn.textContent = '✓ Copied';
    btn.style.color = 'var(--accent)';
    setTimeout(() => { btn.textContent = 'Copy'; btn.style.color = ''; }, 1500);
  });
};

window.insertCode = btn => {
  const code = btn.closest('pre')?.querySelector('code');
  if (!code) return;
  if (!window.monacoEditor) { alert('Open a file in the editor first.'); return; }
  const sel = window.monacoEditor.getSelection();
  window.monacoEditor.executeEdits('insert-from-chat', [{
    identifier: { major: 1, minor: 1 },
    range: sel,
    text: code.innerText,
    forceMoveMarkers: true
  }]);
  window.monacoEditor.focus();
  btn.textContent = '✓ Inserted';
  btn.style.color = 'var(--accent)';
  setTimeout(() => { btn.textContent = '⬆ Insert'; btn.style.color = ''; }, 1500);
};

window.closeSettings = () => {
  document.getElementById('settings-overlay').classList.remove('open');
  if (window.checkAndReloadPeer) window.checkAndReloadPeer();
};

document.getElementById('mobile-menu-btn').onclick = () => {
    document.getElementById('sidebar').classList.toggle('open');
};

// FIX 13: Close sidebar on outside click (Mobile)
document.getElementById('main').addEventListener('click', e => {
  const sidebar = document.getElementById('sidebar');
  if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target.id !== 'mobile-menu-btn') {
    sidebar.classList.remove('open');
  }
});

// ══════════════════════════════════
// VIRTUAL FILE SYSTEM (VFS)
// ══════════════════════════════════
let vfs = JSON.parse(localStorage.getItem('ss_vfs')) || { 'main.js': 'console.log("Hello SouthStack!");' };
let activeFile = localStorage.getItem('ss_activeFile') || 'main.js';

function updateSaveIndicator(dirty) {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  if (dirty) {
    el.textContent = '● Unsaved';
    el.style.color = 'var(--warn)';
  } else {
    el.textContent = '✓ Saved';
    el.style.color = 'var(--success)';
    setTimeout(() => { if (el.textContent === '✓ Saved') el.textContent = ''; }, 2500);
  }
}

function saveVFS() {
  if (window.monacoEditor) vfs[activeFile] = window.monacoEditor.getValue();
  localStorage.setItem('ss_vfs', JSON.stringify(vfs));
  localStorage.setItem('ss_activeFile', activeFile);
  updateSaveIndicator(false);
}

function getLanguageFromExtension(f) {
  const ext = f.split('.').pop().toLowerCase();
  const map = {
    js: 'javascript', ts: 'typescript', jsx: 'javascript', tsx: 'typescript',
    py: 'python', c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp',
    java: 'java', html: 'html', css: 'css', json: 'json',
    md: 'markdown', txt: 'plaintext', sh: 'shell', bash: 'shell',
    rs: 'rust', go: 'go', rb: 'ruby', php: 'php', kt: 'kotlin',
    swift: 'swift', sql: 'sql', xml: 'xml', yaml: 'yaml', yml: 'yaml'
  };
  return map[ext] || 'plaintext';
}

const FILE_DEFAULTS = {
  javascript: '// Hello SouthStack!\nconsole.log("Hello World!");',
  typescript: '// TypeScript\nconst greet = (name: string): string => `Hello, ${name}!`;\nconsole.log(greet("World"));',
  python: 'print("Hello Python!")',
  html: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Page</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>',
  css: '/* Styles */\nbody {\n  margin: 0;\n  font-family: sans-serif;\n}\n',
  java: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello World!");\n  }\n}',
  c: '#include <stdio.h>\n\nint main() {\n  printf("Hello World!\\n");\n  return 0;\n}',
  cpp: '#include <iostream>\n\nint main() {\n  std::cout << "Hello World!" << std::endl;\n  return 0;\n}',
  rust: 'fn main() {\n  println!("Hello World!");\n}',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello World!")\n}'
};

function renderFileList() {
  const container = document.getElementById('file-explorer');
  container.innerHTML = '';
  Object.keys(vfs).forEach(filename => {
    const fileDiv = document.createElement('div');
    fileDiv.className = 'file-item';
    fileDiv.style.cssText = [
      'display:flex', 'justify-content:space-between', 'align-items:center',
      'padding:4px 8px', 'cursor:pointer', 'font-size:11px',
      'border-radius:4px', 'margin-bottom:2px',
      `background:${filename === activeFile ? 'var(--accent-dim)' : 'transparent'}`,
      `border:1px solid ${filename === activeFile ? 'var(--accent)' : 'transparent'}`
    ].join(';');

    const nameSpan = document.createElement('span');
    nameSpan.textContent = filename;
    nameSpan.title = filename;
    nameSpan.style.cssText = `color:${filename === activeFile ? 'var(--accent)' : 'var(--text)'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;`;
    nameSpan.onclick = () => switchFile(filename);

    const delBtn = document.createElement('span');
    delBtn.innerHTML = '✕';
    delBtn.title = 'Delete file';
    delBtn.style.cssText = 'color:var(--danger);flex-shrink:0;padding:0 2px;line-height:1;';
    delBtn.onclick = e => { e.stopPropagation(); deleteFile(filename); };

    fileDiv.append(nameSpan, delBtn);
    container.appendChild(fileDiv);
  });
  document.getElementById('active-file-display').textContent = activeFile;
}

function switchFile(f) {
  if (f === activeFile) return;
  saveVFS();
  activeFile = f;
  if (window.monacoEditor) {
    window.monaco.editor.setModelLanguage(window.monacoEditor.getModel(), getLanguageFromExtension(f));
    window.monacoEditor.setValue(vfs[f] || '');
    if (getLanguageFromExtension(f) === 'python') window._ssLoadPyodide?.();
  }
  renderFileList();
}

function createFile(f) {
  if (!f || vfs[f]) { if (vfs[f]) switchFile(f); return; }
  saveVFS();
  const lang = getLanguageFromExtension(f);
  vfs[f] = FILE_DEFAULTS[lang] || '';
  activeFile = f;
  if (window.monacoEditor) {
    window.monaco.editor.setModelLanguage(window.monacoEditor.getModel(), lang);
    window.monacoEditor.setValue(vfs[f]);
    if (lang === 'python') window._ssLoadPyodide?.();
  }
  renderFileList();
  saveVFS();
}

function deleteFile(f) {
  if (Object.keys(vfs).length <= 1) return;
  if (!confirm(`Delete "${f}"?`)) return;
  delete vfs[f];
  if (activeFile === f) {
    activeFile = Object.keys(vfs)[0];
    if (window.monacoEditor) {
      window.monaco.editor.setModelLanguage(window.monacoEditor.getModel(), getLanguageFromExtension(activeFile));
      window.monacoEditor.setValue(vfs[activeFile]);
    }
  }
  renderFileList();
  saveVFS();
}

document.getElementById('add-file-btn').onclick = () => {
  const input = document.getElementById('new-file-name');
  const f = input.value.trim();
  if (f.includes('.')) { createFile(f); input.value = ''; extDropdown.style.display = 'none'; }
  else alert('Enter filename with extension (e.g. main.py)');
};

// ── File extension autocomplete ──
const fileNameInput = document.getElementById('new-file-name');
const extDropdown = document.getElementById('ext-dropdown');
const SUPPORTED_EXTS = ['.js', '.ts', '.py', '.c', '.cpp', '.java', '.html', '.css',
                         '.json', '.md', '.sh', '.txt', '.rs', '.go', '.rb', '.php',
                         '.jsx', '.tsx', '.sql', '.yaml', '.xml', '.kt', '.swift'];

fileNameInput.addEventListener('input', e => {
  const val = e.target.value;
  const dot = val.lastIndexOf('.');
  if (dot !== -1 && dot === val.length - 1) showExtDropdown(val.slice(0, dot), SUPPORTED_EXTS);
  else extDropdown.style.display = 'none';
});

function showExtDropdown(base, list) {
  extDropdown.innerHTML = '';
  list.forEach(ext => {
    const d = document.createElement('div');
    d.innerHTML = `${esc(base)}<span style="color:var(--accent)">${ext}</span>`;
    d.style.cssText = 'padding:6px;cursor:pointer;font-size:11px;font-family:"JetBrains Mono",monospace;';
    d.onmouseover = () => d.style.background = 'var(--panel)';
    d.onmouseout  = () => d.style.background = 'transparent';
    d.onclick = () => { fileNameInput.value = base + ext; extDropdown.style.display = 'none'; fileNameInput.focus(); };
    extDropdown.appendChild(d);
  });
  extDropdown.style.display = 'block';
}
document.addEventListener('click', e => {
  if (!fileNameInput.contains(e.target) && !extDropdown.contains(e.target))
    extDropdown.style.display = 'none';
});

// ── File Upload (with binary block) ──
document.getElementById('upload-file-btn').onclick = () =>
  document.getElementById('file-upload-input').click();

document.getElementById('file-upload-input').onchange = e => {
  const files = Array.from(e.target.files);
  if (!files.length) return;
  const textExts = ['.js','.ts','.py','.html','.css','.json','.md','.txt','.c','.cpp','.java','.rs','.go','.rb','.php','.jsx','.tsx','.sql','.yaml','.xml','.kt','.swift'];
  let lastFile = null;
  let loaded = 0;
  
  files.forEach(file => {
    if (!textExts.some(ext => file.name.toLowerCase().endsWith(ext))) {
       const term = document.getElementById('terminal-output');
       if(term) { term.insertAdjacentHTML('beforeend', `<span style="color:var(--warn)">⚠ Skipping binary/unsupported file: ${esc(file.name)}</span>\n`); term.scrollTop = term.scrollHeight; }
       loaded++;
       if (loaded === files.length && lastFile) {
           activeFile = lastFile;
           if (window.monacoEditor) {
             window.monaco.editor.setModelLanguage(window.monacoEditor.getModel(), getLanguageFromExtension(lastFile));
             window.monacoEditor.setValue(vfs[lastFile]);
           }
           renderFileList(); saveVFS();
       }
       return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      saveVFS();
      vfs[file.name] = ev.target.result;
      lastFile = file.name;
      loaded++;
      if (loaded === files.length) {
        activeFile = lastFile;
        if (window.monacoEditor) {
          window.monaco.editor.setModelLanguage(window.monacoEditor.getModel(), getLanguageFromExtension(lastFile));
          window.monacoEditor.setValue(vfs[lastFile]);
        }
        renderFileList();
        saveVFS();
      }
    };
    reader.readAsText(file);
  });
  e.target.value = '';
};

// ══════════════════════════════════
// DATABASE (IndexedDB)
// ══════════════════════════════════
// FIX 7 & 8: IDB Full Error Rejections & Blocking
class Database {
  constructor() { this.db = null; }

  async init() {
    return new Promise((res, rej) => {
      const req = indexedDB.open('SouthStackDB', 8);
      req.onblocked = () => rej(new Error('IndexedDB blocked — close other SouthStack tabs.'));
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('sessions'))
          db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('messages'))
          db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true })
            .createIndex('session_id', 'session_id');
      };
      req.onsuccess = e => { this.db = e.target.result; res(); };
      req.onerror = e => rej(e.target.error);
    });
  }

  async add(store, data) {
    return new Promise((res, rej) => { 
      const tx = this.db.transaction(store, 'readwrite');
      tx.onerror = e => rej(e.target.error);
      const r = tx.objectStore(store).add(data); 
      r.onsuccess = () => res(r.result); 
    });
  }

  async getSessions() {
    return new Promise((res, rej) => {
      const tx = this.db.transaction('sessions', 'readonly');
      tx.onerror = e => rej(e.target.error);
      tx.objectStore('sessions').getAll().onsuccess = e => res(e.target.result.reverse());
    });
  }

  async getMessages(sid) {
    return new Promise((res, rej) => {
      const tx = this.db.transaction('messages', 'readonly');
      tx.onerror = e => rej(e.target.error);
      tx.objectStore('messages').index('session_id').getAll(sid).onsuccess = e => res(e.target.result);
    });
  }

  async updateSessionTitle(id, title) {
    return new Promise((res, rej) => {
      const tx = this.db.transaction('sessions', 'readwrite');
      tx.onerror = e => rej(e.target.error);
      const store = tx.objectStore('sessions');
      const req = store.get(id);
      req.onsuccess = () => { if (req.result) { req.result.title = title; store.put(req.result); } res(); };
      req.onerror = e => rej(e.target.error);
    });
  }

  async deleteSession(id) {
    return new Promise((res, rej) => {
      const tx = this.db.transaction(['sessions', 'messages'], 'readwrite');
      tx.onerror = e => rej(e.target.error);
      tx.objectStore('sessions').delete(id);
      const msgStore = tx.objectStore('messages');
      const req = msgStore.index('session_id').getAll(id);
      req.onsuccess = () => req.result.forEach(m => msgStore.delete(m.id));
      tx.oncomplete = res;
    });
  }
}

// ══════════════════════════════════
// AI ADAPTERS
// ══════════════════════════════════
class WebLLMAdapter {
  constructor() { this.engine = null; this.ready = false; }
  async init(modelId, onProgress) {
    const { CreateMLCEngine } = await import('https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm/+esm');
    this.engine = await CreateMLCEngine(modelId, {
      initProgressCallback: p => onProgress?.(p.text, p.progress || 0)
    });
    this.ready = true;
  }
  async *chat(msgs) {
    const s = await this.engine.chat.completions.create({ messages: msgs, stream: true });
    for await (const c of s) yield c.choices[0]?.delta?.content || '';
  }
}

class OllamaAdapter {
  constructor(m) { this.m = m || 'qwen2.5-coder:1.5b'; }
  async init() {
    const r = await fetch('http://localhost:11434/api/tags').catch(() => null);
    if (!r?.ok) throw new Error('Ollama not running. Start with: ollama serve');
  }
  async *chat(msgs) {
    const r = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.m, messages: msgs, stream: true })
    });
    const reader = r.body.getReader(), dec = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const l of dec.decode(value).split('\n').filter(Boolean)) {
        try { yield JSON.parse(l).message?.content || ''; } catch {}
      }
    }
  }
}

class GeminiAdapter {
  constructor(k) { this.k = k; }
  async init() {
    if (!this.k) throw new Error('Gemini API key missing — add it in ⚙ Settings.');
  }
  async *chat(msgs) {
    const contents = msgs
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${this.k}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents }) }
    );
    if (!r.ok) throw new Error(`Gemini ${r.status} — check your API key.`);
    const reader = r.body.getReader(), dec = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const l of dec.decode(value).split('\n')) {
        if (l.startsWith('data: '))
          try { yield JSON.parse(l.slice(6)).candidates[0].content.parts[0].text; } catch {}
      }
    }
  }
}

class GroqAdapter {
  constructor(k) { this.k = k; }
  async init() {
    if (!this.k) throw new Error('Groq API key missing — add it in ⚙ Settings.');
  }
  async *chat(msgs) {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.k}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: msgs, stream: true })
    });
    if (!r.ok) throw new Error(`Groq ${r.status} — check your API key.`);
    const reader = r.body.getReader(), dec = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const l of dec.decode(value).split('\n')) {
        if (!l.startsWith('data: ')) continue;
        const d = l.slice(6);
        if (d === '[DONE]') return;
        try { yield JSON.parse(d).choices[0]?.delta?.content || ''; } catch {}
      }
    }
  }
}

// ══════════════════════════════════
// BOOT
// ══════════════════════════════════
async function boot() {
  const db = new Database();
  // FIX 1: Catch DB Init Failures
  try {
    await db.init();
  } catch (err) {
    document.body.innerHTML = `<div style="color:var(--danger);padding:20px;font-family:monospace;background:var(--bg);height:100vh;">⚠ SouthStack Database Failed: ${esc(err.message)}<br>Please try clearing your browser cache or opening in a normal window.</div>`;
    return;
  }

  const cfg = JSON.parse(localStorage.getItem('ss_cfg') || '{}');
  const adapters = {
    webllm:  new WebLLMAdapter(),
    ollama:  new OllamaAdapter(cfg.ollama_model),
    gemini:  new GeminiAdapter(cfg.gemini_key),
    groq:    new GroqAdapter(cfg.groq_key)
  };

  let activeModelEngine = null, activeModelName = null;
  let isGenerating = false, curSid = null;
  let peer = null, myPeerId = null, conns = [], remoteCursors = {};
  let pyodide = null;
  let myNickname = localStorage.getItem('ss_nickname') || 'Dev_' + Math.floor(Math.random() * 1000);
  localStorage.setItem('ss_nickname', myNickname);

  function termWrite(h) {
    const o = document.getElementById('terminal-output');
    o.insertAdjacentHTML('beforeend', h);
    o.scrollTop = o.scrollHeight;
  }
  function setP2PStatus(t, c) {
    document.getElementById('peer-status-text').textContent = t;
    document.getElementById('peer-dot').className = `peer-dot ${c}`;
  }
  function broadcast(type, payload) {
    conns.forEach(c => { try { c.send({ type, ...payload }); } catch {} });
  }

  // ── P2P Swarm ────────────────────
  let currentPeerMode = cfg.local_ip || 'cloud';
  let isApplyingRemote = false;

  const setupPeer = () => {
    const freshCfg = JSON.parse(localStorage.getItem('ss_cfg') || '{}');
    if (peer) peer.destroy();
    const isOffline = !!freshCfg.local_ip;
    const peerOptions = isOffline
      ? { host: freshCfg.local_ip, port: 9000, path: '/myapp', secure: false }
      : {};
    termWrite(`<span style="color:var(--muted)">[Network] Starting ${isOffline ? 'Offline (Local Hotspot)' : 'Cloud'} P2P...</span>\n`);
    
    document.getElementById('my-peer-id').textContent = 'Connecting...';
    myPeerId = null;

    try {
      peer = new Peer(peerOptions);
      peer.on('open', id => {
        myPeerId = id;
        document.getElementById('my-peer-id').textContent = id.slice(0, 8) + '...';
        setP2PStatus(isOffline ? 'Offline Ready' : 'Ready (Cloud)', 'online');
        const urlJoin = new URLSearchParams(window.location.search).get('join');
        if (urlJoin) {
          const c = peer.connect(urlJoin, { metadata: { nickname: myNickname } });
          c.on('open', () => handleConn(c));
        }
      });
      peer.on('connection', c => handleConn(c));
      peer.on('error', e => {
        myPeerId = null;
        document.getElementById('my-peer-id').textContent = 'Error!';
        setP2PStatus('P2P Error', 'error');
        termWrite(`<span style="color:var(--danger)">⚠ P2P Error: ${esc(e.type)}. ${isOffline ? 'Run: npx peer --port 9000 --path /myapp' : ''}</span>\n`);
      });
    } catch { 
        myPeerId = null;
        document.getElementById('my-peer-id').textContent = 'Failed';
        setP2PStatus('P2P Failed', 'error'); 
    }
  };

  window.checkAndReloadPeer = () => {
    const newCfg = JSON.parse(localStorage.getItem('ss_cfg') || '{}');
    const newMode = newCfg.local_ip || 'cloud';
    if (currentPeerMode !== newMode) { currentPeerMode = newMode; setupPeer(); }
  };

  const handleConn = c => {
    if (conns.some(x => x.peer === c.peer)) { c.close(); return; }
    conns.push(c);
    const pNick = c.metadata?.nickname || c.peer.slice(0, 5);
    termWrite(`<span style="color:var(--success)">⚡ <strong>${esc(pNick)}</strong> joined the swarm.</span>\n`);
    setP2PStatus(`Connected (${conns.length})`, 'online');

    c.on('data', async d => {
      if (d.type === 'live_edit') {
        // FIX 15: P2P Filename validation
        if (typeof d.file !== 'string' || d.file.length > 260 || typeof d.content !== 'string') return;
        vfs[d.file] = d.content;
        if (activeFile === d.file && window.monacoEditor) {
          isApplyingRemote = true;
          const pos = window.monacoEditor.getPosition();
          window.monacoEditor.setValue(d.content);
          window.monacoEditor.setPosition(pos);
          isApplyingRemote = false;
        }
        localStorage.setItem('ss_vfs', JSON.stringify(vfs));
      }

      if (d.type === 'cursor_move') updateRemoteCursor(d.from, d.nick, d.pos, d.color);

      if (d.type === 'vfs_sync') {
        const ok = confirm(
          `${esc(d.from)} wants to sync the project to your editor.\n` +
          `This will replace your current files.\n\nAccept?`
        );
        if (!ok) return;
        vfs = Object.assign(Object.create(null), d.vfs);
        if (!vfs[activeFile]) activeFile = Object.keys(vfs)[0];
        renderFileList();
        saveVFS();
        if (window.monacoEditor) window.monacoEditor.setValue(vfs[activeFile]);
        termWrite(`<span style="color:var(--accent)">📂 Project synced from ${esc(d.from)}</span>\n`);
      }

      if (d.type === 'term') termWrite(d.html);

      if (d.type === 'msg') {
        if (!curSid) {
          curSid = await db.add('sessions', { title: 'Swarm Session', model: 'Peer' });
          await loadSessionsUI();
        }
        renderMsg(d.role === 'ai' ? 'ai' : 'peer', d.content, d.model);
        await db.add('messages', { session_id: curSid, role: d.role === 'ai' ? 'ai' : 'peer', content: d.content });
      }
    });

    c.on('close', () => {
      conns = conns.filter(x => x !== c);
      termWrite(`<span style="color:var(--warn)">🔌 <strong>${esc(pNick)}</strong> left the swarm.</span>\n`);
      if (remoteCursors[c.peer] && window.monacoEditor) {
        window.monacoEditor.deltaDecorations(remoteCursors[c.peer], []);
        delete remoteCursors[c.peer];
      }
      setP2PStatus(conns.length ? `Connected (${conns.length})` : 'Ready', conns.length ? 'online' : '');
    });
  };

  const updateRemoteCursor = (id, nick, pos, color) => {
    if (!window.monacoEditor) return;
    const safeColor = /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#7c6af7';
    const safeId   = id.replace(/[^a-zA-Z0-9]/g, '');
    const cursorCls = `remote-cursor-${safeId}`;
    const labelCls  = `cursor-label-${safeId}`;
    const decs = [{
      range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column + 1),
      options: { className: cursorCls, beforeContentClassName: labelCls, stickiness: 1 }
    }];
    const styleId = `style-${safeId}`;
    if (!document.getElementById(styleId)) {
      const s = document.createElement('style');
      s.id = styleId;
      const safeNick = nick.replace(/["\\]/g, '\\$&').replace(/\n/g, ' ');
      s.innerHTML =
        `.${cursorCls}{border-left:2px solid ${safeColor}!important;margin-left:-1px;}` +
        `.${labelCls}::before{content:"${safeNick}";` +
        `position:absolute;top:-16px;left:-2px;background:${safeColor}!important;` +
        `color:white;font-size:9px;padding:1px 4px;border-radius:3px;white-space:nowrap;` +
        `font-weight:bold;z-index:10;font-family:'JetBrains Mono',monospace;}`;
      document.head.appendChild(s);
    }
    remoteCursors[id] = window.monacoEditor.deltaDecorations(remoteCursors[id] || [], decs);
  };

  // ── Monaco Editor ─────────────────
  require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } });
  require(['vs/editor/editor.main'], () => {
    window.monacoEditor = monaco.editor.create(document.getElementById('monaco-container'), {
      value: vfs[activeFile],
      language: getLanguageFromExtension(activeFile),
      theme: 'vs-dark',
      automaticLayout: true,
      fontSize: parseInt(localStorage.getItem('ss_fontsize') || '14'),
      fontFamily: "'JetBrains Mono', monospace",
      minimap: { enabled: false },
      scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
      smoothScrolling: true,
      cursorSmoothCaretAnimation: 'on',
      padding: { top: 12 }
    });

    window.monacoEditor.addAction({
      id: 'ai-explain',
      label: '✨ Explain with AI Agent',
      contextMenuGroupId: 'navigation',
      run: function(ed) {
        const text = ed.getModel().getValueInRange(ed.getSelection());
        if (text.trim() && !isGenerating && activeModelEngine) {
          document.getElementById('user-input').value = `Please explain this specific block of code:\n\`\`\`\n${text}\n\`\`\``;
          document.getElementById('send-btn').click();
        } else if (!activeModelEngine) {
          alert('Please select an AI Agent from the dropdown first.');
        }
      }
    });

    let cursorThrottle;
    window.monacoEditor.onDidChangeCursorPosition(e => {
      if (myPeerId && conns.length > 0) {
        clearTimeout(cursorThrottle);
        cursorThrottle = setTimeout(() => {
          const colors = ['#ff5f56', '#ffbd2e', '#27c93f', '#7c6af7', '#00d4aa'];
          const myColor = colors[Math.abs(myPeerId.hashCode()) % colors.length];
          broadcast('cursor_move', { from: myPeerId, nick: myNickname, pos: e.position, color: myColor });
        }, 50);
      }
    });

    // FIX 4: Throttle live_edit broadcasts
    let liveEditThrottle;
    window.monacoEditor.onDidChangeModelContent(() => {
      if (!isApplyingRemote) {
        vfs[activeFile] = window.monacoEditor.getValue();
        localStorage.setItem('ss_vfs', JSON.stringify(vfs));
        updateSaveIndicator(true); 
        clearTimeout(liveEditThrottle);
        liveEditThrottle = setTimeout(() => broadcast('live_edit', { file: activeFile, content: vfs[activeFile] }), 100);
      }
    });

    // 👻 Ghost Text
    let debounceTimer;
    monaco.languages.registerInlineCompletionsProvider('*', {
      provideInlineCompletions: async (model, pos, _ctx, token) => {
        if (!activeModelEngine || isGenerating) return { items: [] };
        const text = model.getValueInRange({
          startLineNumber: Math.max(1, pos.lineNumber - 20),
          startColumn: 1,
          endLineNumber: pos.lineNumber,
          endColumn: pos.column
        });
        if (text.trim().length < 5) return { items: [] };
        return new Promise(res => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(async () => {
            if (token.isCancellationRequested) return res({ items: [] });
            try {
              const p = `Continue exactly from here. NO preamble, NO markdown wrapping. Just code:\n${text}`;
              let prediction = '';
              for await (const chunk of adapters[activeModelEngine].chat([{ role: 'user', content: p }])) {
                if (token.isCancellationRequested) break;
                prediction += chunk;
                if (prediction.length > 150) break;
              }
              prediction = prediction.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trimEnd();
              res({ items: [{ insertText: prediction, range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column) }] });
            } catch { res({ items: [] }); }
          }, 800);
        });
      },
      freeInlineCompletions() {}
    });
  });

  // ── Voice AI ─────────────────────
  let aiVoiceEnabled = false;
  document.getElementById('ai-voice-toggle').onclick = e => {
    aiVoiceEnabled = !aiVoiceEnabled;
    e.target.innerHTML = aiVoiceEnabled ? '🔊 Voice ON' : '🔇 Voice OFF';
    e.target.style.color = aiVoiceEnabled ? 'var(--success)' : 'var(--muted)';
    e.target.style.borderColor = aiVoiceEnabled ? 'var(--success)' : 'var(--border)';
    if (!aiVoiceEnabled) window.speechSynthesis.cancel();
  };

  function speak(t) {
    if (!aiVoiceEnabled) return;
    window.speechSynthesis.cancel();
    // FIX 9: Protect snake_case pronunciation correctly
    const clean = t
      .replace(/```[\s\S]*?```/g, 'Code provided.')
      .replace(/`[^`]+`/g, 'code')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/#+\s/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, '$1') 
      .replace(/[~>]/g, '');
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'en-US';
    window.speechSynthesis.speak(u);
  }

  // ── Microphone input ─────────────
  const micBtn = document.getElementById('mic-btn');
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRec) {
    const rec = new SpeechRec();
    rec.continuous = false;
    rec.interimResults = false;
    let isRecording = false;
    rec.onstart = () => {
      isRecording = true;
      micBtn.style.color = 'var(--danger)';
      micBtn.style.transform = 'scale(1.2)';
      document.getElementById('user-input').placeholder = 'Listening... speak now';
    };
    rec.onresult = e => { document.getElementById('user-input').value += e.results[0][0].transcript; };
    rec.onend = () => {
      isRecording = false;
      micBtn.style.color = 'var(--muted)';
      micBtn.style.transform = 'scale(1)';
      document.getElementById('user-input').placeholder = `Ask ${activeModelName || 'AI'}... (Enter to send)`;
      if (document.getElementById('user-input').value.trim()) document.getElementById('send-btn').click();
    };
    // FIX 10: Reset UI on Speech error
    rec.onerror = () => {
      isRecording = false;
      micBtn.style.color = 'var(--muted)';
      micBtn.style.transform = 'scale(1)';
    };
    micBtn.onclick = () => {
      if (!activeModelEngine || isRecording) return;
      if (!aiVoiceEnabled) {
        aiVoiceEnabled = true;
        const tb = document.getElementById('ai-voice-toggle');
        tb.innerHTML = '🔊 Voice ON'; tb.style.color = 'var(--success)'; tb.style.borderColor = 'var(--success)';
      }
      rec.start();
    };
  } else {
    micBtn.style.display = 'none';
  }

  // ── Pyodide (Python) ─────────────
  let _pyPromise = null;
  window._ssLoadPyodide = async () => {
    if (pyodide) return pyodide;
    if (_pyPromise) return _pyPromise;
    document.getElementById('pyodide-loading').classList.add('show');
    document.getElementById('pyodide-status').textContent = 'Loading Python (Local Wasm)...';
    _pyPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = './pyodide/pyodide.js';
      const loadPyodideInstance = async (indexURL) => {
        try {
          pyodide = await window.loadPyodide({ indexURL });
          pyodide.setStdin({
            stdin: () => {
              const val = window.prompt('Python input():');
              return (val !== null ? val : '') + '\n';
            }
          });
          document.getElementById('pyodide-loading').classList.remove('show');
          resolve(pyodide);
        } catch (err) {
          document.getElementById('pyodide-status').textContent = 'Error loading Python!';
          reject(err);
        }
      };
      script.onload = () => loadPyodideInstance('./pyodide/');
      
      script.onerror = () => {
        console.warn('Local Pyodide not found, falling back to CDN...');
        const cdnScript = document.createElement('script');
        cdnScript.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
        cdnScript.onload = () => loadPyodideInstance('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/');
        cdnScript.onerror = () => {
          document.getElementById('pyodide-status').textContent = 'Error loading Python!';
          reject(new Error('Failed to load pyodide from CDN'));
        };
        document.head.appendChild(cdnScript);
      };
      
      document.head.appendChild(script);
    });
    return _pyPromise;
  };

  // ── Run Code ─────────────────────
  document.getElementById('run-btn').onclick = async () => {
    if (!window.monacoEditor) return;
    const code = window.monacoEditor.getValue();
    const lang = getLanguageFromExtension(activeFile);
    const hdr = `\n<span style="color:#7c6af7">$ running ${esc(activeFile)}...</span>\n`;
    termWrite(hdr);
    broadcast('term', { html: hdr });

    if (lang === 'python') {
      const py = await window._ssLoadPyodide();
      py.setStdout({ batched: s => { const h = `<span style="color:var(--text)">${esc(s)}</span>\n`; termWrite(h); broadcast('term', { html: h }); } });
      py.setStderr({ batched: s => { const h = `<span style="color:var(--danger)">${esc(s)}</span>\n`; termWrite(h); broadcast('term', { html: h }); } });
      try { py.runPython(code); }
      catch (e) { termWrite(`<span style="color:var(--danger)">${esc(e.message)}</span>\n`); }
      return;
    }

    if (lang === 'javascript') {
      const workerCode = `
        const _l = console.log; const _e = console.error;
        console.log = (...a) => postMessage({t: 'log', d: a.map(String).join(' ')});
        console.error = (...a) => postMessage({t: 'err', d: a.map(String).join(' ')});
        try { ${code} } catch(e) { postMessage({t: 'err', d: e.message}); }
      `;
      const blob = new Blob([workerCode], {type: 'application/javascript'});
      // FIX 2: Web Worker URL Revocation & error handler
      const blobUrl = URL.createObjectURL(blob);
      const worker = new Worker(blobUrl);
      
      worker.onerror = e => { 
        termWrite(`<span style="color:var(--danger)">Worker Error: ${esc(e.message)}</span>\n`); 
        worker.terminate(); 
        URL.revokeObjectURL(blobUrl); 
      };
      worker.onmessageerror = () => { URL.revokeObjectURL(blobUrl); };
      
      const t_worker = setTimeout(() => { 
        worker.terminate(); 
        URL.revokeObjectURL(blobUrl); 
        termWrite(`<span style="color:var(--warn)">Execution timed out.</span>\n`); 
      }, 10000);
      
      worker.onmessage = e => {
        const isErr = e.data.t === 'err';
        const h = `<span style="color:var(--${isErr ? 'danger' : 'text'})">${esc(e.data.d)}</span>\n`;
        termWrite(h); broadcast('term', { html: h });
        if (isErr) { clearTimeout(t_worker); worker.terminate(); URL.revokeObjectURL(blobUrl); }
      };
      return;
    }

    if (lang === 'html') {
      const blob = new Blob([code], {type: 'text/html'});
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      // FIX 3: HTML Blob memory leak
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      const h = `<span style="color:var(--success)">✓ HTML preview opened in a new tab.</span>\n`;
      termWrite(h); broadcast('term', { html: h });
      return;
    }

    // FIX 5: Validate Piston supported language before sending
    // C / C++ / Java / others via Piston API
    try {
      const langMap = { c: 'c', cpp: 'c++', java: 'java', rs: 'rust', go: 'go', rb: 'ruby', php: 'php' };
      const pistonLang = langMap[lang];
      if (!pistonLang) {
        termWrite(`<span style="color:var(--warn)">⚠ No runner for "${esc(lang)}" files. Supported: C, C++, Java, Rust, Go, Ruby, PHP.</span>\n`);
        return;
      }

      const currentCfg = JSON.parse(localStorage.getItem('ss_cfg') || '{}');
      const apiUrl = currentCfg.piston_url || 'https://emkc.org/api/v2/piston/execute';
      termWrite(`<span style="color:var(--muted)">[Compiler] Routing to ${currentCfg.piston_url ? 'Local Piston' : 'Cloud Piston'}...</span>\n`);

      // FIX: Cloud Piston requires exact versions instead of '*'
      const versionMap = { 'c': '10.2.0', 'c++': '10.2.0', 'java': '15.0.2', 'rust': '1.68.2', 'go': '1.16.2', 'ruby': '3.0.1', 'php': '8.2.3' };
      const version = currentCfg.piston_url ? '*' : (versionMap[pistonLang] || '*');

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: pistonLang, version: version, files: [{ content: code }] })
      });
      const d = await res.json();

      // FIX: Catch API level errors (like rate limits or missing versions)
      if (d.message) {
        const h = `<span style="color:var(--danger)">API Error: ${esc(d.message)}</span>\n`;
        termWrite(h); broadcast('term', { html: h });
        return;
      }

      if (d.run?.stdout) { const h = `<span style="color:var(--text)">${esc(d.run.stdout)}</span>\n`; termWrite(h); broadcast('term', { html: h }); }
      if (d.run?.stderr) { const h = `<span style="color:var(--danger)">${esc(d.run.stderr)}</span>\n`; termWrite(h); broadcast('term', { html: h }); }
      if (d.compile?.stderr) { const h = `<span style="color:var(--danger)">Compile Error:\n${esc(d.compile.stderr)}</span>\n`; termWrite(h); broadcast('term', { html: h }); }
    } catch {
      termWrite(`<span style="color:var(--danger)">Execution Error: Could not reach compiler API.</span>\n`);
    }
  };

  document.getElementById('export-zip-btn').onclick = async () => {
    saveVFS();
    try {
      const { default: JSZip } = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm');
      const zip = new JSZip();
      Object.entries(vfs).forEach(([name, content]) => zip.file(name, content));
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'southstack-project.zip'; a.click();
      URL.revokeObjectURL(url);
      termWrite(`<span style="color:var(--success)">✓ Exported as southstack-project.zip (${Object.keys(vfs).length} files)</span>\n`);
    } catch (e) {
      termWrite(`<span style="color:var(--danger)">Export failed: ${esc(e.message)}</span>\n`);
    }
  };

  // ── Push Code ─────────────────────
  document.getElementById('push-code-btn').onclick = () => {
    saveVFS();
    if (conns.length === 0) {
      termWrite(`\n<span style="color:var(--warn)">⚠ No peers connected. Share your Node ID first.</span>\n`);
      return;
    }
    broadcast('vfs_sync', { vfs, from: myNickname });
    termWrite(`\n<span style="color:var(--success)">✓ Project pushed to ${conns.length} peer(s).</span>\n`);
  };

  document.getElementById('find-replace-btn').onclick = () => {
    if (!window.monacoEditor) return;
    window.monacoEditor.getAction('editor.action.startFindReplaceAction').run();
  };

  // Resizable Panels
  function makeResizer(resizerId, leftEl, rightEl) {
    const resizer = document.getElementById(resizerId);
    if (!resizer) return;
    let startX, startLW, startRW;
    resizer.addEventListener('mousedown', e => {
      e.preventDefault();
      startX  = e.clientX;
      startLW = leftEl.getBoundingClientRect().width;
      startRW = rightEl.getBoundingClientRect().width;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      resizer.classList.add('dragging');
    });
    function onMove(e) {
      const dx = e.clientX - startX;
      const nL = startLW + dx;
      const nR = startRW - dx;
      if (nL < 160 || nR < 180) return;
      leftEl.style.width  = nL + 'px';
      leftEl.style.flex   = 'none';
      rightEl.style.width = nR + 'px';
      rightEl.style.flex  = 'none';
      if (window.monacoEditor) window.monacoEditor.layout();
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      resizer.classList.remove('dragging');
    }
  }
  makeResizer('resizer-left',  document.getElementById('sidebar'),      document.getElementById('editor-area'));
  makeResizer('resizer-right', document.getElementById('editor-area'),  document.getElementById('chat-area'));

  // ── Session Management ────────────
  async function loadSessionsUI() {
    const ss = await db.getSessions();
    if (ss.length === 0) {
      document.getElementById('session-list').innerHTML =
        `<div style="padding:12px;font-size:10px;color:var(--muted2);text-align:center;">No sessions yet</div>`;
      return;
    }
    document.getElementById('session-list').innerHTML = ss.map(s => {
      const modelClass = s.model ? s.model.split(' ')[0].toLowerCase() : 'ai';
      return `<div class="session-item ${curSid === s.id ? 'active' : ''}" data-id="${s.id}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:4px;">
          <div class="session-title" style="flex:1;">${esc(s.title || 'Untitled')}</div>
          <button class="session-del-btn" data-id="${s.id}" title="Delete session">✕</button>
        </div>
        <div class="session-meta">
          <div class="s-dot ${modelClass}"></div>
          <span>${esc(s.model || '')}</span>
        </div>
      </div>`;
    }).join('');

    document.querySelectorAll('.session-item').forEach(el =>
      el.onclick = () => loadSession(parseInt(el.dataset.id))
    );

    document.querySelectorAll('.session-del-btn').forEach(btn => {
      btn.onclick = async e => {
        e.stopPropagation();
        if (!confirm('Delete this chat session and all its messages?')) return;
        const id = parseInt(btn.dataset.id);
        await db.deleteSession(id);
        if (curSid === id) {
          curSid = null;
          showWelcome();
        }
        await loadSessionsUI();
      };
    });
  }

  function showWelcome() {
    document.getElementById('messages').innerHTML = `
      <div id="welcome">
        <h2>// Agentic Assistant</h2>
        <p>Select a free model above to start coding.</p>
        <div class="tips">
          <div class="tip">🎤 Voice-to-text input enabled</div>
          <div class="tip">🔊 AI response speech enabled</div>
          <div class="tip">👻 Local Ghost-text suggestions</div>
          <div class="tip">⬆ Insert AI code directly into editor</div>
        </div>
      </div>`;
  }

  async function loadSession(id) {
    if (isGenerating) return;
    curSid = id;
    await loadSessionsUI();
    const msgs = await db.getMessages(id);
    document.getElementById('messages').innerHTML = '';
    msgs.forEach(m => renderMsg(m.role, m.content, m.model));
    document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
  }

  document.getElementById('new-chat-btn').onclick = async () => {
    if (isGenerating) return;
    curSid = null;
    await loadSessionsUI();
    showWelcome();
  };

  // ── Chat Rendering ────────────────
  function renderMsg(role, content, modelName) {
    const wrapper = document.createElement('div');
    wrapper.className = 'msg-wrapper';
    let avatarClass, avatarTxt, headerName, tagHtml = '';
    if (role === 'user') { avatarClass = 'avatar-user'; avatarTxt = 'U'; headerName = 'you'; }
    else if (role === 'peer') { avatarClass = 'avatar-peer'; avatarTxt = 'P'; headerName = esc(modelName || 'peer'); }
    else {
      avatarClass = 'avatar-ai'; avatarTxt = 'AI'; headerName = 'assistant';
      tagHtml = `<span class="msg-model-tag">${esc(modelName || 'AI')}</span>`;
    }
    const body = role === 'user' ? esc(content) : parseMd(content);
    wrapper.innerHTML = `
      <div class="msg-row ${role}">
        <div class="msg-header">
          <div class="msg-avatar ${avatarClass}">${avatarTxt}</div>
          <span>${headerName}</span>${tagHtml}
        </div>
        <div class="msg-body"><div class="content">${body}</div></div>
      </div>`;
    document.getElementById('messages').appendChild(wrapper);
    document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
    if (role !== 'user') wrapper.querySelectorAll('pre code').forEach(b => hljs.highlightElement(b));
    return wrapper;
  }

  const modelSelect = document.getElementById('model-select');
  // FIX 6: modelSelect Revert Tracker
  let lastModelValue = '';

  modelSelect.onchange = async e => {
    if (isGenerating) { e.target.value = lastModelValue; return; }
    lastModelValue    = e.target.value;
    activeModelName   = e.target.options[e.target.selectedIndex].text;
    const val         = e.target.value;
    activeModelEngine = val.includes('MLC') ? 'webllm'
      : val === 'ollama' ? 'ollama'
      : val === 'groq'   ? 'groq'
      : 'gemini';

    document.getElementById('status-dot').className  = 'status-dot loading';
    document.getElementById('status-label').textContent = 'Loading...';
    document.querySelectorAll('#user-input, #send-btn, #mic-btn').forEach(el => el.disabled = true);

    try {
      if (activeModelEngine === 'webllm') {
        document.getElementById('webllm-progress').classList.add('show');
        await adapters.webllm.init(val, (t, p) => {
          document.getElementById('progress-text').textContent = t;
          document.getElementById('progress-fill').style.width = (p * 100) + '%';
        });
        document.getElementById('webllm-progress').classList.remove('show');
      } else {
        await adapters[activeModelEngine].init();
      }
      document.querySelectorAll('#user-input, #send-btn, #mic-btn').forEach(el => el.disabled = false);
      document.getElementById('status-label').textContent = activeModelName + ' — Ready';
      document.getElementById('status-dot').className  = 'status-dot ready';
    } catch (err) {
      document.getElementById('status-label').textContent = err.message;
      document.getElementById('status-dot').className  = 'status-dot error';
      document.getElementById('webllm-progress').classList.remove('show');
      document.querySelectorAll('#user-input, #send-btn, #mic-btn').forEach(el => el.disabled = false);
    }
  };

  document.getElementById('send-btn').onclick = async () => {
    const input = document.getElementById('user-input');
    const val   = input.value.trim();
    if (!val || isGenerating || !activeModelEngine) return;
    isGenerating = true;
    input.value  = '';
    window.speechSynthesis?.cancel();
    modelSelect.disabled = true;

    saveVFS();
    const eCtx = `\n\n[Editor — ${activeFile}]:\n\`\`\`\n${vfs[activeFile]}\n\`\`\``;

    let isNewSession = false;
    if (!curSid) {
      curSid = await db.add('sessions', { title: val.slice(0, 30), model: activeModelName });
      isNewSession = true;
      await loadSessionsUI();
    }

    const histRaw = await db.getMessages(curSid);
    // FIX 14: Check history directly for title update instead of repeating DB call later
    if (histRaw.length === 0 && !isNewSession) {
      await db.updateSessionTitle(curSid, val.slice(0, 30));
      await loadSessionsUI();
    }

    const history = histRaw.slice(-10).map(m => ({
      role: (m.role === 'user' || m.role === 'peer') ? 'user' : 'assistant',
      content: m.content
    }));

    await db.add('messages', { session_id: curSid, role: 'user', content: val });

    document.getElementById('welcome')?.remove();
    renderMsg('user', val, '');
    broadcast('msg', { role: 'user', content: val, model: myNickname });

    const msgDiv   = renderMsg('ai', '...', activeModelName);
    const contentEl = msgDiv.querySelector('.content');
    contentEl.classList.add('cursor-blink');

    const messages = [
      { role: 'system', content: 'You are an expert coding assistant inside a browser IDE. Use markdown and fenced code blocks. Be concise, accurate, and helpful.' },
      ...history,
      { role: 'user', content: val + eCtx }
    ];

    let fullReply = '';
    try {
      for await (const chunk of adapters[activeModelEngine].chat(messages)) {
        fullReply += chunk;
        contentEl.innerHTML = parseMd(fullReply);
        document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
      }
      speak(fullReply);
      await db.add('messages', { session_id: curSid, role: 'assistant', content: fullReply, model: activeModelName });
      broadcast('msg', { role: 'ai', content: fullReply, model: activeModelName });
    } catch (e) {
      contentEl.innerHTML = `<span style="color:var(--danger)">Error: ${esc(e.message)}</span>`;
    }

    contentEl.classList.remove('cursor-blink');
    msgDiv.querySelectorAll('pre code').forEach(b => hljs.highlightElement(b));
    isGenerating = false;
    modelSelect.disabled = false;
  };

  document.getElementById('user-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('send-btn').click(); }
  });

  const savedCfg = JSON.parse(localStorage.getItem('ss_cfg') || '{}');
  document.getElementById('gemini-key').value   = savedCfg.gemini_key   || '';
  document.getElementById('groq-key').value     = savedCfg.groq_key     || '';
  document.getElementById('ollama-model').value = savedCfg.ollama_model || 'qwen2.5-coder:1.5b';
  document.getElementById('local-ip').value     = savedCfg.local_ip     || '';
  document.getElementById('piston-url').value   = savedCfg.piston_url   || '';

 document.getElementById('my-peer-id').onclick = function () {
    if (!myPeerId) { 
      alert('Node ID is not generated yet! P2P Network could not connect.'); 
      return; 
    }
    navigator.clipboard.writeText(myPeerId).then(() => {
      const old = this.textContent; this.textContent = '✓ Copied!';
      setTimeout(() => this.textContent = old, 1500);
    });
  };

  document.getElementById('copy-link-btn').onclick = function () {
    if (!myPeerId) { 
      alert('Node ID is not generated yet! Cannot copy link.'); 
      return; 
    }
    const link = `${location.origin}${location.pathname}?join=${myPeerId}`;
    navigator.clipboard.writeText(link).then(() => {
      const old = this.innerHTML;
      this.innerHTML = '✓ Copied!'; this.style.background = 'var(--success)'; this.style.color = '#fff';
      setTimeout(() => { this.innerHTML = old; this.style.background = 'var(--accent-dim)'; this.style.color = 'var(--accent)'; }, 1500);
    });
  };

  document.getElementById('settings-btn').onclick = () =>
    document.getElementById('settings-overlay').classList.add('open');

  document.getElementById('save-settings-btn').onclick = () => {
    const newCfg = {
      gemini_key:   document.getElementById('gemini-key').value.trim(),
      groq_key:     document.getElementById('groq-key').value.trim(),
      ollama_model: document.getElementById('ollama-model').value.trim() || 'qwen2.5-coder:1.5b',
      local_ip:     document.getElementById('local-ip').value.trim(),
      piston_url:   document.getElementById('piston-url').value.trim()
    };
    localStorage.setItem('ss_cfg', JSON.stringify(newCfg));
    adapters.gemini.k = newCfg.gemini_key;
    adapters.groq.k   = newCfg.groq_key;
    adapters.ollama.m = newCfg.ollama_model;
    window.closeSettings();
  };

  document.getElementById('clear-term-btn').onclick = () => {
    document.getElementById('terminal-output').innerHTML =
      `<span style="color:var(--muted)">$ SouthStack ready. Create a file and press ▶ Run Code</span>`;
  };

  document.getElementById('connect-peer-btn').onclick = () => {
    const tid = document.getElementById('target-peer-id').value.trim();
    if (!tid || !peer) return;
    setP2PStatus('Connecting...', 'connecting');
    const c = peer.connect(tid, { metadata: { nickname: myNickname } });
    c.on('open', () => { handleConn(c); document.getElementById('target-peer-id').value = ''; });
    c.on('error', () => setP2PStatus('Connection failed', 'error'));
  };

  // ── Offline badge ──
  function updateOnlineStatus() {
    const badge = document.getElementById('offline-badge');
    if (!badge) return;
    badge.style.display = navigator.onLine ? 'none' : 'inline-block';
  }
  window.addEventListener('online',  updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  // ── Font size from settings ──
  const savedFontSize = parseInt(localStorage.getItem('ss_fontsize') || '14');
  if (window.monacoEditor) window.monacoEditor.updateOptions({ fontSize: savedFontSize });
  const fontInput = document.getElementById('font-size-input');
  if (fontInput) {
    fontInput.value = savedFontSize;
    fontInput.oninput = () => {
      const sz = Math.max(10, Math.min(24, parseInt(fontInput.value) || 14));
      if (window.monacoEditor) window.monacoEditor.updateOptions({ fontSize: sz });
      localStorage.setItem('ss_fontsize', sz);
    };
  }

  // FIX 11: Store interval
  const _hintInterval = setInterval(() => {
    const h = document.getElementById('input-hint');
    if (!h) return;
    h.textContent = (window.monacoEditor?.getValue().trim() && activeModelEngine)
      ? '📎 Editor code will be attached' : '';
  }, 1000);

  setupPeer();
  renderFileList();
  await loadSessionsUI();
}

boot();