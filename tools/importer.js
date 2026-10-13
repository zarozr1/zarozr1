/* Spreadsheet importer shared by index.html and shared-tracker.html.
   Reads .xlsx/.xlsm (no library: unzips with the browser's DecompressionStream),
   .csv, .tsv, .txt (including Excel "Unicode text") and .json.
   The user picks the sheet and header row and can correct the column matching. */
const Importer = (() => {
  let cfg = null, st = null, root = null, input = null, toastEl = null;

  /* Header words people use for each field (English and Arabic). */
  const SYN = {
    type:['type','direction','cheque type','check type','pay collect','collect pay','pay or collect','in out','payable receivable','receivable payable','pay receive','نوع','النوع'],
    chequeNo:['cheque no','cheque number','check no','check number','chq no','chq','cheque','check','cheque #','check #','رقم الشيك','الشيك'],
    party:['party','payee','payer','name','beneficiary','customer','client','company','vendor','drawer','issued to','received from','المستفيد','الاسم','العميل','الجهة'],
    bank:['bank','bank name','drawn on','البنك','اسم البنك'],
    amount:['amount','value','total','total amount','sum','price','cost','net amount','المبلغ','القيمة','الاجمالي','الإجمالي'],
    issueDate:['issue date','issued on','date issued','written date','تاريخ الاصدار','تاريخ الإصدار'],
    dueDate:['due date','cheque date','check date','maturity date','deposit date','value date','due','date','تاريخ الاستحقاق','تاريخ الشيك','التاريخ'],
    ref:['ref','reference','invoice','invoice no','linked','المرجع','الفاتورة'],
    status:['status','state','stage','الحالة'],
    notes:['notes','note','remarks','remark','comments','comment','ملاحظات','ملاحظة'],
    item:['item','description','product','goods','material','item name','particulars','الصنف','البيان','الوصف'],
    supplier:['supplier','vendor','seller','company','المورد'],
    qty:['qty','quantity','units','pcs','no of units','الكمية','العدد'],
    requestedBy:['requested by','requester','request by','employee','department','مقدم الطلب','الطالب'],
    requestDate:['request date','requested on','date requested','pr date','order date','تاريخ الطلب'],
    expectedDate:['expected date','expected delivery','delivery date','eta','due date','due','تاريخ التسليم','تاريخ التوريد'],
    poNo:['po','po no','po number','purchase order','lpo','lpo no','invoice no','رقم امر الشراء','رقم أمر الشراء'],
    title:['task','title','subject','activity','work','description','job','المهمة','العمل','الموضوع'],
    owner:['owner','assigned to','assignee','responsible','person','staff','المسؤول','الموظف'],
    priority:['priority','importance','urgency','الأولوية','الاولوية'],
    date:['date','due date','follow up','follow up date','deadline','due','التاريخ','الموعد'],
    category:['category','area','section','group','الفئة','القسم']
  };
  const SHEET_HINT = {cheques:/cheq|check|chq|شيك/i, purchases:/purchas|order|procure|buy|مشتر|شراء/i, tasks:/task|daily|work|todo|مهام|عمل/i};
  const DUPE_KEY = {cheques:['chequeNo','party'], purchases:['item','supplier','expectedDate'], tasks:['title','date']};
  const OPTION_ALIAS = [[/^(issued|payable|pay|outgoing|out)\b/,'need to pay'],[/^(received|receivable|incoming|in|collect)\b/,'to collect'],
    [/^(completed?|finished|closed)\b/,'done'],[/^(ongoing|in-progress|started)\b/,'in progress']];

  const norm = s => String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const colName = i => { let s = ''; i++; while (i){ const r = (i-1)%26; s = String.fromCharCode(65+r)+s; i = (i-1-r)/26; } return s; };
  const blank = v => v==null || String(v).trim()==='';

  /* ---------- file reading ---------- */
  async function readFile(f){
    const b = new Uint8Array(await f.arrayBuffer());
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (b[0]===0xD0 && b[1]===0xCF && b[2]===0x11) throw new Error('This is an older Excel file (.xls). Open it in Excel, choose File > Save As > Excel Workbook (.xlsx), then import the new file.');
    if (b[0]===0x50 && b[1]===0x4B) return readXlsx(b);
    if (ext==='xls' || ext==='ods' || ext==='numbers') throw new Error('This file type cannot be read. Save it as an Excel Workbook (.xlsx) or CSV, then import it.');
    let text;
    if (b[0]===0xFF && b[1]===0xFE) text = new TextDecoder('utf-16le').decode(b.subarray(2));
    else if (b[0]===0xFE && b[1]===0xFF) text = new TextDecoder('utf-16be').decode(b.subarray(2));
    else { try { text = new TextDecoder('utf-8',{fatal:true}).decode(b); } catch(_) { text = new TextDecoder('windows-1256').decode(b); } }
    text = text.replace(/^﻿/,'');
    const trimmed = text.trim();
    if (ext==='json' || /^[\[{]/.test(trimmed)){
      let j; try { j = JSON.parse(trimmed); } catch(_) { throw new Error('This JSON file could not be read. Check that it is valid JSON.'); }
      return {sheets: jsonSheets(j, f.name)};
    }
    return {sheets:[{name: f.name.replace(/\.[^.]+$/,''), rows: parseDelimited(text)}]};
  }
  function jsonSheets(j, fname){
    const toRows = arr => { const objs = arr.filter(o => o && typeof o==='object' && !Array.isArray(o));
      const keys = [...new Set(objs.flatMap(o => Object.keys(o)))].filter(k => k!=='id');
      return [keys, ...objs.map(o => keys.map(k => o[k] ?? ''))]; };
    if (Array.isArray(j)) return [{name: fname, rows: toRows(j)}];
    const out = Object.entries(j).filter(([,v]) => Array.isArray(v) && v.length).map(([k,v]) => ({name:k, rows:toRows(v)}));
    if (!out.length) throw new Error('No list of records was found in this JSON file.');
    return out;
  }
  function parseDelimited(text){
    const first = text.split(/\r?\n/)[0] || '';
    const delim = [',',';','\t','|'].map(d => [d, first.split(d).length]).sort((a,b) => b[1]-a[1])[0][0];
    const rows = []; let row = [], cur = '', q = false;
    for (let i=0;i<text.length;i++){
      const c = text[i];
      if (q){ if (c==='"'){ if (text[i+1]==='"'){ cur+='"'; i++; } else q = false; } else cur += c; }
      else if (c==='"' && cur==='') q = true;
      else if (c===delim){ row.push(cur); cur=''; }
      else if (c==='\n' || c==='\r'){ if (c==='\r' && text[i+1]==='\n') i++; row.push(cur); cur=''; rows.push(row); row=[]; }
      else cur += c;
    }
    if (cur!=='' || row.length){ row.push(cur); rows.push(row); }
    return rows;
  }

  async function unzip(b, want){
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    let e = -1;
    for (let i=b.length-22; i>=Math.max(0,b.length-65557); i--) if (dv.getUint32(i,true)===0x06054b50){ e = i; break; }
    if (e<0) throw new Error('This file is damaged or is not an Excel workbook.');
    const n = dv.getUint16(e+10,true); let p = dv.getUint32(e+16,true); const out = {};
    const td = new TextDecoder();
    for (let k=0;k<n;k++){
      if (dv.getUint32(p,true)!==0x02014b50) break;
      const method = dv.getUint16(p+10,true), csize = dv.getUint32(p+20,true), nl = dv.getUint16(p+28,true),
            xl = dv.getUint16(p+30,true), cl = dv.getUint16(p+32,true), lo = dv.getUint32(p+42,true);
      const name = td.decode(b.subarray(p+46,p+46+nl)).replace(/^\//,'');
      p += 46+nl+xl+cl;
      if (!want(name)) continue;
      const ds = lo+30+dv.getUint16(lo+26,true)+dv.getUint16(lo+28,true);
      const raw = b.subarray(ds, ds+csize);
      if (method===0) out[name.toLowerCase()] = raw;
      else if (method===8) out[name.toLowerCase()] = await inflate(raw);
    }
    return out;
  }
  async function inflate(raw){
    if (typeof DecompressionStream==='undefined') throw new Error('This browser cannot open Excel files. Update Edge or Chrome, or save the sheet as CSV and import that.');
    const s = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }
  const tags = (node, name) => node ? Array.from(node.getElementsByTagNameNS('*', name)) : [];
  const attr = (el, local) => { for (const a of el.attributes) if (a.localName===local) return a.value; return null; };

  async function readXlsx(b){
    const z = await unzip(b, n => /^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedstrings\.xml|styles\.xml|worksheets\/[^/]+\.xml)$/i.test(n) || /^content\.xml$/i.test(n));
    if (!z['xl/workbook.xml']) throw new Error(z['content.xml'] ? 'OpenDocument spreadsheets (.ods) cannot be read. Save it as an Excel Workbook (.xlsx), then import it.' : 'This file is not an Excel workbook.');
    const X = u8 => u8 ? new DOMParser().parseFromString(new TextDecoder().decode(u8), 'application/xml') : null;
    const wb = X(z['xl/workbook.xml']);
    const pr = tags(wb,'workbookPr')[0], d1904 = pr && /^(1|true)$/.test(pr.getAttribute('date1904') || '');
    const rels = {}; tags(X(z['xl/_rels/workbook.xml.rels']),'Relationship').forEach(r => rels[r.getAttribute('Id')] = r.getAttribute('Target'));
    const sst = tags(X(z['xl/sharedstrings.xml']),'si').map(si => tags(si,'t').filter(t => t.parentNode.localName!=='rPh').map(t => t.textContent).join(''));
    const styles = X(z['xl/styles.xml']), custom = {};
    tags(styles,'numFmt').forEach(f => custom[f.getAttribute('numFmtId')] = f.getAttribute('formatCode') || '');
    const xfs = tags(tags(styles,'cellXfs')[0],'xf').map(x => +(x.getAttribute('numFmtId') || 0));
    const isDate = s => { const id = xfs[+s || 0] || 0;
      if ((id>=14 && id<=22) || (id>=45 && id<=47) || (id>=27 && id<=36) || (id>=50 && id<=58)) return true;
      const code = (custom[id] || '').replace(/"[^"]*"|\[[^\]]*\]|\\./g,''); return /[dmy]/i.test(code) && !/^general$/i.test(code); };
    const sheets = [];
    for (const sh of tags(wb,'sheet')){
      let target = rels[attr(sh,'id')]; if (!target) continue;
      target = (target.startsWith('/') ? target.slice(1) : 'xl/'+target.replace(/^\.\//,'')).toLowerCase();
      const doc = X(z[target]); if (!doc) continue;
      const rows = []; let rn = 0;
      for (const row of tags(doc,'row')){
        rn = +row.getAttribute('r') || rn+1; if (rn>5000) break;
        const cells = []; let cn = -1;
        for (const c of Array.from(row.children).filter(x => x.localName==='c')){
          const ref = c.getAttribute('r'); cn = ref ? ref.replace(/\d+/g,'').split('').reduce((a,ch) => a*26 + ch.charCodeAt(0)-64, 0)-1 : cn+1;
          if (cn>80) continue;
          const t = c.getAttribute('t'), v = tags(c,'v')[0]?.textContent;
          let val = '';
          if (t==='s') val = sst[+v] ?? '';
          else if (t==='inlineStr') val = tags(c,'t').map(x => x.textContent).join('');
          else if (t==='str') val = v ?? '';
          else if (t==='b') val = v==='1' ? 'TRUE' : 'FALSE';
          else if (t==='e') val = '';
          else if (v!=null && v!==''){ const num = +v; val = isDate(c.getAttribute('s')) ? serialToIso(num, d1904) : num; }
          cells[cn] = val;
        }
        rows[rn-1] = Array.from(cells, x => x ?? '');
      }
      sheets.push({name: sh.getAttribute('name') || 'Sheet', rows: Array.from(rows, r => r || [])});
    }
    if (!sheets.length) throw new Error('No sheets with data were found in this workbook.');
    return {sheets};
  }
  function serialToIso(n, d1904){
    const d = new Date(Math.round((n + (d1904 ? 1462 : 0) - 25569) * 864e5));
    return isNaN(d) ? '' : d.toISOString().slice(0,10);
  }

  /* ---------- value conversion ---------- */
  const digits = s => String(s).replace(/[٠-٩]/g, d => d.charCodeAt(0)-0x660).replace(/[۰-۹]/g, d => d.charCodeAt(0)-0x6F0).replace(/٫/g,'.').replace(/٬/g,',');
  function ymd(y,m,d){
    const t = new Date(Date.UTC(y,m-1,d));
    return (m>=1 && m<=12 && t.getUTCDate()===d && t.getUTCMonth()===m-1) ? t.toISOString().slice(0,10) : '';
  }
  function parseDate(raw, order){
    if (blank(raw)) return '';
    if (typeof raw==='number') return raw>20000 && raw<80000 ? serialToIso(raw,false) : '';
    const s = digits(raw).trim();
    let m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})(?:\D|$)/);
    if (m) return ymd(+m[1],+m[2],+m[3]);
    m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2}|\d{4})(?:\D|$)/);
    if (m){ let a = +m[1], b = +m[2], y = +m[3]; if (y<100) y += 2000;
      const first = order==='mdy' ? ymd(y,a,b) : ymd(y,b,a);
      return first || (order==='mdy' ? ymd(y,b,a) : ymd(y,a,b)); }
    if (/^\d{5}(\.\d+)?$/.test(s)) return parseDate(+s, order);
    const t = Date.parse(s);
    if (!isNaN(t) && /[a-z]/i.test(s)){ const d = new Date(t); return ymd(d.getFullYear(), d.getMonth()+1, d.getDate()); }
    return '';
  }
  function parseNum(raw){
    if (typeof raw==='number') return raw;
    let s = digits(raw ?? '').replace(/[^\d.,\-]/g,'');
    if (!/\d/.test(s)) return '';
    if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',')>s.lastIndexOf('.') ? s.replace(/\./g,'').replace(',','.') : s.replace(/,/g,'');
    else if (s.includes(',')) s = (/,\d{3}$/.test(s) || (s.match(/,/g)||[]).length>1) ? s.replace(/,/g,'') : s.replace(',','.');
    const x = parseFloat(s); return Number.isFinite(x) ? x : '';
  }
  function matchOption(opts, raw){
    let v = String(raw ?? '').trim().toLowerCase(); if (!v) return null;
    for (const [re, to] of OPTION_ALIAS) if (re.test(v) && opts.some(o => o.toLowerCase()===to)) { v = to; break; }
    return opts.find(o => o.toLowerCase()===v) || opts.find(o => o.toLowerCase().startsWith(v)) || opts.find(o => v.startsWith(o.toLowerCase())) || null;
  }
  /* Unmapped fields: dates stay blank unless required; other fields take their default. */
  const usesDefault = f => !!f.d && (f.t!=='date' || !!f.req);
  const defaultOf = (M,f) => { const o = cfg.optsOf(M,f); return f.d ? f.d() : o ? o[0] : ''; };

  /* ---------- matching ---------- */
  function autoMap(header, m){
    const M = cfg.modules[m], cands = [];
    const hn = header.map(norm);
    M.fields.forEach((f, fi) => {
      const words = [f.l, f.k, ...(SYN[f.k] || [])].map(norm).filter(Boolean);
      hn.forEach((h, ci) => {
        if (!h) return;
        let sc = 0;
        for (const w of words){
          if (h===w) sc = Math.max(sc, 3);
          else if (w.length>=3 && (h.startsWith(w) || w.startsWith(h) && h.length>=3)) sc = Math.max(sc, 2);
          else if (w.length>=4 && h.includes(w)) sc = Math.max(sc, 1);
        }
        if (sc) cands.push({k:f.k, ci, sc: sc*10 + (f.req ? 1 : 0), fi});
      });
    });
    cands.sort((a,b) => b.sc-a.sc || a.fi-b.fi);
    const map = {}, used = new Set();
    for (const c of cands) if (!(c.k in map) && !used.has(c.ci)){ map[c.k] = c.ci; used.add(c.ci); }
    return map;
  }
  function detectHeader(rows, m){
    let best = {row:0, score:-1, map:{}};
    for (let i=0; i<Math.min(rows.length, 20); i++){
      const r = rows[i] || []; if (r.every(blank)) continue;
      const map = autoMap(r.map(String), m), texts = r.filter(v => typeof v==='string' && v.trim() && !/^[\d.,\-\/ ]+$/.test(v)).length;
      const score = Object.keys(map).length*10 + texts;
      if (score>best.score) best = {row:i, score, map};
    }
    return best;
  }
  function chooseSheet(book, m){
    let bi = 0, bs = -1;
    book.sheets.forEach((s,i) => { const sc = (SHEET_HINT[m] && SHEET_HINT[m].test(s.name) ? 50 : 0) + detectHeader(s.rows, m).score; if (sc>bs){ bs = sc; bi = i; } });
    return bi;
  }
  function setSheet(i){
    st.sheet = i; const rows = st.book.sheets[i].rows;
    const h = detectHeader(rows, st.m); st.header = h.row; applyMap(h.map);
  }
  function applyMap(map){
    const M = cfg.modules[st.m]; st.map = {};
    M.fields.forEach(f => { st.map[f.k] = f.k in map ? 'c:'+map[f.k] : (cfg.optsOf(M,f) ? 'v:'+defaultOf(M,f) : ''); });
  }

  /* ---------- building records ---------- */
  function compute(){
    const M = cfg.modules[st.m], rows = st.book.sheets[st.sheet].rows;
    const data = rows.slice(st.header+1).filter(r => r && !r.every(blank));
    const keyOf = r => (DUPE_KEY[st.m] || []).map(k => norm(r[k])).join('|');
    const have = new Set(DUPE_KEY[st.m] ? cfg.existing(st.m).map(keyOf) : []);
    const good = [], skipped = {}, today = cfg.today(); let dupes = 0;
    for (const r of data){
      const rec = {}; let why = '';
      for (const f of M.fields){
        const how = st.map[f.k] || '', raw = how.startsWith('c:') ? r[+how.slice(2)] : undefined, opts = cfg.optsOf(M,f);
        let v;
        if (how.startsWith('v:')) v = how.slice(2);
        else if (opts) v = matchOption(opts, raw) || defaultOf(M,f);
        else if (f.t==='number') v = parseNum(raw);
        else if (f.t==='date') v = parseDate(raw, st.order);
        else v = blank(raw) ? '' : (typeof raw==='number' ? String(raw) : String(raw).trim());
        if ((v==='' || v==null) && usesDefault(f) && !how.startsWith('c:')) v = f.d();
        rec[f.k] = v ?? '';
        if (f.req && rec[f.k]==='' && !why) why = f.l + (f.t==='date' ? ' missing or not a date' : f.t==='number' ? ' missing or not a number' : ' missing');
      }
      if (why){ skipped[why] = (skipped[why] || 0) + 1; continue; }
      if (st.skipDupes && DUPE_KEY[st.m]){ const k = keyOf(rec); if (have.has(k)){ dupes++; continue; } have.add(k); }
      rec.created = today; good.push(rec);
    }
    return {good, skipped, dupes, total: data.length};
  }

  /* ---------- UI ---------- */
  const CSS = `
  .imp-scrim{position:fixed;inset:0;background:rgba(8,14,18,.55);display:flex;align-items:flex-start;justify-content:center;padding:4vh 16px;overflow-y:auto;z-index:50}
  .imp-box{background:var(--panel,var(--card,#fff));color:var(--ink,#1c2230);border:1px solid var(--line,#dde3e7);border-radius:10px;width:min(780px,100%);padding:20px;display:grid;gap:14px;min-width:0}
  .imp-box h3{margin:0;font-size:17px}
  .imp-file{color:var(--mute,#667085);font-size:13px;margin-top:-10px;overflow-wrap:anywhere}
  .imp-opts{display:flex;flex-wrap:wrap;gap:10px}
  .imp-opts label,.imp-map label{display:grid;gap:3px;font-size:13px;color:var(--mute,#667085)}
  .imp-opts select,.imp-opts input,.imp-map select{background:var(--panel,var(--card,#fff));color:var(--ink,#1c2230);border:1px solid var(--line,#dde3e7);border-radius:6px;padding:6px 8px;font:inherit;font-size:14px;min-width:0;max-width:100%}
  .imp-opts input{width:80px}
  .imp-map{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
  .imp-map .sample{font-size:12px;color:var(--mute,#667085);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .imp-map .need{color:var(--bad,#c0362c)}
  .imp-sum{font-size:14px;display:grid;gap:4px}
  .imp-sum .ok{font-weight:600}
  .imp-sum .warn{color:var(--bad,#c0362c)}
  .imp-prev{overflow-x:auto;border:1px solid var(--line,#dde3e7);border-radius:8px}
  .imp-prev table{border-collapse:collapse;width:100%;min-width:560px;font-size:13px}
  .imp-prev th,.imp-prev td{padding:6px 8px;border-bottom:1px solid var(--line,#dde3e7);text-align:left;white-space:nowrap;max-width:220px;overflow:hidden;text-overflow:ellipsis}
  .imp-prev th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--mute,#667085)}
  .imp-acts{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}
  .imp-btn{border-radius:6px;padding:8px 14px;cursor:pointer;font:inherit;font-weight:600;border:1px solid var(--line,#dde3e7);background:none;color:var(--ink,#1c2230)}
  .imp-btn.go{background:var(--accent,var(--brand,#1f5fbf));color:var(--accent-ink,#fff);border-color:transparent}
  .imp-btn[disabled]{opacity:.5;cursor:not-allowed}
  .imp-err{color:var(--bad,#c0362c);font-size:14px}
  .imp-chk{display:flex;gap:8px;align-items:center;font-size:14px;justify-content:flex-start}
  .imp-chk input{width:auto;flex:none;margin:0}
  .imp-toast{position:fixed;left:50%;bottom:calc(20px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:var(--ink,#1c2230);color:var(--panel,var(--card,#fff));padding:10px 16px;border-radius:8px;z-index:60;font-size:14px;max-width:calc(100% - 32px)}
  `;
  function init(c){
    cfg = c;
    const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
    input = document.createElement('input'); input.type = 'file'; input.hidden = true;
    input.accept = '.xlsx,.xlsm,.csv,.tsv,.txt,.json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv';
    document.body.appendChild(input);
    input.addEventListener('change', e => { e.stopPropagation(); const f = input.files[0]; if (f) load(f); });
    root = document.createElement('div'); root.hidden = true; document.body.appendChild(root);
    root.addEventListener('change', e => { e.stopPropagation(); onChange(e.target); });
    root.addEventListener('input', e => e.stopPropagation());
    root.addEventListener('click', e => { e.stopPropagation(); onClick(e); });
    root.addEventListener('keydown', e => { if (e.key==='Escape' && !st?.busy) close(); });
  }
  function open(m){ st = {m}; input.value = ''; input.click(); }
  function close(){ root.hidden = true; root.innerHTML = ''; st = null; }
  async function load(f){
    st.file = f.name; st.error = ''; st.order = st.order || 'dmy'; st.skipDupes = true;
    try { st.book = await readFile(f); setSheet(chooseSheet(st.book, st.m)); }
    catch (err) { st.book = null; st.error = err && err.message ? err.message : 'This file could not be read.'; }
    draw(true);
  }
  function onChange(t){
    if (!st || !st.book) return;
    const a = t.dataset.imp;
    if (a==='sheet') setSheet(+t.value);
    else if (a==='header'){ const n = Math.max(1, Math.min(+t.value || 1, st.book.sheets[st.sheet].rows.length)); st.header = n-1; applyMap(autoMap((st.book.sheets[st.sheet].rows[n-1] || []).map(String), st.m)); }
    else if (a==='order') st.order = t.value;
    else if (a==='dupes') st.skipDupes = t.checked;
    else if (a==='map') st.map[t.dataset.k] = t.value;
    draw(false, t.dataset.imp + (t.dataset.k || ''));
  }
  async function onClick(e){
    const b = e.target.closest('[data-act]'); if (!b) { if (e.target.classList.contains('imp-scrim') && !st?.busy) close(); return; }
    if (b.dataset.act==='cancel') return close();
    if (b.dataset.act==='other'){ const m = st.m; close(); return open(m); }
    if (b.dataset.act==='go'){
      const {good} = compute(), M = cfg.modules[st.m]; if (!good.length) return;
      st.busy = true; b.disabled = true; let n = 0;
      try {
        await cfg.commit(st.m, good, k => { n = k; b.textContent = `Importing ${k} of ${good.length}`; });
        close(); toast(`Imported ${good.length} record${good.length===1?'':'s'} into ${M.title}.`);
      } catch (err) {
        st.busy = false; b.disabled = false; b.textContent = 'Try again';
        root.querySelector('.imp-err').textContent = `Imported ${n} of ${good.length} before an error. ${cfg.errorText ? cfg.errorText(err) : ''}`;
      }
    }
  }
  function toast(msg){
    if (toastEl) toastEl.remove();
    toastEl = document.createElement('div'); toastEl.className = 'imp-toast'; toastEl.setAttribute('role','status'); toastEl.textContent = msg;
    document.body.appendChild(toastEl); setTimeout(() => { toastEl && toastEl.remove(); toastEl = null; }, 4000);
  }
  function draw(first, focusKey){
    const M = cfg.modules[st.m];
    let body;
    if (!st.book){
      body = `<p class="imp-err">${esc(st.error)}</p><div class="imp-acts"><button class="imp-btn" data-act="cancel">Close</button><button class="imp-btn go" data-act="other">Choose another file</button></div>`;
    } else {
      const sheet = st.book.sheets[st.sheet], header = sheet.rows[st.header] || [], firstRow = sheet.rows.slice(st.header+1).find(r => r && !r.every(blank)) || [];
      const width = Math.max(header.length, ...sheet.rows.slice(st.header, st.header+30).map(r => r ? r.length : 0));
      const colLabel = i => (blank(header[i]) ? 'Column '+colName(i) : String(header[i]).trim() + ' ('+colName(i)+')');
      const res = compute();
      const missingReq = M.fields.filter(f => f.req && !(st.map[f.k] || '').startsWith('c:') && !f.d);
      const fieldsHtml = M.fields.map(f => {
        const opts = cfg.optsOf(M,f), cur = st.map[f.k] || '';
        const choices = [`<option value="">Not in file${usesDefault(f) && !opts ? (f.t==='date' ? ' (use today)' : ' (use default)') : ''}</option>`]
          .concat(Array.from({length: width}, (_, i) => `<option value="c:${i}"${cur==='c:'+i?' selected':''}>${esc(colLabel(i))}</option>`))
          .concat(opts ? opts.map(o => `<option value="v:${esc(o)}"${cur==='v:'+o?' selected':''}>Set all to: ${esc(o)}</option>`) : []);
        const sample = cur.startsWith('c:') ? firstRow[+cur.slice(2)] : '';
        const need = f.req && !cur.startsWith('c:') && !f.d;
        return `<label>${esc(f.l)}${f.req?' *':''}${need?' <span class="need">choose a column</span>':''}
          <select data-imp="map" data-k="${f.k}" id="imp-map-${f.k}">${choices.join('')}</select>
          <span class="sample">${cur.startsWith('c:') ? (blank(sample) ? 'First row: empty' : 'First row: '+esc(sample)) : '&nbsp;'}</span></label>`;
      }).join('');
      const skippedLines = Object.entries(res.skipped).map(([w,n]) => `<div class="warn">${n} row${n>1?'s':''} skipped: ${esc(w)}.</div>`).join('');
      const prevCols = M.cols.filter(k => k!=='notes');
      const prev = res.good.slice(0,5).map(r => `<tr>${prevCols.map(k => `<td>${esc(r[k])}</td>`).join('')}</tr>`).join('');
      body = `
        <div class="imp-opts">
          ${st.book.sheets.length>1 ? `<label>Sheet<select data-imp="sheet" id="imp-sheet">${st.book.sheets.map((s,i) => `<option value="${i}"${i===st.sheet?' selected':''}>${esc(s.name)}</option>`).join('')}</select></label>` : ''}
          <label>Headings are on row<input type="number" min="1" data-imp="header" id="imp-header" value="${st.header+1}"></label>
          <label>Dates written as<select data-imp="order" id="imp-order"><option value="dmy"${st.order==='dmy'?' selected':''}>Day/Month/Year</option><option value="mdy"${st.order==='mdy'?' selected':''}>Month/Day/Year</option></select></label>
        </div>
        <div><div style="font-size:13px;font-weight:600;margin-bottom:8px">Match your columns to the tracker</div><div class="imp-map">${fieldsHtml}</div></div>
        ${DUPE_KEY[st.m] ? `<label class="imp-chk"><input type="checkbox" data-imp="dupes" id="imp-dupes"${st.skipDupes?' checked':''}> Skip rows that are already in ${esc(M.title)}</label>` : ''}
        <div class="imp-sum">
          <div class="ok">${res.good.length} of ${res.total} row${res.total===1?'':'s'} ready to import. Existing records are not changed.</div>
          ${missingReq.length ? `<div class="warn">Choose a column for ${missingReq.map(f => esc(f.l)).join(', ')}.</div>` : ''}
          ${skippedLines}
          ${res.dupes ? `<div>${res.dupes} row${res.dupes>1?'s are':' is'} already in ${esc(M.title)} and will be skipped.</div>` : ''}
        </div>
        ${prev ? `<div class="imp-prev"><table><thead><tr>${prevCols.map(k => `<th>${esc(M.fields.find(f => f.k===k).l)}</th>`).join('')}</tr></thead><tbody>${prev}</tbody></table></div>` : ''}
        <div class="imp-err" role="alert"></div>
        <div class="imp-acts"><button class="imp-btn" data-act="cancel">Cancel</button><button class="imp-btn go" data-act="go"${res.good.length?'':' disabled'}>Import ${res.good.length} row${res.good.length===1?'':'s'}</button></div>`;
    }
    root.innerHTML = `<div class="imp-scrim"><div class="imp-box" role="dialog" aria-modal="true" aria-labelledby="imp-title">
      <h3 id="imp-title">Import into ${esc(M.title)}</h3><div class="imp-file">${esc(st.file || '')}</div>${body}</div></div>`;
    root.hidden = false;
    const target = focusKey ? root.querySelector(focusKey.startsWith('map') ? '#imp-map-'+focusKey.slice(3) : '#imp-'+focusKey) : root.querySelector('select,input,button');
    if (target) target.focus();
  }
  return {init, open, _test: {parseDate, parseNum, parseDelimited, matchOption, readFile}};
})();
