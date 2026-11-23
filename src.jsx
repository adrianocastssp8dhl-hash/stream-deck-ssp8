import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const TYPES = ['Apps Script', 'Google Sheets', 'Imagem', 'Link'];
const GLYPH = ['</>', '▦', '▧', '↗'];
const EMPTY = { name: '', url: '', type: 'Apps Script' };
const SCRIPT_KEY = 'painel-script-url';

// ── IndexedDB – apenas imagens enviadas do dispositivo (local) ──────────────
const localDB = new Promise((res, rej) => {
  const r = indexedDB.open('painel-files', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('files', { keyPath: 'id' });
  r.onsuccess = () => res(r.result);
  r.onerror   = () => rej(r.error);
});

async function dbAccess(action, value) {
  const db = await localDB;
  return new Promise((ok, fail) => {
    const tx    = db.transaction('files', action === 'getAll' ? 'readonly' : 'readwrite');
    const store = tx.objectStore('files');
    const req   = action === 'getAll' ? store.getAll() : store[action](value);
    tx.oncomplete = () => ok(req.result);
    tx.onerror = tx.onabort = () => fail(tx.error);
  });
}

// ── Google Sheets via Apps Script (somente GET para evitar problemas de CORS) ──
function getScriptUrl() { return localStorage.getItem(SCRIPT_KEY) || ''; }

async function sheetsApi(action, param) {
  const base = getScriptUrl();
  if (!base) throw new Error('configure');
  const u = new URL(base);
  u.searchParams.set('action', action);
  if (action === 'put')    u.searchParams.set('item', JSON.stringify(param));
  if (action === 'delete') u.searchParams.set('id', String(param));
  const res = await fetch(u.toString(), { redirect: 'follow' });
  if (!res.ok) throw new Error('Erro de rede (' + res.status + ').');
  const json = await res.json();
  if (json && json.error) throw new Error(json.error);
  return json;
}

// ── Migração dos dados do banco antigo (IndexedDB painel-atalhos-*) ─────────
async function migrateOldData() {
  if (!indexedDB.databases) return 0;
  const all    = await indexedDB.databases();
  const oldDbs = all.filter(d => d.name && d.name.startsWith('painel-atalhos-'));
  let count = 0;
  for (const info of oldDbs) {
    try {
      const db    = await new Promise((res, rej) => { const r = indexedDB.open(info.name); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
      const items = await new Promise((ok, fail) => { const tx = db.transaction('items', 'readonly'); const req = tx.objectStore('items').getAll(); tx.oncomplete = () => ok(req.result); tx.onerror = () => fail(tx.error); });
      db.close();
      for (const item of items) {
        if (item.file) {
          await dbAccess('put', { id: item.id, name: item.name, url: '', file: item.file, type: 'Imagem', time: item.time || Date.now(), _local: true });
        } else {
          await sheetsApi('put', { id: item.id, name: item.name, url: item.url, type: item.type, time: item.time || Date.now() });
        }
        count++;
      }
    } catch { /* ignora banco com problema */ }
  }
  return count;
}

// ── Componente de imagem ─────────────────────────────────────────────────────
function ImageThumb({ item }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!item.file) return;
    if (typeof item.file === 'string') { setUrl(item.file); return; }
    const u = URL.createObjectURL(item.file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [item.file]);
  return <img src={url || item.url || undefined} alt="" onError={e => e.currentTarget.hidden = true} />;
}

// ── App principal ────────────────────────────────────────────────────────────
function App() {
  const [page,        setPage]        = useState(location.hash);
  const [items,       setItems]       = useState([]);
  const [draft,       setDraft]       = useState(EMPTY);
  const [file,        setFile]        = useState(null);
  const [query,       setQuery]       = useState('');
  const [error,       setError]       = useState('');
  const [notice,      setNotice]      = useState('');
  const [busy,        setBusy]        = useState(false);
  const [syncing,     setSyncing]     = useState(false);
  const [view,        setView]        = useState(null);
  const [scriptUrl,   setScriptUrl]   = useState(getScriptUrl());
  const [configInput, setConfigInput] = useState(getScriptUrl());

  const manage = page === '#cadastro';

  async function refresh() {
    if (!getScriptUrl()) return;
    setSyncing(true);
    try {
      const [cloud, local] = await Promise.all([
        sheetsApi('getAll').then(r => r.map(i => ({ ...i, time: Number(i.time) || 0, _cloud: true }))).catch(() => []),
        dbAccess('getAll').then(r => r.map(i => ({ ...i, _local: true }))).catch(() => []),
      ]);
      const cloudIds = new Set(cloud.map(i => i.id));
      setItems([...cloud, ...local.filter(i => !cloudIds.has(i.id))].sort((a, b) => b.time - a.time));
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    refresh().catch(() => setError('Não foi possível carregar os atalhos.'));
    const nav = () => setPage(location.hash);
    window.addEventListener('hashchange', nav);
    return () => window.removeEventListener('hashchange', nav);
  }, [scriptUrl]);

  async function saveConfig(e) {
    e.preventDefault();
    const url = configInput.trim();
    if (!url) return;
    localStorage.setItem(SCRIPT_KEY, url);
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const migrated = await migrateOldData();
      setScriptUrl(url);
      if (migrated > 0) setNotice(`✓ ${migrated} atalho${migrated !== 1 ? 's' : ''} migrado${migrated !== 1 ? 's' : ''} do banco local para a nuvem.`);
    } catch {
      setScriptUrl(url);
    } finally {
      setBusy(false);
    }
    location.hash = 'inicio';
  }

  function reset() {
    setDraft(EMPTY); setFile(null);
    const f = document.querySelector('#file');
    if (f) f.value = '';
  }

  async function save(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const name    = draft.name.trim();
      const url     = draft.url.trim();
      const useFile = file || (!url && draft.file instanceof File ? draft.file : null);

      if (!name) throw new Error('Digite um nome para o botão.');
      if (!useFile && !/^https?:\/\//i.test(url)) throw new Error('Cole um link completo ou escolha uma imagem.');
      if (!useFile) { try { new URL(url); } catch { throw new Error('Confira o endereço do link.'); } }

      const id   = draft.id   || crypto.randomUUID();
      const time = draft.time || Date.now();

      if (useFile) {
        await dbAccess('put', { id, name, url: '', file: useFile, type: 'Imagem', time, _local: true });
        if (draft._cloud) await sheetsApi('delete', id).catch(() => {});
      } else {
        await sheetsApi('put', { id, name, url, type: draft.type, time });
        if (draft._local) await dbAccess('delete', id).catch(() => {});
      }

      await refresh(); reset(); setQuery(''); location.hash = 'inicio';
    } catch (err) {
      setError(err.message || 'Falha ao salvar. Tente novamente.');
    } finally { setBusy(false); }
  }

  function changeUrl(url) {
    let type = draft.type;
    try {
      const u = new URL(url);
      if (u.hostname === 'script.google.com') type = TYPES[0];
      if (u.hostname === 'docs.google.com' && u.pathname.startsWith('/spreadsheets/')) type = TYPES[1];
    } catch {}
    setDraft({ ...draft, url, type });
  }

  async function remove(item) {
    if (!confirm('Excluir "' + item.name + '"?')) return;
    try {
      if (item._local) await dbAccess('delete', item.id);
      else await sheetsApi('delete', item.id);
      await refresh();
      if (draft.id === item.id) reset();
    } catch { setError('Falha ao excluir. Tente novamente.'); }
  }

  const filtered = items.filter(i =>
    (i.name + ' ' + i.type).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  );

  function card(i) {
    return <>
      {i.type === 'Imagem'
        ? <ImageThumb item={i} />
        : <span className="symbol">{GLYPH[TYPES.indexOf(i.type)]}</span>}
      <span><strong>{i.name}</strong><small>{i.type}</small></span>
    </>;
  }

  // ── Bloco de configuração do Apps Script ──
  const configBlock = (
    <section className="config-section">
      <h2>⚙ Configurações de sincronização</h2>
      <p>Cole o URL do seu Web App (Apps Script) para sincronizar os atalhos entre dispositivos.</p>
      <form onSubmit={saveConfig}>
        <label>URL do Web App
          <input type="url" required value={configInput}
            onChange={e => setConfigInput(e.target.value)}
            placeholder="https://script.google.com/macros/s/…/exec" />
        </label>
        <button className="primary" disabled={busy}>Salvar configuração</button>
      </form>
    </section>
  );

  return <>
    <header>
      <div>
        <img className="brand" src="./logo.svg" alt="DHL" />
        <span>Painel de atalhos{syncing ? ' ⟳' : ''}</span>
      </div>
    </header>
    <main>
      {error  && <p role="alert" className="error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}

      {!scriptUrl ? <>
        {/* ── Primeira configuração ── */}
        <h1>Configurar sincronização</h1>
        <p>Antes de usar o painel, configure a sincronização com o Google Sheets.</p>
        {configBlock}
      </> : manage ? <>
        {/* ── Cadastro ── */}
        <h1>{draft.id ? 'Editar atalho' : 'Cadastrar atalho'}</h1>
        <p>Escolha o nome que vai aparecer no botão.</p>
        <form onSubmit={save}>
          <label>Nome do botão
            <input required maxLength="100" value={draft.name}
              placeholder="Ex.: Escalas A e B"
              onChange={e => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label>Categoria
            <select value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value })}>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label>Link
            <input type="url" placeholder="https://" value={draft.url}
              onChange={e => changeUrl(e.target.value)} />
          </label>
          {draft.type === 'Imagem' &&
            <label>Ou selecione uma imagem
              <input id="file" type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} />
              {draft.file && !file && <small>Imagem local mantida ao salvar sem novo arquivo ou link.</small>}
            </label>}
          <button className="primary" disabled={busy}>Salvar atalho</button>{' '}
          {draft.id && <button type="button" onClick={reset}>Cancelar edição</button>}
        </form>

        {items.length > 0 && <h2>Atalhos cadastrados</h2>}
        {items.map(i =>
          <section className="edit" key={i.id}>
            <div>
              <strong>{i.name}</strong>
              <small>{i.type} · {i._local ? '📱 local' : '☁ nuvem'}</small>
            </div>
            <button onClick={() => { reset(); setDraft(i); scrollTo(0, 0); }}>Editar</button>
            <button onClick={() => remove(i)}>Excluir</button>
          </section>)}

        {configBlock}
      </> : <>
        {/* ── Início ── */}
        <h1>Meus atalhos</h1>
        <p>Acesse suas ferramentas e referências do dia a dia.</p>
        <h2>Ferramentas Google</h2>
        <section className="quick">
          {[['Apps Script', 'https://script.google.com/home'], ['Google Sheets', 'https://docs.google.com/spreadsheets/']].map(([name, url], idx) =>
            <a key={name} href={url} target="_blank" rel="noopener">
              <span className="symbol">{GLYPH[idx]}</span><b>{name}</b>
            </a>)}
        </section>
        <div className="title">
          <h2>Minha coleção</h2>
          <small>{items.length} {items.length === 1 ? 'atalho' : 'atalhos'}</small>
        </div>
        {items.length > 0 &&
          <input className="search" type="search" aria-label="Buscar atalhos"
            placeholder="Buscar por nome ou categoria"
            value={query} onChange={e => setQuery(e.target.value)} />}
        <section className="grid">
          {filtered.map(i => i.file
            ? <button className="card" key={i.id} onClick={() => setView(i)}>{card(i)}</button>
            : <a className="card" key={i.id} href={i.url} target="_blank" rel="noopener">{card(i)}</a>)}
        </section>
        {!filtered.length &&
          <section className="empty">
            <p>{items.length ? 'Nenhum atalho encontrado.' : 'Guarde aqui os links e imagens que você mais usa.'}</p>
            {!items.length && <a className="primary" href="#cadastro">＋ Cadastrar primeiro atalho</a>}
          </section>}
      </>}
    </main>

    <nav aria-label="Navegação principal">
      <div>
        <a href="#inicio"   aria-current={!manage ? 'page' : undefined}>▦ Início</a>
        <a href="#cadastro" aria-current={manage  ? 'page' : undefined}>＋ Cadastro</a>
      </div>
    </nav>

    {view && <dialog ref={d => { if (d && !d.open) d.showModal(); }} onClose={() => setView(null)}>
      <h2>{view.name}</h2>
      <ImageThumb item={view} />
      <button autoFocus onClick={() => setView(null)}>Fechar</button>
    </dialog>}
  </>;
}

createRoot(document.getElementById('root')).render(<App />);
