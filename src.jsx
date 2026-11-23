import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
const types=['Apps Script','Google Sheets','Imagem','Link'];
const glyph=['</>','▦','▧','↗'];
const empty={name:'',url:'',type:'Apps Script'};
const database=new Promise((resolve,reject)=>{
  const request=indexedDB.open('painel-atalhos-'+location.pathname.replace(/index\.html$/,''),1);
  request.onupgradeneeded=()=>request.result.createObjectStore('items',{keyPath:'id'});
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
});
async function access(action,value){
  const db=await database;
  return new Promise((ok,fail)=>{
    const tx=db.transaction('items',action==='getAll'?'readonly':'readwrite');
    const store=tx.objectStore('items');
    const req=action==='getAll'?store.getAll():store[action](value);
    tx.oncomplete=()=>ok(req.result);
    tx.onerror=tx.onabort=()=>fail(tx.error);
  });
}
function ImageThumb({item}){
 const [url,setUrl]=useState('');
 useEffect(()=>{if(!item.file)return;const u=URL.createObjectURL(item.file);setUrl(u);return()=>URL.revokeObjectURL(u)},[item.file]);
 return <img src={url||item.url||undefined} alt="" onError={e=>e.currentTarget.hidden=true}/>;
}
function App(){
 const [page,setPage]=useState(location.hash),[items,setItems]=useState([]),[draft,setDraft]=useState(empty),[file,setFile]=useState(null),[query,setQuery]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[view,setView]=useState(null);
 const manage=page==='#cadastro';
 async function refresh(){setItems((await access('getAll')).sort((a,b)=>b.time-a.time))}
 useEffect(()=>{refresh().catch(()=>setError('Não foi possível ler os atalhos neste navegador.'));const navigate=()=>setPage(location.hash);window.addEventListener('hashchange',navigate);return()=>window.removeEventListener('hashchange',navigate)},[]);
 function reset(){setDraft(empty);setFile(null);const f=document.querySelector('#file');if(f)f.value=''}
 async function save(e){
 e.preventDefault();setError('');setBusy(true);
 try{
 const name=draft.name.trim(),url=draft.url.trim(),image=draft.type==='Imagem'?(file||(!url&&draft.file)):null;
 if(!name)throw Error('Digite um nome para o botão.');
 if(!image&&!/^https?:\/\//i.test(url))throw Error('Cole um link completo ou escolha uma imagem.');
 if(!image){try{new URL(url)}catch{throw Error('Confira o endereço do link.')}}
 await access('put',{id:draft.id||crypto.randomUUID(),name,url:image?'':url,file:image||null,type:draft.type,time:draft.time||Date.now()});
 await refresh();reset();setQuery('');location.hash='inicio';
 }catch(e){setError(e.name==='Error'?e.message:'Falha ao salvar. Verifique o espaço disponível no dispositivo.')}finally{setBusy(false)}
 }
 function changeUrl(url){let type=draft.type;try{const u=new URL(url);if(u.hostname==='script.google.com')type=types[0];if(u.hostname==='docs.google.com'&&u.pathname.startsWith('/spreadsheets/'))type=types[1]}catch{}setDraft({...draft,url,type})}
 async function remove(item){if(!confirm('Excluir “'+item.name+'”?'))return;try{await access('delete',item.id);await refresh();if(draft.id===item.id)reset()}catch{setError('Falha ao excluir. Tente novamente.')}}
 const filtered=items.filter(i=>(i.name+' '+i.type).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 function content(i){return <>{i.type==='Imagem'?<ImageThumb item={i}/>:<span className="symbol">{glyph[types.indexOf(i.type)]}</span>}<span><strong>{i.name}</strong><small>{i.type}</small></span></>}
 return <><header><div><img className="brand" src="./logo.svg" alt="DHL"/><span>Painel de atalhos</span></div></header><main>{error&&<p role="alert" className="error">{error}</p>}{manage?<><h1>{draft.id?'Editar atalho':'Cadastrar atalho'}</h1><p>Escolha o nome que vai aparecer no botão.</p><form onSubmit={save}><label>Nome do botão<input required maxLength="100" value={draft.name} placeholder="Ex.: Escalas A e B" onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label>Categoria<select value={draft.type} onChange={e=>setDraft({...draft,type:e.target.value})}>{types.map(t=><option key={t}>{t}</option>)}</select></label><label>Link<input type="url" placeholder="https://" value={draft.url} onChange={e=>changeUrl(e.target.value)}/></label>{draft.type==='Imagem'&&<label>Ou selecione uma imagem<input id="file" type="file" accept="image/*" onChange={e=>setFile(e.target.files[0])}/>{draft.file&&!file&&<small>Imagem atual mantida ao salvar sem novo arquivo ou link.</small>}</label>}<button className="primary" disabled={busy}>Salvar atalho</button> {draft.id&&<button type="button" onClick={reset}>Cancelar edição</button>}</form>{items.length>0&&<h2>Atalhos cadastrados</h2>}{items.map(i=><section className="edit" key={i.id}><div><strong>{i.name}</strong><small>{i.type}</small></div><button onClick={()=>{reset();setDraft(i);scrollTo(0,0)}}>Editar</button><button onClick={()=>remove(i)}>Excluir</button></section>)}</>:<><h1>Meus atalhos</h1><p>Acesse suas ferramentas e referências do dia a dia.</p><h2>Ferramentas Google</h2><section className="quick">{[['Apps Script','https://script.google.com/home'],['Google Sheets','https://docs.google.com/spreadsheets/']].map(([name,url],idx)=><a key={name} href={url} target="_blank" rel="noopener"><span className="symbol">{glyph[idx]}</span><b>{name}</b></a>)}</section><div className="title"><h2>Minha coleção</h2><small>{items.length} {items.length===1?'atalho':'atalhos'}</small></div>{items.length>0&&<input className="search" type="search" aria-label="Buscar atalhos" placeholder="Buscar por nome ou categoria" value={query} onChange={e=>setQuery(e.target.value)}/>}<section className="grid">{filtered.map(i=>i.file?<button className="card" key={i.id} onClick={()=>setView(i)}>{content(i)}</button>:<a className="card" key={i.id} href={i.url} target="_blank" rel="noopener">{content(i)}</a>)}</section>{!filtered.length&&<section className="empty"><p>{items.length?'Nenhum atalho encontrado.':'Guarde aqui os links e imagens que você mais usa.'}</p>{!items.length&&<a className="primary" href="#cadastro">＋ Cadastrar primeiro atalho</a>}</section>}</>}</main><nav aria-label="Navegação principal"><div><a href="#inicio" aria-current={!manage?'page':undefined}>▦ Início</a><a href="#cadastro" aria-current={manage?'page':undefined}>＋ Cadastro</a></div></nav>{view&&<dialog ref={d=>{if(d&&!d.open)d.showModal()}} onClose={()=>setView(null)}><h2>{view.name}</h2><ImageThumb item={view}/><button autoFocus onClick={()=>setView(null)}>Fechar</button></dialog>}</>;
}
createRoot(document.getElementById('root')).render(<App/>);
