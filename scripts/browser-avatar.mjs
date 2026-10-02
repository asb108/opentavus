// Opt-in real browser checks. Only --live captures synthetic generated speech.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const live = process.argv.includes("--live");
const server = process.env.OPENTAVUS_TEST_URL ?? "http://127.0.0.1:8765";
const session = `opentavus-avatar-${process.pid}`;
const output = path.join(root, "output/playwright");
mkdirSync(output, { recursive: true });
const config = path.join(output, `${session}.config.json`);
writeFileSync(
  config,
  JSON.stringify({
    browser: {
      browserName: "chromium",
      launchOptions: { channel: "chrome" },
      contextOptions: { viewport: { width: 1440, height: 1000 } },
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
  run(String.raw`
    await page.addInitScript(() => {
      window.__humanFrames = [];
      window.__humanEvents = [];
      const clear = WebGL2RenderingContext.prototype.clear;
      WebGL2RenderingContext.prototype.clear = function(mask) {
        if (this.canvas instanceof HTMLCanvasElement && this.canvas.dataset.avatar === 'mira' &&
            mask & this.COLOR_BUFFER_BIT && window.__humanFrames.length < 18000)
          window.__humanFrames.push(performance.now());
        return clear.call(this, mask);
      };
      const Worklet = window.AudioWorkletNode;
      window.AudioWorkletNode = class extends Worklet {
        constructor(...args) {
          super(...args);
          this.port.addEventListener('message', ({data}) => {
            if (window.__humanEvents.length < 20000 && (data.type !== 'progress' || data.level > 0 || data.done))
              window.__humanEvents.push({t:performance.now(),type:data.type,generation:data.generation,
                oldGeneration:data.oldGeneration,level:data.level,idle:data.idle,done:data.done});
          });
          this.port.start();
        }
      };
    });
    await page.reload();
    await page.getByRole('button',{name:'Companion settings'}).click();
    await page.getByRole('radio',{name:/Mira · 3D human/}).check();
    await page.getByRole('button',{name:'Close settings'}).click();
    await page.waitForSelector('[data-avatar="mira"][data-ready="true"]');
    const gl = await page.locator('canvas.avatar').evaluate(canvas => {
      const context = canvas.getContext('webgl2');
      const ext = context.getExtension('WEBGL_debug_renderer_info');
      return {width:canvas.width,height:canvas.height,renderer:ext ? context.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unavailable'};
    });
    const start = await page.evaluate(() => performance.now());
    await page.waitForTimeout(5000);
    const cadence = await page.evaluate(start => {
      const frames = window.__humanFrames.filter(t => t >= start);
      const gaps = frames.slice(1).map((t,i) => t-frames[i]);
      const sorted = [...gaps].sort((a,b) => a-b);
      return {frames:frames.length,durationMs:frames.at(-1)-frames[0],
        fps:(frames.length-1)*1000/(frames.at(-1)-frames[0]),
        p95GapMs:sorted[Math.floor(sorted.length*.95)],firstFrameAfterNavigationMs:window.__humanFrames[0],
        gapsOver100Ms:gaps.filter(t=>t>100).length};
    }, start);
    if (cadence.fps < 28 || cadence.gapsOver100Ms) throw new Error('Stock human missed the bounded cadence check: '+JSON.stringify(cadence));
    await page.evaluate(value => { window.__humanResult={graphics:value.gl,idle:value.cadence}; },{gl,cadence});
    await page.screenshot({path:${JSON.stringify(path.join(output, "human-idle.png"))},fullPage:true});
  `);

  if (process.argv.includes("--capture-poster")) {
    run(`
      const download = page.waitForEvent('download');
      await page.evaluate(async () => {
        const canvas = document.querySelector('canvas.avatar');
        // Capture a freshly drawn native-resolution buffer before it is discarded.
        await new Promise(resolve => {
          const capture = now => {
            if (now-window.__humanFrames.at(-1)>4) { requestAnimationFrame(capture); return; }
            canvas.toBlob(blob => {
              const url=URL.createObjectURL(blob),a=document.createElement('a');
              a.href=url;a.download='mira.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);resolve();
            });
          };
          requestAnimationFrame(capture);
        });
      });
      await (await download).saveAs(${JSON.stringify(path.join(root, "assets/stock/mira/mira.png"))});
    `);
  }

  if (live) {
    run(`
      await page.evaluate(() => {
        const Worklet=window.AudioWorkletNode;
        window.AudioWorkletNode=class extends Worklet {
          constructor(...args) {
            super(...args);
            const destination=args[0].createMediaStreamDestination();
            this.connect(destination);
            const picture=document.querySelector('canvas.avatar').captureStream(30);
            const stream=new MediaStream([...picture.getVideoTracks(),...destination.stream.getAudioTracks()]);
            const chunks=[];
            const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8,opus'});
            recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
            recorder.start(100);
            window.__finishHumanCapture=async()=>{
              await new Promise(resolve=>{recorder.onstop=resolve;recorder.stop();});
              stream.getTracks().forEach(track=>track.stop());
              const url=URL.createObjectURL(new Blob(chunks,{type:'video/webm'})),a=document.createElement('a');
              a.href=url;a.download='human-call.webm';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
            };
          }
        };
      });
      await page.getByRole('textbox',{name:'Your question'}).fill('Explain the steps of photosynthesis in four short sentences.');
      await page.getByRole('button',{name:'Send question'}).click();
      await page.waitForFunction(()=>window.__humanEvents.some(e=>e.type==='progress'&&e.level>.04)||document.querySelector('[role="alert"]'),null,{timeout:110000});
      if(await page.getByRole('alert').count())throw new Error(await page.getByRole('alert').innerText());
      if((await page.locator('.message.assistant strong').first().innerText())!=='Mira')throw new Error('The human call used the wrong identity.');
      await page.screenshot({path:${JSON.stringify(path.join(output, "human-speaking.png"))},fullPage:true});
      await page.waitForTimeout(1200);
      await page.evaluate(()=>{window.__humanStop=performance.now();});
      await page.getByRole('button',{name:'Stop reply'}).click();
      await page.waitForFunction(()=>window.__humanEvents.some(e=>e.type==='stopped'&&e.t>window.__humanStop));
      await page.screenshot({path:${JSON.stringify(path.join(output, "human-stopped.png"))},fullPage:true});
      await page.waitForTimeout(300);
      await page.evaluate(()=>{
        const reset=window.__humanEvents.find(e=>e.type==='stopped'&&e.t>window.__humanStop);
        const late=window.__humanEvents.filter(e=>e.type==='progress'&&e.generation===reset.oldGeneration&&e.t>reset.t&&e.level>0);
        if(late.length)throw new Error('Old-generation speech played after Stop.');
        window.__humanResult.live={stopClickToWorkletAckMs:reset.t-window.__humanStop,stalePositiveEnergy:late.length,
          positiveEnergyEvents:window.__humanEvents.filter(e=>e.level>0).length};
      });
      await page.getByRole('button',{name:'End conversation'}).click();
      const video=page.waitForEvent('download');
      await page.evaluate(()=>window.__finishHumanCapture());
      await (await video).saveAs(${JSON.stringify(path.join(output, "human-call.webm"))});
    `);
  }

  run(`
    await page.getByRole('button',{name:'Companion settings'}).click();
    await page.getByRole('radio',{name:/Mira · Static portrait/}).check();
    await page.getByRole('button',{name:'Close settings'}).click();
    await page.waitForSelector('[data-avatar="portrait"][data-ready="true"]',{state:'attached'});
    await page.waitForFunction(()=>document.querySelector('.avatar-poster')?.naturalWidth>0);
    const before=await page.evaluate(()=>window.__humanFrames.length);
    await page.waitForTimeout(300);
    if(await page.evaluate(()=>window.__humanFrames.length)!==before)throw new Error('Disposed human kept rendering in portrait mode.');
    await page.screenshot({path:${JSON.stringify(path.join(output, "human-static.png"))},fullPage:true});
    await page.getByRole('button',{name:'Companion settings'}).click();
    await page.getByRole('radio',{name:/Mira · 3D human/}).check();
    await page.getByRole('button',{name:'Close settings'}).click();
    await page.waitForSelector('[data-avatar="mira"][data-ready="true"]');
    await page.locator('canvas.avatar').evaluate(canvas=>canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
    await page.getByRole('status').filter({hasText:'Browser graphics stopped'}).waitFor();
    await page.waitForFunction(()=>document.querySelector('.avatar-poster')?.naturalWidth>0);
    await page.screenshot({path:${JSON.stringify(path.join(output, "human-context-loss.png"))},fullPage:true});
    const checks=await page.evaluate(()=>({...window.__humanResult,staticCleanup:true,contextLossFallback:true}));
    const download=page.waitForEvent('download');
    await page.evaluate(value=>{
      const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');
      a.href=url;a.download='human-metrics.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    },checks);
    await (await download).saveAs(${JSON.stringify(path.join(output, "human-metrics.json"))});
  `);

  run(`
    await page.route('**/avatars/mira.glb',route=>route.fulfill({status:200,body:'Invalid GLB',contentType:'model/gltf-binary'}));
    await page.reload();
    await page.getByRole('status').filter({hasText:'The human asset could not load'}).waitFor();
    await page.waitForFunction(()=>document.querySelector('.avatar-poster')?.naturalWidth>0);
    await page.screenshot({path:${JSON.stringify(path.join(output, "human-bad-asset.png"))},fullPage:true});
    await page.unroute('**/avatars/mira.glb');
  `);

  if (live) {
    run(`
      await page.getByRole('textbox',{name:'Your question'}).fill('Say hello in one short sentence.');
      await page.getByRole('button',{name:'Send question'}).click();
      await page.waitForFunction(()=>window.__humanEvents.some(e=>e.type==='caption')||document.querySelector('[role="alert"]'),null,{timeout:110000});
      if(await page.getByRole('alert').count())throw new Error(await page.getByRole('alert').innerText());
      await page.getByRole('button',{name:'Stop reply'}).click();
      await page.getByRole('button',{name:'End conversation'}).click();
    `);
  }

  run(`
    let release;
    const gate=new Promise(resolve=>{release=resolve;});
    await page.route('**/avatars/mira.glb',async route=>{
      await gate;
      try { await route.fulfill({path:${JSON.stringify(path.join(root, "assets/stock/mira/mira.glb"))},contentType:'model/gltf-binary'}); } catch { /* Expected when the selected renderer's fetch was aborted. */ }
    });
    await page.reload({waitUntil:'domcontentloaded'});
    await page.getByRole('status').filter({hasText:'Loading human avatar'}).waitFor();
    await page.getByRole('button',{name:'Companion settings'}).click();
    await page.getByRole('radio',{name:/Orbit/}).check();
    await page.getByRole('button',{name:'Close settings'}).click();
    await page.waitForSelector('[data-avatar="orbit"][data-ready="true"]');
    release();
    await page.waitForTimeout(350);
    if(!(await page.locator('[data-avatar="orbit"][data-ready="true"]').isVisible())||await page.locator('.avatar-notice').count())
      throw new Error('An obsolete human load changed the selected character.');
    await page.unroute('**/avatars/mira.glb');
    await page.evaluate(()=>localStorage.setItem('opentavus.settings.v1',JSON.stringify({model:'qwen2.5:1.5b',voice:'af_heart',avatar:'mira'})));
    await page.addInitScript(()=>{
      const get=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,...args){
        if(type==='webgl2')return null;
        return get.call(this,type,...args);
      };
    });
    await page.reload();
    await page.getByRole('status').filter({hasText:'WebGL 2 is unavailable'}).waitFor();
    await page.waitForFunction(()=>document.querySelector('.avatar-poster')?.naturalWidth>0);
    await page.screenshot({path:${JSON.stringify(path.join(output, "human-no-webgl.png"))},fullPage:true});
  `);
  console.log(
    "Stock human cadence, static mode, context loss, invalid asset, cancelled load and missing WebGL checks passed." +
      (live ? " Real speech, Stop and a call after graphics failure passed." : ""),
  );
} catch (error) {
  try {
    command("snapshot");
    run(
      `await page.screenshot({path:${JSON.stringify(path.join(output, "human-failure.png"))},fullPage:true});`,
    );
  } catch {
    /* Keep the original check failure. */
  }
  throw error;
} finally {
  command("close");
}
