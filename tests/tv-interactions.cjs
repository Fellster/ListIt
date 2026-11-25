const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const server=await require('./start-vite.cjs')(5180);const browser=await chromium.launch({...(process.env.LISTIT_TEST_CHROME?{executablePath:process.env.LISTIT_TEST_CHROME}:{}),headless:true,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-zygote']});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{if(!localStorage.getItem('test-state'))localStorage.setItem('test-state',JSON.stringify({version:1,defaultTheme:'blue',streamingServices:['Netflix'],lists:[{id:'tv',name:'TV',template:'TV',group:'Personal',items:[{id:'a',title:'Show A',done:false,fields:{Season:'2','Streaming service':'Hulu'}},{id:'b',title:'Show B',done:false,fields:{Season:'1','Streaming service':'Apple TV+'}},{id:'c',title:'Show C',done:false,fields:{Notes:'Later'}}]},{id:'grocery',name:'Grocery',template:'Grocery',group:'Personal',items:[]}]}))});
 await page.goto('http://127.0.0.1:5180/tests/fixtures/items.html');
 assert.equal(await page.locator('[data-item-id="a"] .r-detail-piece').first().innerText(),'Hulu');
 assert.equal(await page.locator('[data-item-id="b"] .r-detail-piece').first().innerText(),'Apple+');
 assert.equal(await page.getByLabel('Filter by streaming service').count(),0);
 const order=page.getByLabel('Sort list');await order.selectOption('service');
 assert.deepEqual(await page.locator('.r-item span').allTextContents(),['Show B','Show A','Show C']);assert.equal(await page.locator('.r-drag-handle').count(),0);
 await page.getByLabel('Filter list',{exact:true}).fill('Show A');assert.deepEqual(await page.locator('.r-item span').allTextContents(),['Show A']);await page.getByLabel('Filter list',{exact:true}).fill('');
 await order.selectOption('manual');assert.deepEqual(await page.locator('.r-item span').allTextContents(),['Show A','Show B','Show C']);
 await page.getByRole('button',{name:'Show C',exact:true}).click();const service=page.getByRole('combobox',{name:'Streaming service',exact:true});await service.focus();assert.equal(await service.inputValue(),'');assert.deepEqual(await page.getByRole('listbox',{name:'Saved streaming services'}).getByRole('option').allTextContents(),['Apple+','Hulu','Netflix']);
 await service.fill('Disney+');await page.getByRole('button',{name:'Save',exact:true}).click();await page.waitForFunction(()=>window.__saved?.streamingServices?.includes('Disney+'));
 assert.deepEqual(await page.evaluate(()=>window.__saved.streamingServices),['Apple+','Disney+','Hulu','Netflix']);
 await page.getByRole('button',{name:'Show C',exact:true}).click();await service.fill('Not saved');await page.getByRole('button',{name:'Cancel',exact:true}).click();assert(!(await page.evaluate(()=>window.__saved.streamingServices)).includes('Not saved'));
 await page.reload();await page.getByRole('button',{name:'Show C',exact:true}).click();await service.focus();await service.fill('net');await service.press('ArrowDown');await service.press('Enter');assert.equal(await service.inputValue(),'Netflix');await page.getByRole('button',{name:'Save',exact:true}).click();await page.waitForFunction(()=>window.__saved.lists[0].items[2].fields['Streaming service']==='Netflix');
 await page.getByRole('button',{name:'Grocery; drag to reorder',exact:true}).click();assert.equal(await page.getByLabel('Filter by streaming service').count(),0);
 await page.getByRole('button',{name:'TV; drag to reorder',exact:true}).click();assert.equal(await order.inputValue(),'manual');await order.selectOption('service');assert.equal(await page.locator('.r-item').count(),3);
 for(const width of [320,390,768]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 assert.deepEqual(errors,[]);console.log('PASS: existing TV summary order, Apple+ naming, alphabetical grouping without hiding shows, combined search, typed services, history persistence, cancellation, keyboard choice and mobile widths');
} finally {await browser.close();server.kill()}
})().catch(e=>{console.error(e);process.exit(1)});
