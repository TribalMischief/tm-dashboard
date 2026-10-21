// Tribal Mischief owners' dashboard: node build.mjs -> dist/index.html (local only)
import fs from 'node:fs'; import path from 'node:path';
const ROOT=process.env.TM_ROOT||'/home/box/tribal-mischief', HERE=path.dirname(new URL(import.meta.url).pathname), BG=ROOT+'/brand-guide';
const rd=p=>fs.readFileSync(p,'utf8'), j=p=>JSON.parse(rd(path.join(HERE,p)));
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const linkify=s=>esc(s).replace(/https?:\/\/[^\s)<]+/g,u=>`<a href="${u}" target="_blank">${u.includes('docs.google')?'Doc':u.includes('drive.google')?'Drive':'Link'}</a>`);
const href=u=>/^https?:/.test(u)?u:'file://'+(u.startsWith('/')?u:ROOT+'/'+u);
const b64=p=>{try{return `data:image/${p.endsWith('.png')?'png':'jpeg'};base64,`+fs.readFileSync(p).toString('base64')}catch{return ''}};
const now=new Date();
// ---- board.md
const STAT=['Blocked','Ready for Review','Working','Todo','Done'];
const board=rd(ROOT+'/board.md'); const [tablePart,standPart='']=board.split(/^##\s+Standup notes\s*$/m);
const rows=[];
for(const line of tablePart.split('\n')){ if(!/^\s*\|/.test(line)) continue;
  const c=line.trim().replace(/^\||\|$/g,'').split('|').map(s=>s.trim());
  if(c.length<4||/^-+$/.test(c[0].replace(/[:\s]/g,''))||c[0]==='Task') continue;
  const [task,owner,status,updated]=[c.slice(0,c.length-3).join('|'),...c.slice(-3)];
  const st=STAT.find(s=>s.toLowerCase()===status.toLowerCase())||'Unknown';
  const d=/^\d{4}-\d{2}-\d{2}$/.test(updated)?new Date(updated+'T23:59:59-04:00'):null; // end of day ET
  rows.push({task,owner,status:st,updated,stale:st==='Working'&&d&&now-d>864e5,blocked:st==='Blocked'});}
const notes=[...standPart.matchAll(/^#{2,4}\s*(\d{4}-\d{2}-\d{2}).*$/gm)];
let latestNote=null; if(notes.length){const n=notes.sort((a,b)=>a[1]<b[1]?1:-1)[0];const s=standPart.slice(n.index+n[0].length);latestNote={date:n[1],body:s.split(/^#{2,4}\s/m)[0].trim()};}
else{const m=standPart.match(/(\d{4}-\d{2}-\d{2})[^\n]*\n?([\s\S]*)/); if(m) latestNote={date:m[1],body:m[0].trim()};}
// ---- data
const fin=j(fs.existsSync(path.join(HERE,'data/finance.json'))?'data/finance.json':'data/finance.example.json'), media=j('data/media.json');
const gdir=ROOT+'/graphics'; const carousels=fs.readdirSync(gdir,{withFileTypes:true}).filter(d=>d.isDirectory()&&!d.name.startsWith('_')&&/carousel|format|20\d\d-/.test(d.name)).map(d=>d.name);
const pb=ROOT+'/social-playbook.md'; const pbVer=(rd(pb).match(/^Version[^\n]*/m)||['(no version line)'])[0]; const pbM=fs.statSync(pb).mtime;
const fmt=d=>d.toLocaleString('en-US',{timeZone:'America/New_York',dateStyle:'medium',timeStyle:'short'})+' ET';
// ---- render
const css=['tokens/colors.css','tokens/typography.css','tokens/spacing.css'].map(f=>rd(BG+'/'+f)).join('\n');
const v=x=>x==null?'<span class="await">Awaiting data</span>':esc(x);
const asOf=t=>`<div class="meta">As of ${t.asOf?esc(t.asOf):'—'} · ${esc(t.source)}</div>`;
function tile(t){let b='';
  if('value' in t) b=`<div class="fig">${v(t.value)}</div>`;
  if(t.rows) b+=t.rows.map(r=>`<div class="kv"><span>${esc(r.label)}</span><span class="fs">${v(r.value)}</span></div>`).join('');
  for(const k of ['invoices','categories','weeks']) if(k in t) b+=t[k]?`<table>${t[k].map(r=>`<tr>${Object.values(r).map(x=>`<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</table>`:`<div class="fig sm"><span class="await">Awaiting data</span></div>${t.columns?`<div class="meta">${t.columns.map(esc).join(' · ')}</div>`:''}`;
  if(t.notes) b+=t.notes.map(n=>`<div class="note">${esc(n)}</div>`).join('');
  return `<div class="tile"><div class="eyebrow">${esc(t.title)}</div>${b}${asOf(t)}</div>`;}
const rowHtml=r=>`<tr class="${r.blocked?'blk':''}${r.stale?' stale':''}"><td>${linkify(r.task)}${r.blocked?' <span class="badge b-blk">Blocked</span>':''}${r.stale?' <span class="badge b-stale">Stale &gt;24h</span>':''}</td><td>${esc(r.owner)}</td><td class="meta">${esc(r.updated)}</td></tr>`;
const groups=[...STAT,'Unknown'].map(s=>[s,rows.filter(r=>r.status===s)]).filter(([s,g])=>g.length||s!=='Unknown');
const counts=Object.fromEntries(groups.map(([s,g])=>[s,g.length]));
const queue=rows.filter(r=>r.status==='Ready for Review');
const grp=([s,g])=>`<details ${s==='Done'?'':'open'}><summary><span class="h3">${s==='Ready for Review'?"Ready for Review":esc(s)}</span> <span class="meta">${g.length}</span></summary>${g.length?`<table>${g.map(rowHtml).join('')}</table>`:'<p class="meta">None.</p>'}</details>`;
const stageIdx=s=>media.stages.indexOf(s);
const mediaCard=m=>`<div class="card">${m.thumb?`<img src="${b64(m.thumb)}" alt="">`:''}<div class="eyebrow">${esc(m.type)} · ${esc(m.stage)}</div><div class="h3">${esc(m.title)}</div>
<div class="stages">${media.stages.map((s,i)=>`<span class="${i<stageIdx(m.stage)?'past':i===stageIdx(m.stage)?'cur':''}" title="${esc(s)}"></span>`).join('')}</div>
<div class="kv"><span>Waiting on</span><span><b>${esc(m.waitingOn)}</b></span></div><div class="kv"><span>Owners</span><span>${m.owners.map(esc).join(', ')}</span></div><div class="kv"><span>Open flags</span><span>${m.openFlags}</span></div>
<p>${esc(m.note)}</p><div class="links">${Object.entries(m.links).map(([k,u])=>`<a href="${href(u)}" target="_blank">${esc(k)}</a>`).join(' · ')}${(m.research||[]).length?`<br><span class="meta">Research:</span> ${m.research.map(r=>`<a href="${href(r)}">${esc(path.basename(r))}</a>`).join(' · ')}`:''}</div></div>`;
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Tribal Mischief · Owners</title><style>${css}
*{box-sizing:border-box;border-radius:var(--radius)}body{margin:0;background:var(--surface-page);color:var(--text-body);font:300 var(--type-body)/var(--lh-body) var(--font-sans)}
a{color:var(--link);text-decoration:none;border-bottom:var(--divider-light)}a:hover{color:var(--accent-secondary);opacity:.75}
header{background:var(--surface-dark);color:var(--text-on-dark);padding:var(--space-sm) var(--space-page-margin);display:flex;align-items:center;gap:var(--space-sm)}header img{height:28px}
header .t{font-family:var(--font-serif-display);font-size:var(--type-title-sm);letter-spacing:var(--ls-heading)}header .meta{margin-left:auto;color:var(--text-muted-on-dark)}
.fin{position:sticky;top:0;z-index:2;background:var(--surface-page);border-bottom:var(--divider-light);padding:var(--space-sm) var(--space-page-margin)}
.tiles{display:grid;grid-template-columns:repeat(7,1fr);gap:var(--space-sm)}.tile{background:var(--surface-card);border:var(--divider-light);border-top:var(--rule-accent);padding:var(--space-xs) var(--space-sm)}
.fig{font:300 var(--type-title-sm)/1.3 var(--font-sans);color:var(--accent)}.fig.sm{font-size:var(--type-body)}.fs{color:var(--accent)}.await{color:var(--text-secondary);font-size:var(--type-meta);font-style:italic}
main{padding:0 var(--space-page-margin) var(--space-section)}section{padding-top:var(--section-pad-y)}
h2{font:300 var(--type-title-md)/var(--lh-heading) var(--font-serif-display);letter-spacing:var(--ls-heading);margin:var(--space-xs) 0}
.rule{width:48px;height:1px;background:var(--accent);margin:var(--space-sm) 0 var(--space-base)}
.eyebrow{font-size:var(--type-eyebrow);letter-spacing:var(--ls-eyebrow);text-transform:uppercase;color:var(--accent-secondary);font-weight:400}
.h3{font:400 var(--type-title-sm)/1.2 var(--font-serif-display)}.meta{font-size:var(--type-meta);color:var(--text-secondary)}
.kv{display:flex;justify-content:space-between;gap:var(--space-xs);font-size:var(--type-meta);border-bottom:var(--divider-light)}.note{font-size:var(--type-meta);background:var(--surface-callout-teal);padding:var(--space-micro) var(--space-xs);margin-top:var(--space-xs)}
.cols{display:grid;grid-template-columns:2fr 1fr;gap:var(--space-lg)}table{width:100%;border-collapse:collapse}td{border-bottom:var(--divider-light);padding:var(--space-xs);vertical-align:top}td:first-child{padding-left:0}td.meta{white-space:nowrap}
summary{cursor:pointer;padding:var(--space-xs) 0;border-bottom:var(--divider-light)}details{margin-bottom:var(--space-base)}
.badge{font-size:var(--type-eyebrow);letter-spacing:var(--ls-label);text-transform:uppercase;padding:2px 6px;border:1px solid}.b-blk{color:var(--critique);border-color:var(--critique)}.b-stale{color:var(--accent-secondary)}
tr.blk td{background:var(--critique-bg)}.callout{background:var(--surface-card);border:var(--divider-light);border-left:var(--rule-accent);padding:var(--space-sm) var(--space-base);margin-bottom:var(--space-base)}
.callout table td{font-size:var(--type-meta)}pre{white-space:pre-wrap;font:inherit;margin:0}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-base)}.card{background:var(--surface-card);border:var(--divider-light);padding:var(--space-base)}.card img{width:100%;display:block;margin-bottom:var(--space-sm)}
.stages{display:flex;gap:3px;margin:var(--space-xs) 0}.stages span{flex:1;height:4px;background:var(--border-light)}.stages .past{background:var(--accent-secondary);opacity:.4}.stages .cur{background:var(--accent-secondary)}
.links{font-size:var(--type-meta);margin-top:var(--space-xs)}ul{padding-left:var(--space-sm)}
</style></head><body>
<header><img src="${b64(BG+'/assets/circle-mark-white.png')}" alt=""><span class="t">Tribal Mischief · Owners</span><span class="meta">Built ${fmt(now)}${process.env.DEPLOY===undefined?' · Local prototype':''}</span></header>
<div class="fin"><div class="eyebrow">Finances · Awaiting Josh</div><div class="tiles">${fin.tiles.map(tile).join('')}</div></div>
<main><section><div class="eyebrow">Projects</div><h2>What's moving</h2><div class="rule"></div><div class="cols"><div>${groups.map(grp).join('')}</div>
<div><div class="callout"><div class="eyebrow">Ethan's queue</div><div class="h3">${queue.length} waiting for review</div><table>${queue.map(r=>`<tr><td>${linkify(r.task)}</td><td class="meta">${esc(r.owner)}</td></tr>`).join('')}</table></div>
<div class="callout"><div class="eyebrow">Latest standup</div>${latestNote?`<div class="meta">${esc(latestNote.date)}</div><pre>${linkify(latestNote.body)}</pre>`:'<p class="meta">No standup notes yet.</p>'}</div></div></div></section>
<section><div class="eyebrow">Blog and media</div><h2>In the works</h2><div class="rule"></div><p class="meta">Stages: ${media.stages.join(' → ')} · <a href="${media.driveRoot}" target="_blank">Blog Entries in Drive</a></p>
<div class="grid">${media.items.map(mediaCard).join('')}</div>
<div class="cols" style="margin-top:var(--space-lg)"><div class="callout"><div class="eyebrow">Carousel folders</div><table>${carousels.map(c=>`<tr><td><a href="${href(gdir+'/'+c)}">${esc(c)}</a></td><td class="meta">${esc(media.carouselStatus[c]||'Unlabeled')}</td></tr>`).join('')}</table></div>
<div class="callout"><div class="eyebrow">Social playbook</div><a href="${href(pb)}">social-playbook.md</a><p class="meta">${esc(pbVer)}<br>Last updated ${fmt(pbM)} · weekly scan Mondays ~8am ET</p></div></div></section></main></body></html>`;
fs.mkdirSync(HERE+'/dist',{recursive:true}); fs.writeFileSync(HERE+'/dist/index.html',html);
console.log(JSON.stringify({rows:rows.length,counts,stale:rows.filter(r=>r.stale).map(r=>r.task),blocked:rows.filter(r=>r.blocked).map(r=>r.task),latestNote:latestNote?.date??null,carousels}));
