// Opt-in real photographic playback. --live captures public synthetic speech only.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "output/playwright");
const live = process.argv.includes("--live");
const software = process.argv.includes("--software");
const server = process.env.OPENTAVUS_TEST_URL ?? "http://127.0.0.1:8765";
const session = `opentavus-photo-${process.pid}`;
mkdirSync(output, { recursive: true });
const config = path.join(output, `${session}.config.json`);
writeFileSync(
  config,
  JSON.stringify({
    browser: {
      browserName: "chromium",
      launchOptions: {
        channel: "chrome",
        args: software ? ["--disable-gpu", "--disable-accelerated-2d-canvas"] : [],
      },
      contextOptions: { viewport: { width: 1440, height: 1000 }, reducedMotion: "no-preference" },
    },
    timeouts: { action: 10000, navigation: 60000 },
  }),
);
function command(...args) {
  const result = execFileSync(
    path.join(root, "node_modules/.bin/playwright-cli"),
    [`--session=${session}`, ...args],
    { cwd: root, encoding: "utf8", timeout: 180000, maxBuffer: 4000000 },
  );
  if (/^### Error/m.test(result)) throw new Error(result);
  return result;
}
function run(code) {
  return command("run-code", `async (page) => { ${code} }`);
}

try {
  command("open", server, `--config=${config}`);
  command("snapshot");
  run(`
    await page.addInitScript(() => {
      window.__photoFrames=[];window.__photoEvents=[];window.__photoExpressions=[];window.__photoClosedImages=0;
      window.__photoCues=[];
      window.__photoBlinkTiles=[];
      const cues=new MutationObserver(()=>{
        const canvas=document.querySelector('canvas.avatar[data-avatar="mira-photo"]');
        if(!canvas?.dataset.cue||window.__photoCues.length>=2000)return;
        const last=window.__photoCues.at(-1),id=canvas.dataset.cue;
        if(last?.id===id)return;
        const received=Number(canvas.dataset.cueReceivedAt),rendered=Number(canvas.dataset.cueRenderedAt);
        window.__photoCues.push({id,shape:canvas.dataset.viseme,received,rendered,latencyMs:rendered-received});
      });
      cues.observe(document,{subtree:true,attributes:true,attributeFilter:['data-cue']});
      const close=ImageBitmap.prototype.close;
      ImageBitmap.prototype.close=function(){window.__photoClosedImages++;return close.call(this);};
      const draw=CanvasRenderingContext2D.prototype.drawImage;
      let drawing=false;
      CanvasRenderingContext2D.prototype.drawImage=function(...args){
        if(this.canvas instanceof HTMLCanvasElement && this.canvas.dataset.avatar==='mira-photo'){
          const t=performance.now();
          // All tile composites in one synchronous render count as one frame.
          if(!drawing && window.__photoFrames.length<18000){
            drawing=true;queueMicrotask(()=>{
              drawing=false;
              const tile=this.canvas.dataset.blinkTile;
              if(tile&&!window.__photoBlinkTiles.includes(Number(tile)))window.__photoBlinkTiles.push(Number(tile));
            });
            window.__photoFrames.push(t);
          }
          const expression=this.canvas.dataset.expression;
          if(expression && !window.__photoExpressions.includes(expression))window.__photoExpressions.push(expression);
        }
        return draw.apply(this,args);
      };
      const Worklet=window.AudioWorkletNode;
      window.AudioWorkletNode=class extends Worklet {
        constructor(...args){super(...args);this.port.addEventListener('message',({data})=>{
          if(window.__photoEvents.length<20000 && (data.type!=='progress'||data.level>0||data.done))
            window.__photoEvents.push({t:performance.now(),type:data.type,generation:data.generation,
              oldGeneration:data.oldGeneration,level:data.level,shape:data.shape,played:data.played});
        });this.port.start();}
      };
    });
    await page.reload();
    await page.waitForSelector('[data-avatar="mira-photo"][data-ready="true"]');
    const start=await page.evaluate(()=>performance.now());
    await page.waitForTimeout(7000);
    await page.evaluate(start=>{
      const frames=window.__photoFrames.filter(t=>t>=start),gaps=frames.slice(1).map((t,i)=>t-frames[i]);
      const sorted=[...gaps].sort((a,b)=>a-b);
      const idle={frames:frames.length,durationMs:frames.at(-1)-frames[0],
        fps:(frames.length-1)*1000/(frames.at(-1)-frames[0]),p95GapMs:sorted[Math.floor(sorted.length*.95)],
        gapsOver100Ms:gaps.filter(t=>t>100).length,firstFrameAfterNavigationMs:window.__photoFrames[0]};
      if(idle.fps<28||idle.gapsOver100Ms)throw new Error('Photographic cadence failed: '+JSON.stringify(idle));
      const canvas=document.querySelector('canvas.avatar');
      const blinkTiles=window.__photoBlinkTiles;
      if([32,33,34,35].some(tile=>!blinkTiles.includes(tile)))throw new Error('Prepared blink stages were not rendered: '+blinkTiles);
      window.__photoResult={idle,width:canvas.width,height:canvas.height,decodedRGBABytes:4*(canvas.width*6)**2*4,
        blinkTiles,
        graphicsMode:${JSON.stringify(software ? "gpu-disabled-software-canvas" : "default-browser")}};
    },start);
    await page.screenshot({path:${JSON.stringify(path.join(output, "photo-idle.png"))},fullPage:true});
  `);

  if (software)
    run(`
      const cdp=await page.context().browser().newBrowserCDPSession();
      const info=await cdp.send('SystemInfo.getInfo');
      await cdp.detach();
      if(!info.gpu.featureStatus.gpu_compositing.includes('disabled'))
        throw new Error('Software check still has GPU compositing enabled');
      await page.evaluate(features=>{window.__photoResult.graphicsFeatures=features;},info.gpu.featureStatus);
    `);

  if (live)
    run(`
    await page.evaluate(()=>{
      const Worklet=window.AudioWorkletNode;
      window.AudioWorkletNode=class extends Worklet {
        constructor(...args){
          super(...args);const destination=args[0].createMediaStreamDestination();this.connect(destination);
          const picture=document.querySelector('canvas.avatar').captureStream(30);
          const stream=new MediaStream([...picture.getVideoTracks(),...destination.stream.getAudioTracks()]);
          const chunks=[],recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8,opus'});
          recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.start(100);
          window.__finishPhoto=async()=>{
            await new Promise(resolve=>{recorder.onstop=resolve;recorder.stop();});stream.getTracks().forEach(t=>t.stop());
            const url=URL.createObjectURL(new Blob(chunks,{type:'video/webm'})),a=document.createElement('a');
            a.href=url;a.download='photo-call.webm';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
          };
        }
      };
    });
    await page.getByRole('textbox',{name:'Your question'}).fill('Say hello and welcome, then explain photosynthesis in four short sentences.');
    await page.getByRole('button',{name:'Send question'}).click();
    await page.waitForFunction(()=>window.__photoEvents.some(e=>e.type==='progress'&&e.level>.04)||document.querySelector('[role="alert"]'),null,{timeout:110000});
    if(await page.getByRole('alert').count())throw new Error(await page.getByRole('alert').innerText());
    await page.waitForFunction(()=>Number(document.querySelector('canvas.avatar').dataset.mouth)>.1);
    if((await page.locator('.message.assistant strong').first().innerText())!=='Mira')throw new Error('Wrong photographic identity');
    await page.screenshot({path:${JSON.stringify(path.join(output, "photo-speaking.png"))},fullPage:true});
    await page.waitForTimeout(5000);
    await page.evaluate(()=>{window.__photoStop=performance.now();});
    await page.getByRole('button',{name:'Stop reply'}).click();
    await page.waitForFunction(()=>window.__photoEvents.some(e=>e.type==='stopped'&&e.t>window.__photoStop));
    await page.waitForTimeout(250);
    await page.evaluate(()=>{
      const reset=window.__photoEvents.find(e=>e.type==='stopped'&&e.t>window.__photoStop);
      const late=window.__photoEvents.filter(e=>e.type==='progress'&&e.generation===reset.oldGeneration&&e.t>reset.t&&e.level>0);
      const mouth=Number(document.querySelector('canvas.avatar').dataset.mouth);
      if(late.length||mouth!==0)throw new Error('Photographic speech continued after Stop');
      const staleVisemes=window.__photoEvents.filter(e=>e.type==='viseme'&&e.generation===reset.oldGeneration&&e.t>reset.t);
      if(staleVisemes.length)throw new Error('Old-generation mouth cues survived Stop');
      const voiceStart=window.__photoEvents.find(e=>e.type==='progress'&&e.level>0)?.t;
      const cues=window.__photoCues.filter(c=>c.received>=voiceStart&&c.received<window.__photoStop);
      const shapes=[...new Set(cues.map(c=>c.shape))];
      const delays=cues.map(c=>c.latencyMs).sort((a,b)=>a-b);
      const receivedCues=window.__photoEvents.filter(e=>e.type==='viseme'&&e.t>=voiceStart&&e.t<window.__photoStop).length;
      const frames=window.__photoFrames.filter(t=>t>=voiceStart&&t<window.__photoStop);
      const gaps=frames.slice(1).map((t,i)=>t-frames[i]),sortedGaps=[...gaps].sort((a,b)=>a-b);
      const drawing={frames:frames.length,fps:(frames.length-1)*1000/(frames.at(-1)-frames[0]),
        p95GapMs:sortedGaps[Math.floor(sortedGaps.length*.95)],gapsOver100Ms:gaps.filter(g=>g>100).length};
      if(drawing.fps<28||drawing.gapsOver100Ms)throw new Error('Live drawing cadence failed: '+JSON.stringify(drawing));
      if(!shapes.includes('closed')||!shapes.includes('wide')||!shapes.some(s=>s==='round'||s==='pucker')||shapes.length<5)
        throw new Error('Speech did not render distinct timed mouth shapes: '+shapes);
      if(delays.at(-1)>80)throw new Error('Mouth cue scheduling exceeded 80 ms: '+delays.at(-1));
      if(!window.__photoExpressions.includes('thoughtful')||!window.__photoExpressions.includes('warm')||!window.__photoExpressions.includes('attentive'))
        throw new Error('Real call did not reach the expected expression cues: '+window.__photoExpressions);
      window.__photoResult.live={stopClickToWorkletAckMs:reset.t-window.__photoStop,stalePositiveEnergy:late.length,
        mouthAfterStop:mouth,positiveEnergyEvents:window.__photoEvents.filter(e=>e.level>0).length,
        observedExpressions:window.__photoExpressions,staleVisemes:staleVisemes.length,
        drawing,
        visemeScheduling:{receivedCues,renderedCues:cues.length,coalescedOrFrameWindowBoundary:Math.max(0,receivedCues-cues.length),observedShapes:shapes,p95Ms:delays[Math.floor(delays.length*.95)],maxMs:delays.at(-1),
          boundary:'Worklet cue receipt to completed Canvas draw; excludes DAC and perceptual phoneme accuracy'},
        cueTrace:cues};
    });
    await page.screenshot({path:${JSON.stringify(path.join(output, "photo-stopped.png"))},fullPage:true});
    await page.getByRole('button',{name:'End conversation'}).click();
    const download=page.waitForEvent('download');await page.evaluate(()=>window.__finishPhoto());
    await (await download).saveAs(${JSON.stringify(path.join(output, "photo-call.webm"))});
  `);

  run(`
    await page.getByRole('button',{name:'Companion settings'}).click();
    await page.getByRole('radio',{name:/Mira · Static portrait/}).check();
    await page.getByRole('button',{name:'Close settings'}).click();
    await page.waitForFunction(()=>document.querySelector('.avatar-poster')?.naturalWidth>0);
    const before=await page.evaluate(()=>window.__photoFrames.length);await page.waitForTimeout(300);
    if(await page.evaluate(()=>window.__photoFrames.length)!==before)throw new Error('Disposed photographic renderer kept drawing');
    const closed=await page.evaluate(()=>window.__photoClosedImages);
    if(closed<4)throw new Error('Prepared image resources were not released');
    await page.evaluate(closed=>{window.__photoResult.closedImageBitmaps=closed;},closed);
    await page.getByRole('button',{name:'Companion settings'}).click();
    await page.getByRole('radio',{name:/Mira · Photographic preview/}).check();
    await page.getByRole('button',{name:'Close settings'}).click();
    await page.waitForSelector('[data-avatar="mira-photo"][data-ready="true"]');
    await page.evaluate(()=>sessionStorage.setItem('opentavus-photo-check',JSON.stringify(window.__photoResult)));
  `);

  run(`
    await page.route('**/avatars/photo/neutral.webp',route=>route.fulfill({status:200,contentType:'image/webp',body:Buffer.from('broken')}));
    await page.reload();
    await page.getByRole('status').filter({hasText:'Photographic motion could not load'}).waitFor();
    await page.waitForFunction(()=>document.querySelector('.avatar-poster')?.naturalWidth>0);
    await page.screenshot({path:${JSON.stringify(path.join(output, "photo-fallback.png"))},fullPage:true});
  `);
  if (live)
    run(`
    await page.getByRole('textbox',{name:'Your question'}).fill('What is two plus two?');
    await page.getByRole('button',{name:'Send question'}).click();
    await page.locator('.message.assistant').first().waitFor({timeout:110000});
    await page.getByRole('button',{name:'End conversation'}).click();
  `);
  run(`
    await page.unroute('**/avatars/photo/neutral.webp');
    let release;const gate=new Promise(resolve=>{release=resolve;});
    await page.route('**/avatars/photo/neutral.webp',async route=>{await gate;try{await route.continue();}catch{}});
    await page.reload();
    await page.getByRole('button',{name:'Companion settings'}).click();
    await page.getByRole('radio',{name:/Orbit/}).check();
    await page.getByRole('button',{name:'Close settings'}).click();release();
    await page.waitForSelector('[data-avatar="orbit"][data-ready="true"]');await page.waitForTimeout(400);
    if(await page.locator('[data-avatar="mira-photo"]').count())throw new Error('A late portrait replaced Orbit');
    await page.unroute('**/avatars/photo/neutral.webp');
    await page.getByRole('button',{name:'Companion settings'}).click();
    await page.getByRole('radio',{name:/Mira · Photographic preview/}).check();
    await page.getByRole('button',{name:'Close settings'}).click();
    await page.waitForSelector('[data-avatar="mira-photo"][data-ready="true"]');
    await page.evaluate(()=>{window.__photoSavedResult=JSON.parse(sessionStorage.getItem('opentavus-photo-check'));});
    const result=await page.evaluate(()=>({...window.__photoSavedResult,staticCleanup:true,invalidAssetFallback:true,cancelledPreparation:true}));
    const download=page.waitForEvent('download');
    await page.evaluate(value=>{
      const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');
      a.href=url;a.download='photo-metrics.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    },result);
    await (await download).saveAs(${JSON.stringify(path.join(output, "photo-metrics.json"))});
    await page.addInitScript(()=>{
      const get=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(kind,...args){
        if(kind==='2d'&&this.dataset.avatar==='mira-photo')return null;
        return get.call(this,kind,...args);
      };
    });
    await page.reload();
    await page.getByRole('status').filter({hasText:'Portrait animation is unavailable'}).waitFor();
    await page.waitForFunction(()=>document.querySelector('.avatar-poster')?.naturalWidth>0);
  `);
  console.log(
    `Photographic cadence, static cleanup, corrupt asset, cancelled load and unavailable canvas passed.${live ? " Real speech, controlled expressions, Stop and a continuing call after failure passed." : ""}`,
  );
} finally {
  try {
    command("close");
  } catch {
    /* Only this check's browser is owned here. */
  }
}
