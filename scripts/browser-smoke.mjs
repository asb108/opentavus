// Drives the real page through Playwright CLI; no test-framework/browser download required.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const cli = path.join(root, "node_modules/.bin/playwright-cli");
const live = process.argv.includes("--live");
const microphone = process.argv.includes("--microphone");
const headed = process.argv.includes("--headed");
const session = `opentavus-check-${process.pid}`;
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
  const result = execFileSync(cli, [`--session=${session}`, ...args], {
    cwd: root,
    encoding: "utf8",
    timeout: 180000,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (/^### Error/m.test(result)) throw new Error(result);
  return result;
}
function run(code) {
  return command("run-code", `async (page) => { ${code} }`);
}
try {
  command("open", "http://127.0.0.1:8765", `--config=${config}`, ...(headed ? ["--headed"] : []));
  // Snapshot establishes the currently rendered UI before scripted interactions.
  command("snapshot");
  run(`
    await page.getByRole('region', {name:'Shared teaching board'}).waitFor();
    if (!(await page.getByRole('textbox', {name:'Your question'}).isVisible()))
      throw new Error('Question composer is missing.');
    await page.getByRole('button', {name:'Companion settings'}).click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('button', {name:'Close settings'}).click();
    await page.setViewportSize({width:390,height:844});
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2))
      throw new Error('The mobile page overflows horizontally.');
    await page.setViewportSize({width:1440,height:1000});
  `);
  command("snapshot");
  command("screenshot", `--filename=${path.join(output, "smoke-home.png")}`);
  if (live || microphone) {
    command(
      "run-code",
      readFileSync(path.join(root, "scripts/browser-instrument.js"), "utf8")
        .trim()
        .replace(/;$/, ""),
    );
    if (microphone) {
      const fixture = path.join(root, "tests/fixtures/speech/photosynthesis.wav");
      run(`
        await page.route('**/synthetic-microphone.wav', route => route.fulfill({path:${JSON.stringify(fixture)},contentType:'audio/wav'}));
        await page.evaluate(() => {
          navigator.mediaDevices.getUserMedia = async () => {
            const context = new AudioContext({sampleRate:48000});
            const source = context.createBufferSource();
            source.buffer = await context.decodeAudioData(await (await fetch('/synthetic-microphone.wav')).arrayBuffer());
            const destination = context.createMediaStreamDestination();
            source.connect(destination);
            await context.resume();
            source.start(context.currentTime + 8);
            window.__syntheticContext = context;
            window.__syntheticTrack = destination.stream.getAudioTracks()[0];
            return destination.stream;
          };
        });
        await page.getByRole('button', {name:'Start conversation',exact:true}).click();
        await page.getByRole('button', {name:'Mute microphone',exact:true}).waitFor({timeout:110000});
        await page.waitForFunction(() => document.querySelector('.transcript')?.textContent.toLowerCase().includes('photosynthesis'), null, {timeout:110000});
        await page.waitForFunction(() => window.__alphaEvents.some(e => e.direction==='playout' && e.type==='caption'), null, {timeout:110000});
        if (await page.getByRole('alert').count()) throw new Error('The synthetic microphone call reported a failure.');
        await page.getByRole('button', {name:'End conversation'}).click();
        if (!(await page.evaluate(() => window.__syntheticTrack.readyState === 'ended')))
          throw new Error('The microphone track was not released.');
        await page.evaluate(() => window.__syntheticContext.close());
      `);
    } else {
      run(`
      await page.getByTitle('Rectangle — R or 2', {exact:true}).click();
      const area = await page.locator('.drawing-area').boundingBox();
      if (!area) throw new Error('The drawing surface is missing.');
      await page.mouse.move(area.x + area.width * 0.6, area.y + area.height * 0.55);
      await page.mouse.down();
      await page.mouse.move(area.x + area.width * 0.6 + 100, area.y + area.height * 0.55 + 60, {steps:8});
      await page.mouse.up();
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('opentavus.board.v1') || '[]').some(e => e.type === 'rectangle' && !e.isDeleted));
      await page.evaluate(() => { window.__userDrawingIds = JSON.parse(localStorage.getItem('opentavus.board.v1')).filter(e => !e.isDeleted).map(e => e.id); });
      await page.getByRole('button', {name:'Start conversation',exact:true}).waitFor({state:'visible'});
      await page.getByRole('textbox', {name:'Your question'}).fill('What is two plus two? Answer in one sentence.');
      await page.getByRole('button', {name:'Send question'}).click();
      await page.waitForFunction(() => window.__alphaEvents.some(e => e.direction==='playout' && e.type==='caption') || document.querySelector('[role="alert"]'), null, {timeout:110000});
      if (await page.getByRole('alert').count()) throw new Error(await page.getByRole('alert').innerText());
      await page.getByRole('button', {name:'Stop reply'}).click();
      await page.waitForFunction(() => { const stop = window.__alphaEvents.find(e => e.type==='stop'); return stop && window.__alphaEvents.some(e => e.type==='stopped' && e.t>stop.t); }, null, {timeout:10000});
      await page.getByRole('button', {name:'Companion settings'}).click();
      await page.getByRole('radio', {name:/Qwen 2.5 0.5b/}).check();
      await page.getByRole('radio', {name:/Michael/}).check();
      await page.getByRole('radio', {name:/Lumen/}).check();
      await page.getByRole('button', {name:'Close settings'}).click();
      if (!(await page.locator('.model-caption').innerText()).includes('1.5b') ||
          !(await page.locator('.model-caption').innerText()).includes('Heart'))
        throw new Error('Settings replaced the active call profile.');
      const conversation = page.getByRole('region', {name:'AI conversation'});
      await conversation.getByRole('button', {name:'Teach on board'}).click();
      await page.evaluate(() => { window.__lessonStart = performance.now(); });
      await page.getByRole('textbox', {name:'Your question'}).fill('Teach Newtons second law using F=ma and one multiple-choice practice question about which equation describes it.');
      await page.getByRole('button', {name:'Send question'}).click();
      await page.waitForFunction(() => document.querySelector('.lesson-card') || document.querySelector('[role="alert"]'), null, {timeout:110000});
      if (await page.getByRole('alert').count()) throw new Error(await page.getByRole('alert').innerText());
      await page.waitForFunction(() => window.__alphaEvents.some(e => e.direction==='playout' && e.type==='caption' && e.t>window.__lessonStart), null, {timeout:110000});
      await page.waitForFunction(() => /newton|force|mass|acceleration/i.test([...document.querySelectorAll('.message.assistant p')].at(-1)?.textContent || ''), null, {timeout:110000});
      await page.evaluate(() => window.__alphaEvents.push({t:performance.now(),direction:'check',type:'lesson_useful_caption'}));
      if (await page.getByRole('alert').count()) throw new Error('The live call reported a failure.');
      await page.locator('.quiz-choices').getByRole('button', {name:/F[ ]*=[ ]*m[ ·*]*a/}).click();
      await page.locator('.quiz-feedback').waitFor();
      if (!(await page.locator('.quiz-feedback').innerText()).startsWith("That's right."))
        throw new Error('The generated quiz marks the correct F=ma answer wrong.');
      const pngPromise = page.waitForEvent('download');
      await page.getByRole('button', {name:'Canvas',exact:true}).click();
      await (await pngPromise).saveAs(${JSON.stringify(path.join(output, "smoke-board.png"))});
      const lessonPromise = page.waitForEvent('download');
      await page.getByRole('button', {name:'Lesson',exact:true}).click();
      await (await lessonPromise).saveAs(${JSON.stringify(path.join(output, "smoke-lesson.md"))});
      await page.screenshot({path:${JSON.stringify(path.join(output, "smoke-lesson.png"))},fullPage:true});
      await page.getByRole('button', {name:'Stop reply'}).click();
      await page.getByRole('button', {name:'End conversation'}).click();
    `);
      run(`
      await page.getByRole('button', {name:'Start conversation',exact:true}).waitFor({state:'visible'});
      await page.getByRole('region', {name:'AI conversation'}).getByRole('button', {name:'Teach on board'}).click();
      await page.evaluate(() => { window.__secondCallStart = performance.now(); });
      await page.getByRole('textbox', {name:'Your question'}).fill('Say hello in one short sentence.');
      await page.getByRole('button', {name:'Send question'}).click();
      await page.waitForFunction(() => window.__alphaEvents.some(e => e.direction==='playout' && e.type==='caption' && e.t>window.__secondCallStart) || document.querySelector('[role="alert"]'), null, {timeout:110000});
      if (await page.getByRole('alert').count()) throw new Error(await page.getByRole('alert').innerText());
      if (!(await page.locator('.model-caption').innerText()).includes('0.5b') ||
          !(await page.locator('.model-caption').innerText()).includes('Michael') ||
          !(await page.getByRole('heading', {name:'Lumen',exact:true}).isVisible()))
        throw new Error('The second call did not use the selected profile.');
      const speakers = await page.locator('.message.assistant strong').allTextContents();
      if (speakers.length < 3 || speakers.at(-1) !== 'Lumen' || speakers[0] !== 'Orbit')
        throw new Error('Transcript generations or speaker names crossed call boundaries.');
      await page.getByRole('button', {name:'Stop reply'}).click();
      await page.getByRole('button', {name:'End conversation'}).click();
      await page.getByRole('button', {name:'Clear AI notes',exact:true}).click();
      await page.waitForFunction(() => {
        const drawings = JSON.parse(localStorage.getItem('opentavus.board.v1') || '[]');
        return window.__userDrawingIds.every(id => drawings.some(e => e.id === id && !e.isDeleted));
      });
      if (await page.locator('.lesson-card').count()) throw new Error('AI cards were not cleared.');
      if (await page.getByRole('alert').count()) throw new Error('The second call reported a failure.');
      await page.screenshot({path:${JSON.stringify(path.join(output, "smoke-second-profile.png"))},fullPage:true});
    `);
    }
    if (microphone)
      command("screenshot", `--filename=${path.join(output, "smoke-microphone.png")}`);
    const metrics = command(
      "eval",
      `() => ({schema_version:1,measurement:'browser clock; not speaker waveform',events:window.__alphaEvents})`,
    );
    const match = metrics.match(/### Result\n([\s\S]*?)\n### Ran/);
    if (!match) throw new Error("Browser evidence was not returned.");
    writeFileSync(
      path.join(output, microphone ? "smoke-microphone-events.json" : "smoke-live-events.json"),
      JSON.stringify(JSON.parse(match[1]), null, 2),
    );
  }
  console.log(
    `Chrome ${microphone ? "synthetic microphone and real inference" : live ? "live model and lesson" : "page/settings/mobile"} smoke passed. Artifacts: output/playwright/.`,
  );
} catch (failure) {
  // This script asks only the committed public synthetic questions. Its opt-in
  // diagnostic capture is local; application diagnostics still exclude content.
  if (live || microphone) {
    try {
      run(
        `await page.screenshot({path:${JSON.stringify(path.join(output, "smoke-failure.png"))},fullPage:true}); console.log(await page.locator('.lesson-cards').allTextContents());`,
      );
      writeFileSync(path.join(output, "smoke-failure-state.txt"), command("snapshot"));
    } catch {
      /* Preserve the original failure if the page already closed. */
    }
  }
  throw failure;
} finally {
  // Closing our isolated browser releases its socket/mic even on a failed assertion.
  command("close");
}
