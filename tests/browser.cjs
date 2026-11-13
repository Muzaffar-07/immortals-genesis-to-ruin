const { chromium } = require('@playwright/test');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const port = 4200 + Math.floor(Math.random() * 1000);
const server = spawn(process.execPath, ['server.cjs'], {stdio:'pipe',env:{...process.env,PORT:String(port)}});
async function main() {
  await new Promise((resolve,reject) => { server.stdout.once('data',resolve); server.once('error',reject); server.once('exit',code=>reject(new Error('Server exited: '+code))); });
  const browser = await chromium.launch({headless:true,timeout:30000});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:900}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:'+port);
    await page.getByRole('button',{name:'Begin the cycle',exact:true}).waitFor();
    await page.waitForTimeout(1200);
    assert.equal(await page.locator('canvas[data-im-stage]').count(),1);
    assert.equal(await page.locator('canvas.world3d').count(),1, '3D renderer must initialize');
    assert.match(await page.locator('#render-status').innerText(),/1920/);
    assert.equal(await page.locator('canvas.world3d').getAttribute('width'),'1920');
    await page.waitForFunction(()=>document.documentElement.dataset.rigReady==='true');
    await page.getByLabel('Graphics quality',{exact:true}).selectOption('performance');
    await page.getByRole('button',{name:'Journal · M',exact:true}).click();
    await page.getByRole('heading',{name:'THE WOODS REMEMBER',exact:true}).waitFor();
    await page.getByRole('button',{name:'Close journal',exact:true}).click();
    assert.equal(await page.locator('#game').innerText().then(t=>t.includes('{{')),false);
    fs.mkdirSync('test-results',{recursive:true});
    await page.screenshot({path:'test-results/title.png'});
    await page.getByRole('button',{name:'Chapters',exact:true}).click();
    const names = ['First Breath','The First Flame','The Long Ages','Earthfall','The Dying Stars','The End of Making'];
    for (const name of names) {
      await page.getByRole('button',{name:new RegExp(name)}).click();
      await page.getByRole('button',{name:'Skip',exact:true}).click();
      await page.getByRole('button',{name:'Begin',exact:true}).click();
      await page.waitForTimeout(400);
      assert.equal(await page.locator('canvas.world3d').isVisible(),true);
      assert.equal(await page.locator('canvas[data-im-stage]').evaluate(el=>el.style.opacity),'0');
      await page.keyboard.down('d');
      await page.waitForTimeout(100);
      await page.keyboard.up('d');
      await page.keyboard.press('q');
      await page.keyboard.press('Space');
      await page.keyboard.press('p');
      await page.getByRole('heading',{name:'Paused',exact:true}).waitFor();
      await page.getByRole('button',{name:'Resume',exact:true}).click();
      await page.getByRole('button',{name:'Pause',exact:true}).waitFor();
      await page.screenshot({path:'test-results/chapter-'+names.indexOf(name)+'.png'});
      if(name === names[0]) {
        await page.getByLabel('Graphics quality',{exact:true}).selectOption('full');
        await page.waitForTimeout(200);
        await page.screenshot({path:'test-results/gameplay.png'});
        await page.getByLabel('Graphics quality',{exact:true}).selectOption('performance');
        // Toolbar interaction transfers focus; return keyboard control to the game.
        await page.locator('canvas[data-im-stage]').focus();
      }
      await page.keyboard.press('p');
      await page.getByRole('button',{name:'Title',exact:true}).click();
      await page.getByRole('button',{name:'Chapters',exact:true}).click();
      console.log('ok browser chapter: '+name);
    }
    await page.getByRole('button',{name:'Back',exact:true}).click();
    const progress=await page.evaluate(()=>JSON.parse(localStorage.getItem('immortals-progress-v2')));
    assert.equal(progress.chapter,5,'chapter checkpoint should persist');
    await page.getByLabel('Sound',{exact:true}).uncheck();
    await page.getByLabel('Blood',{exact:true}).uncheck();
    await page.setViewportSize({width:800,height:600});
    const rect = await page.locator('canvas[data-im-stage]').boundingBox();
    assert(rect.width <= 800 && rect.x >= -1);
    assert.deepEqual(errors, []);
    console.log('ok browser: rendering, six chapters, input, pause/resume, responsive layout, no JS errors');
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.kill());
