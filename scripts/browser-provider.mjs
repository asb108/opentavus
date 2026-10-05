// Opt-in real local compatible endpoint proof, using public synthetic prompts only.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const cli = path.join(root, "node_modules/.bin/playwright-cli");
const session = `opentavus-provider-${process.pid}`;
const providerId = `browser-fixture-${process.pid}`;
const output = path.join(root, "output/playwright");
const base = process.env.OPENTAVUS_TEST_URL ?? "http://127.0.0.1:8765";
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
  let result;
  try {
    result = execFileSync(cli, [`--session=${session}`, ...args], {
      cwd: root,
      encoding: "utf8",
      timeout: 180000,
      maxBuffer: 4 * 1024 * 1024,
    });
  } catch (failure) {
    throw new Error(String(failure.stdout || "The browser check could not finish.").slice(0, 1000));
  }
  if (/^### Error/m.test(result)) throw new Error(result);
  return result;
}
function run(code) {
  return command("run-code", `async (page) => { ${code} }`);
}
try {
  command("open", base, `--config=${config}`);
  command("snapshot");
  run(`
    await page.getByRole('button',{name:'Companion settings'}).click();
    await page.getByRole('button',{name:'Add model provider'}).click();
    await page.getByLabel('Provider ID',{exact:true}).fill(${JSON.stringify(providerId)});
    await page.getByLabel('Display name',{exact:true}).fill('Browser fixture compatible');
    await page.getByLabel('API key',{exact:true}).fill('fixture-not-a-real-key');
    await page.getByRole('button',{name:'Save provider',exact:true}).click();
    await page.getByRole('radio',{name:/Browser fixture compatible/}).waitFor();
    await page.getByRole('radio',{name:/Browser fixture compatible/}).check();
    if (await page.getByLabel('API key',{exact:true}).count()) throw new Error('Credential form remained after saving.');
    if (await page.evaluate(() => JSON.stringify(localStorage).includes('fixture-not-a-real-key'))) throw new Error('Credential entered browser storage.');
    await page.getByRole('button',{name:'Close settings'}).click();
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('button',{name:'Companion settings'}).click();
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2)) throw new Error('Mobile settings overflow.');
    await page.getByRole('button',{name:'Close settings'}).click();
    await page.setViewportSize({width:1440,height:1000});
  `);
  command("snapshot");
  command(
    "run-code",
    readFileSync(path.join(root, "scripts/browser-instrument.js"), "utf8").trim().replace(/;$/, ""),
  );
  run(`
    await page.evaluate(() => { window.__providerResults = []; });
    const send = async (label, text, allowBoardError=false) => {
      const started = await page.evaluate(() => performance.now());
      await page.getByRole('textbox',{name:'Your question'}).fill(text);
      await page.getByRole('button',{name:'Send question'}).click();
      await page.waitForFunction(t => window.__alphaEvents.some(e=>e.direction==='playout' && e.type==='caption' && e.t>t), started, {timeout:110000});
      await page.waitForFunction(t => window.__alphaEvents.some(e=>e.direction==='playout' && e.type==='progress' && e.level>0 && e.t>t), started, {timeout:10000});
      if (!allowBoardError && await page.getByRole('alert').count()) throw new Error('Call reported a failure for '+label);
      const events=await page.evaluate(() => window.__alphaEvents);
      const caption=events.find(e=>e.direction==='playout' && e.type==='caption' && e.t>started);
      const audio=events.find(e=>e.direction==='playout' && e.type==='progress' && e.level>0 && e.t>started);
      const applied=events.filter(e=>e.direction==='out' && e.type==='canvas_result' && e.t>started && e.applied);
      await page.evaluate(value => window.__providerResults.push(value), {label,first_caption_ms:Math.round(caption.t-started),first_nonzero_worklet_ms:Math.round(audio.t-started),applied_board_count:applied.length,board_before_caption:applied.length?applied.every(e=>e.t<caption.t):null});
      const stopStart=await page.evaluate(()=>performance.now());
      await page.getByRole('button',{name:'Stop reply'}).click();
      await page.waitForFunction(({t,g}) => window.__alphaEvents.some(e=>e.direction==='playout' && e.type==='stopped' && e.t>t && e.oldGeneration===g), {t:stopStart,g:caption.generation}, {timeout:10000});
      await page.waitForTimeout(100);
      const stopEvents=await page.evaluate(()=>window.__alphaEvents);
      const stop=stopEvents.find(e=>e.direction==='out' && e.type==='stop' && e.t>stopStart);
      const ack=stopEvents.find(e=>e.direction==='playout' && e.type==='stopped' && e.t>stopStart && e.oldGeneration===caption.generation);
      if (!stop || !ack || stopEvents.some(e=>e.direction==='playout' && e.generation===caption.generation && e.t>ack.t && (e.type==='caption' || (e.type==='progress' && e.level>0)))) throw new Error('Obsolete media played after Stop.');
      await page.evaluate(value=>Object.assign(window.__providerResults.at(-1),value),{stop_ack_ms:Math.round(ack.t-stop.t),stale_media_after_stop:0});
    };
    await send('ordinary','Suggest one name for a small neighborhood bakery. One short sentence.');
    if (!(await page.getByRole('region',{name:'AI conversation'}).getByRole('button',{name:'Teach on board'}).isDisabled())) throw new Error('Conversation-only capability was not exposed.');
    await send('correction','Actually, it is a bookshop. Give one name.');
    await send('followup','Why does that name fit a bookshop? One short sentence.');
    await send('unsupported-board','Draw a diagram of photosynthesis on the board.',true);
    if (!(await page.getByRole('alert').innerText()).includes('board result is unavailable')) throw new Error('Unsupported board failure was not actionable.');
    if (await page.locator('.lesson-card').count()) throw new Error('Conversation-only route drew a board result.');
    await page.getByRole('button',{name:'Dismiss error'}).click();
    await send('recovery','Say hello in one short sentence.');
    await page.getByRole('button',{name:'Companion settings'}).click();
    if (!(await page.getByRole('button',{name:'Edit provider'}).isDisabled())) throw new Error('Active credential mutation is possible.');
    await page.getByRole('radio',{name:/Heart/}).check();
    await page.getByRole('radio',{name:/Orbit/}).check();
    await page.getByRole('button',{name:'Close settings'}).click();
    if (!(await page.getByRole('heading',{name:'Einstein',exact:true}).isVisible()) || !(await page.locator('.model-caption').innerText()).includes('Michael')) throw new Error('Selections changed an active call.');
    await page.getByRole('button',{name:'End conversation'}).click();
  `);
  command("snapshot");
  run(`
    await page.getByRole('button',{name:'Companion settings'}).click();
    await page.getByRole('button',{name:'Edit provider'}).click();
    await page.getByLabel('Enable schema-based board tools').check();
    await page.getByRole('button',{name:'Save provider',exact:true}).click();
    await page.getByRole('button',{name:'Close settings'}).click();
  `);
  run(`
    const send = async (label,text) => {
      const started=await page.evaluate(()=>performance.now());
      await page.getByRole('textbox',{name:'Your question'}).fill(text);
      await page.getByRole('button',{name:'Send question'}).click();
      await page.waitForFunction(t=>window.__alphaEvents.some(e=>e.direction==='playout' && e.type==='caption' && e.t>t) || document.querySelector('[role="alert"]'),started,{timeout:110000});
      if (await page.getByRole('alert').count()) { const codes=await page.evaluate(t=>window.__alphaEvents.filter(e=>e.type==='error' && e.t>t).map(e=>e.code),started); throw new Error('Board failed for '+label+': '+codes.join(',')); }
      await page.waitForFunction(t=>window.__alphaEvents.some(e=>e.direction==='playout' && e.type==='progress' && e.level>0 && e.t>t),started,{timeout:10000});
      const events=await page.evaluate(()=>window.__alphaEvents);
      const applied=events.filter(e=>e.direction==='out' && e.type==='canvas_result' && e.t>started && e.applied);
      const caption=events.find(e=>e.direction==='playout' && e.type==='caption' && e.t>started);
      if (!applied.length || !applied.every(e=>e.t<caption.t)) throw new Error('Speech preceded board application.');
      await page.evaluate(value => window.__providerResults.push(value), {label,first_caption_ms:Math.round(caption.t-started),applied_board_count:applied.length,board_before_caption:true});
      await page.getByRole('button',{name:'Stop reply'}).click();
    };
    await send('formula','Write Newtons second law as the formula F=ma on the board.');
    if (!(await page.locator('.katex').count())) throw new Error('Formula did not render.');
    await send('diagram','Draw a labeled process diagram of photosynthesis on the board.');
    const diagram=await page.locator('.lesson-card svg').last().textContent();
    if (!/light|sunlight/i.test(diagram) || !/glucose|sugar/i.test(diagram) || !/oxygen/i.test(diagram)) throw new Error('Diagram lacks required labels.');
    await send('quiz','Create one multiple-choice practice quiz on the board about Newtons second law.');
    if (!(await page.locator('.quiz-choices button').count())) throw new Error('Quiz did not render.');
    if (!(await page.getByRole('heading',{name:'Orbit',exact:true}).isVisible()) || !(await page.locator('.model-caption').innerText()).includes('Heart')) throw new Error('Next-call face/voice were not preserved.');
    await page.screenshot({path:${JSON.stringify(path.join(output, "provider-local.png"))},fullPage:true});
    await page.getByRole('button',{name:'End conversation'}).click();
  `);
  // Capture only timing/state, never prompts, keys, transcripts or audio packets.

  console.log("Local compatible browser conversation, recovery, Stop and teaching completed.");
} finally {
  try {
    const result = command(
      "eval",
      "() => ({schema_version:1,cases:window.__providerResults ?? [],events:window.__alphaEvents ?? [],browser:navigator.userAgent})",
    );
    const match = result.match(/### Result\n([\s\S]*?)\n### Ran/);
    if (match)
      writeFileSync(
        path.join(output, "provider-local-events.json"),
        JSON.stringify(JSON.parse(match[1]), null, 2),
      );
  } catch {
    /* A browser initialization failure may have no evidence yet. */
  }
  try {
    run(
      `if (await page.getByRole('button',{name:'End conversation'}).count()) await page.getByRole('button',{name:'End conversation'}).click();`,
    );
  } catch {
    /* Failed preparation may have no call. */
  }
  try {
    command("close");
  } catch {
    /* Close only this isolated browser. */
  }
  const response = await fetch(`${base}/api/providers/${encodeURIComponent(providerId)}`, {
    method: "DELETE",
    headers: { Origin: base },
  });
  if (!response.ok)
    console.error("Browser fixture profile cleanup did not finish; inspect settings.");
}
