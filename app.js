const parts = {
  mcu:{name:'ESP32-S3 Controller', sub:'Wireless MCU · 8 MB flash', tag:'WIRELESS MCU', value:'4.2 × 3.3 mm', copy:'The central brain of the board. It handles Wi‑Fi communication, sensor readings, and your application logic in one compact module.', glyph:'MCU'},
  sensor:{name:'BME280 Environmental Sensor', sub:'Temperature · humidity · pressure', tag:'I²C SENSOR', value:'2.5 × 2.5 mm', copy:'This low-power sensor measures temperature, humidity, and air pressure. It is positioned away from heat sources for more accurate ambient readings.', glyph:'SEN'},
  usb:{name:'USB-C Power & Data', sub:'5 V input · USB 2.0', tag:'USB-C', value:'8.9 × 7.4 mm', copy:'USB-C provides convenient programming and charging power. Its protected footprint is placed at the board edge for reliable cable access.', glyph:'USB'},
  battery:{name:'LiPo Battery Connector', sub:'1-cell · JST-PH', tag:'POWER INPUT', value:'7.0 × 5.0 mm', copy:'The polarized battery connector makes the board portable. Dedicated nearby protection and regulation keep its power delivery safe and stable.', glyph:'BAT'},
  led:{name:'Status LED', sub:'Green · user programmable', tag:'USER INTERFACE', value:'1.6 × 0.8 mm', copy:'A small indicator LED gives instant feedback for power, charging, network status, or your own firmware events without adding bulk.', glyph:'LED'},
  regulator:{name:'3.3V Voltage Regulator', sub:'Low-noise buck regulator', tag:'POWER MANAGEMENT', value:'3.0 × 3.0 mm', copy:'This regulator converts USB or battery power into the clean 3.3V rail required by the MCU and sensor. Short traces reduce electrical noise.', glyph:'3V3'},
  antenna:{name:'2.4 GHz PCB Antenna', sub:'Wi‑Fi / Bluetooth', tag:'RF ANTENNA', value:'15.0 × 3.0 mm', copy:'The edge-mounted antenna provides wireless range without an external part. Its clear keep-out zone protects RF performance.', glyph:'ANT'}
};
const defaultParts = Object.fromEntries(Object.entries(parts).map(([id, value])=>[id,{...value}]));
const joystickParts = {
  mcu:{name:'RP2040 Controller', sub:'Dual-core MCU · native USB', tag:'GAME CONTROLLER MCU', value:'7.0 × 7.0 mm', copy:'The RP2040 reads the joystick axes, handles buttons, and presents the finished controller as a USB HID device to a computer or console.', glyph:'MCU'},
  sensor:{name:'ALPS Alpine RKJXV1224005', sub:'2-axis analog joystick · push switch', tag:'JOYSTICK', value:'14.0 × 17.0 mm', copy:'A genuine ALPS Alpine 2-axis joystick module with an integrated press switch. Two analog lines carry X/Y position, and the switch adds a third digital input.', glyph:'JOY'},
  usb:{name:'USB-C Receptacle', sub:'USB 2.0 data · 5 V power', tag:'USB-C', value:'8.9 × 7.4 mm', copy:'The USB-C connector powers the handheld controller and carries its USB HID data signal. It remains edge-mounted for strain relief and easy access.', glyph:'USB'},
  battery:{name:'USBLC6-2SC6 ESD Protection', sub:'USB data-line protection', tag:'ESD PROTECTION', value:'2.9 × 1.6 mm', copy:'This protection array absorbs electrostatic discharge from the exposed USB connector before it can reach the controller.', glyph:'ESD'},
  led:{name:'SK6812MINI-E RGB Status LED', sub:'Addressable status indicator', tag:'USER FEEDBACK', value:'3.5 × 3.5 mm', copy:'A tiny addressable RGB LED reports pairing, charging, or game status with a single MCU data pin.', glyph:'RGB'},
  regulator:{name:'TPS63031 Power Regulator', sub:'Buck-boost · 3.3 V rail', tag:'POWER MANAGEMENT', value:'3.0 × 3.0 mm', copy:'This buck-boost regulator maintains a steady 3.3 V supply as battery voltage changes, which keeps joystick readings stable.', glyph:'PWR'},
  antenna:{name:'Tactile Button Array', sub:'Four low-profile action buttons', tag:'PLAYER INPUT', value:'6.0 × 6.0 mm', copy:'These tactile switch footprints provide compact, responsive action inputs without taking space from the main joystick.', glyph:'BTN'}
};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let selected='mcu', zoom=1, dragging=false, componentDrag=null, boardResize=null, start={x:0,y:0}, angles={x:43,z:-19};
const examplePrompts={controller:'A classic 4-button joystick with a rechargeable protected 3.7 V LiPo battery, USB-C charging, RP2040 native USB controller, 2-axis analog joystick, four momentary push buttons, USB-C ESD protection, 3.3 V regulator, decoupling capacitors, and a charging status LED.',humidDetector:'A USB-C rechargeable humidity and temperature detector with a protected LiPo battery, BME280 environmental sensor, status LED, USB-C charging circuit, 3.3 V regulator, decoupling capacitors, and ESD protection.'};
const componentList=$('#componentList'), library=$('#library');
const calloutAction=document.createElement('p');calloutAction.className='component-action';$('#calloutCopy').after(calloutAction);new MutationObserver(()=>{calloutAction.textContent=`What it does: ${$('#calloutCopy').textContent}`}).observe($('#calloutCopy'),{childList:true,characterData:true,subtree:true});calloutAction.textContent=`What it does: ${$('#calloutCopy').textContent}`;
function renderParts(){componentList.innerHTML='';library.innerHTML='';Object.entries(parts).forEach(([id,p])=>{const row=document.createElement('div');row.className='component-row '+(id===selected?'active':'');row.dataset.part=id;row.innerHTML=`<span class="comp-glyph">${p.glyph}</span><span><strong>${p.name}</strong><small>${p.sub}</small></span><b>✓</b>`;componentList.append(row);const lib=document.createElement('div');lib.className='library-item';lib.dataset.part=id;lib.innerHTML=`<i class="lib-icon"></i><span>${p.glyph}</span>`;library.append(lib)})}
function select(id){if(!parts[id])return;selected=id;const p=parts[id];$('#calloutTitle').textContent=p.name;$('#calloutIdentity').textContent=`What it is: ${p.sub || p.name}.`;$('#calloutCopy').textContent=p.copy;$('#calloutTag').textContent=p.tag;$('#calloutValue').textContent=p.value;$('#callout').classList.remove('hidden');$('#leaderPath').closest('.leader').classList.remove('hidden');$$('.pcb-part').forEach(x=>x.classList.toggle('selected',x.dataset.part===id));$$('.component-row').forEach(x=>x.classList.toggle('active',x.dataset.part===id));const el=$(`.pcb-part[data-part="${id}"]`),scene=$('#pcbScene'),rect=scene.getBoundingClientRect(),part=el.getBoundingClientRect();const x=((part.left+part.width/2-rect.left)/rect.width*1000).toFixed(0),y=((part.top+part.height/2-rect.top)/rect.height*700).toFixed(0);$('#leaderDot').setAttribute('cx',x);$('#leaderDot').setAttribute('cy',y);$('#leaderPath').setAttribute('d',`M ${x} ${y} C ${Math.min(+x+130,750)} ${y}, 715 145, 820 145`);updateConnections()}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2300)}
function setBoard(){ $('#boardWrap').style.transform=`translate(-50%,-50%) scale(${zoom}) rotateX(${angles.x}deg) rotateZ(${angles.z}deg)` }
const boardWrap=$('#boardWrap');['top','right','bottom','left'].forEach(edge=>{const handle=document.createElement('div');handle.className=`resize-handle resize-${edge}`;handle.setAttribute('aria-label',`Resize board from ${edge} edge`);handle.addEventListener('pointerdown',event=>{event.preventDefault();event.stopPropagation();boardResize={edge,pointerId:event.pointerId,x:event.clientX,y:event.clientY,width:boardWrap.offsetWidth,height:boardWrap.offsetHeight};handle.setPointerCapture(event.pointerId);document.body.classList.add('resizing-board')});boardWrap.append(handle)});
document.addEventListener('pointermove',event=>{if(!boardResize||event.pointerId!==boardResize.pointerId)return;const horizontal=/left|right/.test(boardResize.edge),delta=horizontal?event.clientX-boardResize.x:event.clientY-boardResize.y,sign=/left|top/.test(boardResize.edge)?-1:1;const size=Math.max(horizontal?465:320,(horizontal?boardResize.width:boardResize.height)+delta*sign);if(horizontal)boardWrap.style.width=`${size}px`;else{boardWrap.style.height=`${size}px`;boardWrap.style.aspectRatio='auto'}updateConnections()});
document.addEventListener('pointerup',event=>{if(!boardResize||event.pointerId!==boardResize.pointerId)return;boardResize=null;document.body.classList.remove('resizing-board')});
selected=null;$('#board').classList.add('empty');$('#callout').classList.add('hidden');$('#leaderPath').closest('.leader').classList.add('hidden');$('#prompt').value='';componentList.innerHTML='<div class="empty-state">Describe what you want to build, then generate a fresh component plan.</div>';library.innerHTML='';$('#componentCount').textContent='0';$('#checkStatus').textContent='Waiting';$('.strip-title span').textContent='0 placed';$('.board-status').innerHTML='<span><i class="pulse"></i> Ready for a new PCB</span>';
const examples=document.createElement('div');examples.className='example-links';examples.innerHTML='<span>Examples</span><button type="button" data-example="controller">Controller</button><button type="button" data-example="humidDetector">HumidDetector</button>';$('#generateBtn').after(examples);examples.addEventListener('click',event=>{const name=event.target.dataset.example;if(!name)return;$('#prompt').value=examplePrompts[name];$('#generateBtn').click()});
document.addEventListener('click',e=>{const id=e.target.closest('[data-part]')?.dataset.part;if(id)select(id)});
$('#closeCallout').onclick=()=>{$('#callout').classList.add('hidden');$('#leaderPath').closest('.leader').classList.add('hidden')};
$('#zoomIn').onclick=()=>{zoom=Math.min(1.35,zoom+.1);setBoard()};$('#zoomOut').onclick=()=>{zoom=Math.max(.7,zoom-.1);setBoard()};$('#resetView').onclick=()=>{zoom=1;angles={x:43,z:-19};setBoard();toast('View reset')};
$('#gridBtn').onclick=e=>{e.currentTarget.classList.toggle('active');$('#pcbScene').classList.toggle('grid-off')};$('#fitBtn').onclick=()=>$('#resetView').click();$('#orbitBtn').onclick=e=>e.currentTarget.classList.toggle('active');
const scene=$('#pcbScene');scene.addEventListener('pointerdown',e=>{if(e.target.closest('.pcb-part,.component-callout,button'))return;dragging=true;start={x:e.clientX,y:e.clientY};scene.setPointerCapture(e.pointerId)});scene.addEventListener('pointermove',e=>{if(!dragging)return;angles.z+= (e.clientX-start.x)*.12;angles.x=Math.max(22,Math.min(62,angles.x-(e.clientY-start.y)*.12));start={x:e.clientX,y:e.clientY};setBoard()});scene.addEventListener('pointerup',()=>dragging=false);scene.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.7,Math.min(1.35,zoom-(e.deltaY*.0008)));setBoard()},{passive:false});
// AI-backed PCB generation and placement.
async function apiPost(path, body){
  const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.error||`Request failed (${response.status})`);
  return data;
}

function applyChecks(checks){
  const rows=$$('.check-row');
  (checks||[]).slice(0,4).forEach((check,i)=>{
    if(!rows[i])return;
    rows[i].querySelector('.check-icon').textContent=check.status==='Clear'?'✓':'!';
    rows[i].querySelector('span:nth-child(2)').textContent=check.name;
    rows[i].querySelector('b').textContent=check.status;
    rows[i].title=check.detail;
  });
  const clear=(checks||[]).filter(x=>x.status==='Clear').length;
  $('#checkStatus').textContent=`${clear} clear · AI review`;
  $('#checkStatus').classList.toggle('passed',clear===4);
}

function renderGeneratedBoard(plan){
  const board=$('#board');
  board.className='board generated';
  const components=plan.components||[];
  const areaW=Math.round(plan.boardWidthMm||60), areaH=Math.round(plan.boardHeightMm||45);
  board.innerHTML=`<div class="generated-silk">KESH-CUSTOM · GEMINI PLAN</div><div class="generated-size">${areaW} × ${areaH} mm</div>`;
  const partMap={};
  const size=components.length>24?'38px':components.length>14?'46px':'58px';
  components.forEach((part,index)=>{
    const x=Math.max(4,Math.min(94,Number(part.x)||50));
    const y=Math.max(8,Math.min(92,Number(part.y)||50));
    partMap[part.id]={name:part.name,sub:part.sub,glyph:part.glyph,tag:part.tag,value:part.value,copy:part.copy,x,y,kind:part.kind};
    const el=document.createElement('button');
    el.className=`pcb-part generated-part ${part.kind||''}`;
    el.dataset.part=part.id;
    el.style.setProperty('--x',`${x}%`);
    el.style.setProperty('--y',`${y}%`);
    el.style.setProperty('--size',size);
    el.textContent=part.glyph;
    el.title=part.name;
    board.append(el);
    if(index>0){
      const trace=document.createElement('i');
      trace.className='generated-trace';
      trace.style.left='7%';
      trace.style.top=`${Math.max(18,Math.min(82,y))}%`;
      trace.style.width=`${Math.max(8,x-7)}%`;
      trace.style.transform=`rotate(${(y-50)*.18}deg)`;
      board.append(trace);
    }
  });
  Object.keys(parts).forEach(key=>delete parts[key]);
  Object.assign(parts,partMap);
  renderParts();
  $('#componentCount').textContent=String(components.length);
  $('.strip-title span').textContent=`${components.length} placed`;
  $('.board-status').innerHTML=`<span><i class="pulse"></i> AI plan · ${components.length} parts</span><span>${areaW} × ${areaH} mm</span>`;
  updateConnections();
}

$('#generateBtn').onclick=async()=>{
  const prompt=$('#prompt').value.trim()||'Compact USB-C development board';
  const btn=$('#generateBtn'),progress=$('#generationProgress'),text=$('#generateText'),bar=$('#progressBar'),pct=$('#progressPct'),label=$('#progressText');
  btn.disabled=true;
  progress.classList.remove('hidden');
  $('#board').classList.remove('empty');
  try{
    label.textContent='Sending requirements to AI…';bar.style.width='20%';pct.textContent='20%';
    const data=await apiPost('/api/generate',{prompt});
    label.textContent='Reading AI component plan…';bar.style.width='55%';pct.textContent='55%';
    renderGeneratedBoard(data.plan);
    label.textContent='Applying placement and design review…';bar.style.width='82%';pct.textContent='82%';
    applyChecks(data.plan.checks);
    $('#optTitle').textContent=`${data.plan.compactness}% compactness`;
    $('#optBadge').textContent='AI';
    $('#optCopy').textContent=data.plan.optimizationSummary||'AI produced a compact conceptual placement.';
    select(data.plan.components[0]?.id);
    bar.style.width='100%';pct.textContent='100%';text.textContent='PCB Generated';
    toast(`${data.plan.components.length} components planned by AI`);
  }catch(error){
    console.error(error);
    $('#checkStatus').textContent='AI unavailable';
    toast(error.message||'AI request failed');
  }finally{
    setTimeout(()=>{progress.classList.add('hidden');btn.disabled=false;text.textContent='Generate PCB'},700);
  }
};

async function applyPlacementCommand(){
  const input=$('#placementInput'),reply=$('#chatReply'),command=input.value.trim();
  if(!command)return;
  if(!Object.keys(parts).length){reply.textContent='Generate a PCB first, then ask me to change the placement.';return}
  const components=Object.entries(parts).map(([id,p])=>({id,name:p.name,x:parseFloat(p.x??$(`.pcb-part[data-part="${id}"]`)?.style.getPropertyValue('--x'))||50,y:parseFloat(p.y??$(`.pcb-part[data-part="${id}"]`)?.style.getPropertyValue('--y'))||50}));
  reply.textContent='AI is interpreting the placement request…';
  try{
    const data=await apiPost('/api/placement',{command,components});
    const r=data.result;
    if(r.action==='none'){reply.textContent=r.reply;return}
    if(r.action==='swap'){
      const a=$(`.pcb-part[data-part="${r.sourceId}"]`),b=$(`.pcb-part[data-part="${r.targetId}"]`);
      if(!a||!b){reply.textContent='AI returned components that are not on the current board.';return}
      if(/USB-C/i.test(parts[r.sourceId]?.name||'')||/USB-C/i.test(parts[r.targetId]?.name||'')){reply.textContent='USB-C remains locked to the board edge.';return}
      const ax=a.style.getPropertyValue('--x'),ay=a.style.getPropertyValue('--y');
      a.style.setProperty('--x',b.style.getPropertyValue('--x'));a.style.setProperty('--y',b.style.getPropertyValue('--y'));
      b.style.setProperty('--x',ax);b.style.setProperty('--y',ay);
      select(r.sourceId);
    }else if(r.action==='move'){
      const el=$(`.pcb-part[data-part="${r.sourceId}"]`);
      if(!el){reply.textContent='AI returned a component that is not on the current board.';return}
      if(/USB-C/i.test(parts[r.sourceId]?.name||'')){reply.textContent='USB-C remains locked to the board edge.';return}
      el.style.setProperty('--x',`${Math.max(8,Math.min(92,r.x))}%`);
      el.style.setProperty('--y',`${Math.max(8,Math.min(92,r.y))}%`);
      select(r.sourceId);
    }
    updateConnections();
    reply.textContent=r.reply||'Placement updated.';
    input.value='';
  }catch(error){
    console.error(error);reply.textContent=error.message||'AI placement request failed.';
  }
}

$('#placementSend').onclick=applyPlacementCommand;
$('#placementInput').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();applyPlacementCommand()}});

function updateConnections(){const board=$('#board');if(!board.classList.contains('generated'))return;let layer=board.querySelector('.connection-layer');if(!layer){layer=document.createElementNS('http://www.w3.org/2000/svg','svg');layer.setAttribute('class','connection-layer');layer.setAttribute('viewBox','0 0 100 100');layer.setAttribute('preserveAspectRatio','none');board.prepend(layer)}const entries=$$('.generated-part').map(el=>({el,id:el.dataset.part,x:parseFloat(el.style.getPropertyValue('--x')),y:parseFloat(el.style.getPropertyValue('--y'))}));const core=entries.find(item=>/controller|MCU/i.test(parts[item.id]?.name||''))||entries[0];if(!core)return;layer.innerHTML='';entries.filter(item=>item!==core).forEach(item=>{const middle=(item.x+core.x)/2;const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',`M ${item.x} ${item.y} L ${middle} ${item.y} L ${middle} ${core.y} L ${core.x} ${core.y}`);if(/USB|BQ24074|charger|regulator/i.test(parts[item.id]?.name||''))path.setAttribute('class','power-link');layer.append(path)})}
document.addEventListener('click',event=>{const part=event.target.closest('.generated-part');if(!part)return;const detail=parts[part.dataset.part];if(!detail)return;if(/button|joystick/i.test(detail.name)){part.classList.add('pressed');setTimeout(()=>part.classList.remove('pressed'),180);const action=/button/i.test(detail.name)?`${detail.name} pressed`:'Joystick input selected';$('.board-status').innerHTML=`<span><i class="pulse"></i> ${action}</span><span>Signal routed to controller</span>`;toast(`${action} — input signal received`)}});
$('#resetPcbBtn').onclick=()=>{selected=null;$('#prompt').value='';$('#board').className='board empty';$('#board').innerHTML='';$('#callout').classList.add('hidden');$('#leaderPath').closest('.leader').classList.add('hidden');componentList.innerHTML='<div class="empty-state">Describe any size PCB and every part you need. KeshComponents will build a new layout.</div>';library.innerHTML='';$('#componentCount').textContent='0';$('.strip-title span').textContent='0 placed';$('.board-status').innerHTML='<span><i class="pulse"></i> Ready for a new PCB</span>';$('#checkStatus').textContent='Waiting';$('#optTitle').textContent='No layout yet';$('#optBadge').textContent='Ready';$('#optCopy').textContent='Start a new design to receive a compactness score and placement recommendations.';toast('PCB reset — ready for a new design')};
