// ===== إعدادات عامة =====
const API = {
  exInfo: 'https://fapi.binance.com/fapi/v1/exchangeInfo',
  price:  'https://fapi.binance.com/fapi/v1/ticker/price?symbol=',
  klines: (s,interval='1m',limit=120)=>https://fapi.binance.com/fapi/v1/klines?symbol=${s}&interval=${interval}&limit=${limit},
  fearGreed: 'https://api.alternative.me/fng/?limit=1' // عام، بدون مفتاح
};

const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);
const boards = $('#boards');
const tpl = $('#boardTpl');

// تبديل السمة
$('#themeBtn').onclick = () => document.body.classList.toggle('light');

// تحميل قائمة الأزواج
let ALL_PAIRS = [];
async function loadPairs(){
  const r = await fetch(API.exInfo);
  const js = await r.json();
  ALL_PAIRS = js.symbols
    .filter(s=>s.contractType && s.symbol.endsWith('USDT'))
    .map(s=>s.symbol);
  fillPairs();
}
function fillPairs(list=ALL_PAIRS){
  const sel = $('#pairsSelect');
  sel.innerHTML = '';
  list.forEach(sym=>{
    const o=document.createElement('option');
    o.value=o.textContent=sym;
    sel.appendChild(o);
  });
}
$('#pairSearch').addEventListener('input', e=>{
  const q=e.target.value.trim().toUpperCase();
  if(!q) return fillPairs();
  fillPairs(ALL_PAIRS.filter(s=>s.includes(q)));
});

// إضافة الألواح
$('#addPairsBtn').onclick = ()=>{
  const sel = $('#pairsSelect');
  [...sel.selectedOptions].forEach(opt=> addBoard(opt.value));
};

const boardsState = new Map(); // symbol -> state

function addBoard(symbol){
  if(boardsState.has(symbol)) return;
  const node = tpl.content.cloneNode(true);
  const section = node.querySelector('.board');
  section.dataset.symbol = symbol;
  section.querySelector('.symbol').textContent = symbol;
  boards.prepend(section);
  boardsState.set(symbol, { section, timer:null, intervalSec: Number($('#refreshSec').value) });
  refreshBoard(symbol);
  setAuto(symbol);
}
$('#refreshSec').addEventListener('change', ()=>{
  boardsState.forEach((st,sym)=> setAuto(sym));
});

function setAuto(symbol){
  const st = boardsState.get(symbol);
  if(!st) return;
  if(st.timer) clearInterval(st.timer);
  st.timer = setInterval(()=>refreshBoard(symbol), st.intervalSec*1000);
}

// ===== أدوات حسابية بسيطة =====
function ema(vals, p){
  const k = 2/(p+1);
  let ema = vals[0];
  for(let i=1;i<vals.length;i++) ema = vals[i]k + ema(1-k);
  return ema;
}
function calcRSI(closes, period=14){
  let gains=0, losses=0;
  for(let i=1;i<=period;i++){
    const diff = closes[i]-closes[i-1];
    if(diff>=0) gains+=diff; else losses+=-diff;
  }
  let avgG=gains/period, avgL=losses/period;
  for(let i=period+1;i<closes.length;i++){
    const diff = closes[i]-closes[i-1];
    avgG = (avgG*(period-1) + Math.max(diff,0))/period;
    avgL = (avgL*(period-1) + Math.max(-diff,0))/period;
  }
  const rs = avgL===0 ? 100 : avgG/avgL;
  return 100 - (100/(1+rs));
}
function pivotsHighLow(closes, period=20){
  const c = closes.slice(-period);
  const hi = Math.max(...c);
  const lo = Math.min(...c);
  return {res: hi, sup: lo};
}
function superTrendBasic(closes, highs, lows, atrPeriod=10, mult=2){
  // ATR بسيط
  const trs = [];
  for(let i=1;i<closes.length;i++){
    const tr = Math.max(
      highs[i]-lows[i],
      Math.abs(highs[i]-closes[i-1]),
      Math.abs(lows[i]-closes[i-1])
    );
    trs.push(tr);
  }
  const atr = ema(trs, atrPeriod);
  const last = closes.at(-1);
  const mid = (highs.at(-1)+lows.at(-1))/2;
  const upper = mid + mult*atr, lower = mid - mult*atr;
  const trend = last>lower ? 'صاعد' : (last<upper ? 'هابط' : 'حيادي');
  return {upper, lower, trend};
}

// رسم بسيط للشموع وRSI (Canvas يدويًا بدون مكتبات)
function drawCandles(canvas, opens, highs, lows, closes){
  const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.clientWidth;
  const H = canvas.height;
  ctx.clearRect(0,0,W,H);
  const n = closes.length;
  const max = Math.max(...highs), min = Math.min(...lows);
  const xStep = W / n;

  for(let i=0;i<n;i++){
    const x = i*xStep + xStep*0.1;
    const up = closes[i]>=opens[i];
    const c = getComputedStyle(document.body);
    ctx.strokeStyle = up ? getCSS('--up') : getCSS('--down');
    ctx.fillStyle   = ctx.strokeStyle;

    const yHigh = map(highs[i], min, max, H-4, 4);
    const yLow  = map(lows[i],  min, max, H-4, 4);
    const yOp   = map(opens[i], min, max, H-4, 4);
    const yCl   = map(closes[i],min, max, H-4, 4);

    ctx.beginPath(); ctx.moveTo(x+xStep*0.4, yHigh); ctx.lineTo(x+xStep*0.4, yLow); ctx.stroke();
    const top = Math.min(yOp,yCl), h = Math.abs(yOp-yCl) || 1;
    ctx.fillRect(x, top, xStep*0.8, h);
  }
}
function drawRSI(canvas, rsiVal){
  const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.clientWidth;
  const H = canvas.height;
  ctx.clearRect(0,0,W,H);
  const mid70 = H*0.3, mid30 = H*0.7;

  ctx.strokeStyle = getCSS('--line');
  [mid70, mid30].forEach(y=>{ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); });

  const y = map(rsiVal, 0, 100, H-4, 4);
  ctx.fillStyle = getCSS('--accent');
  ctx.beginPath(); ctx.arc(W-12, y, 6, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = getCSS('--text');
  ctx.font = '12px system-ui';
  ctx.fillText(RSI: ${rsiVal.toFixed(1)}, 8, 14);
}
function getCSS(v){ return getComputedStyle(document.body).getPropertyValue(v).trim(); }
function map(v,a,b,min,max){ return min + (v-a)*(max-min)/(b-a); }

// تحديث لوح واحد
async function refreshBoard(symbol){
  const st = boardsState.get(symbol); if(!st) return;
  const el = st.section;
  const priceEl = el.querySelector('.price');
  const supEl   = el.querySelector('.support');
  const resEl   = el.querySelector('.resist');
  const rsiEl   = el.querySelector('.rsi');
  const trendEl = el.querySelector('.trend');
  const entryEl = el.querySelector('.entry');
  const buyEl   = el.querySelector('.buy');
  const sellEl  = el.querySelector('.sell');
  const fgTxt   = el.querySelector('.fgValue');
  const fgBar   = el.querySelector('.fgBar span');

  // السعر الحالي
  const pRes = await fetch(API.price + symbol).then(r=>r.json()).catch(()=>({price:null}));
  const price = Number(pRes.price||0);
  priceEl.textContent = price ? $${Number(price).toLocaleString()} : '—';

  // الشموع
  const k = await fetch(API.klines(symbol,'1m',120)).then(r=>r.json());
  const opens  = k.map(r=>+r[1]), highs=k.map(r=>+r[2]), lows=k.map(r=>+r[3]), closes=k.map(r=>+r[4]);

  drawCandles(el.querySelector('.kline'), opens, highs, lows, closes);

  // RSI + دعم/مقاومة + سوبر ترند
  const rsi = calcRSI(closes);
  rsiEl.textContent = rsi.toFixed(1);
  drawRSI(el.querySelector('.rsiChart'), rsi);

  const {res:sRes, sup:sSup} = pivotsHighLow(closes);
  resEl.textContent = $${sRes.toFixed(2)};
  supEl.textContent = $${sSup.toFixed(2)};

  const stObj = superTrendBasic(closes, highs, lows, 10, 2);
  trendEl.textContent = stObj.trend;
  trendEl.className = 'trend ' + (stObj.trend==='صاعد'?'up':(stObj.trend==='هابط'?'down':'muted'));

  // نقاط شراء/بيع مقترحة (تقاطع بسيط مع سوبرترند)
  const buyLvl  = Math.max(sSup, stObj.lower);
  const sellLvl = Math.min(sRes, stObj.upper);
  buyEl.textContent  = $${buyLvl.toFixed(2)};
  sellEl.textContent = $${sellLvl.toFixed(2)};
  entryEl.textContent = (price>sellLvl && rsi>60) ? 'بيع محتمل' :
                        (price<buyLvl  && rsi<40) ? 'شراء محتمل' : 'انتظار';

  // خوف/طمع (مؤشر عام)
  try{
    const fg = await fetch(API.fearGreed).then(r=>r.json());
    const v = Number(fg?.data?.[0]?.value ?? 50);
    fgTxt.textContent = v + ' / 100';
    fgBar.style.width = v + '%';
  }catch{}

}

// تشغيل أولي
loadPairs().then(()=> {
  // اختيارات افتراضية
  ['BTCUSDT','ETHUSDT'].forEach(s=> addBoard(s));
});
