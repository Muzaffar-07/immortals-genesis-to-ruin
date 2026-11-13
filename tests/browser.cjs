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
    assert.equal(await page.locator('canvas').count(),1);
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
      await page.keyboard.down('d');
      await page.waitForTimeout(100);
      await page.keyboard.up('d');
      await page.keyboard.press('q');
      await page.keyboard.press('Space');
      await page.keyboard.press('p');
      await page.getByRole('heading',{name:'Paused',exact:true}).waitFor();
      await page.getByRole('button',{name:'Resume',exact:true}).click();
      await page.getByRole('button',{name:'Pause',exact:true}).waitFor();
      if(name === names[0]) await page.screenshot({path:'test-results/gameplay.png'});
      await page.keyboard.press('p');
      await page.getByRole('button',{name:'Title',exact:true}).click();
      await page.getByRole('button',{name:'Chapters',exact:true}).click();
      console.log('ok browser chapter: '+name);
    }
    await page.getByRole('button',{name:'Back',exact:true}).click();
    await page.setViewportSize({width:800,height:600});
    const rect = await page.locator('canvas').boundingBox();
    assert(rect.width <= 800 && rect.x >= -1);
    assert.deepEqual(errors, []);
    console.log('ok browser: rendering, six chapters, input, pause/resume, responsive layout, no JS errors');
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.kill());
