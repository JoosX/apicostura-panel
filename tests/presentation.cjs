const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('apicostura-hackaton.html','utf8');
class El{
 constructor(){this.children=[];this.attrs={};this.listeners={};this.style={};this.dataset={};this.hidden=false;this.classList={toggle(){}};}
 append(el){this.children.push(el)}setAttribute(k,v){this.attrs[k]=v}removeAttribute(k){delete this.attrs[k]}addEventListener(k,f){this.listeners[k]=f}focus(){}closest(){return null}
}
const els=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new El()]));
const slides=[...html.matchAll(/<section class="slide[^>]*data-title="([^"]+)"/g)].map(m=>{const el=new El();el.dataset.title=m[1];return el});
const roles=[];
const document={getElementById:id=>{assert(els[id],'ID inexistente: '+id);return els[id]},querySelectorAll:selector=>selector==='.slide'?slides:roles,createElement:()=>new El(),addEventListener(){},documentElement:{},fullscreenElement:null};
const ctx=vm.createContext({URL,URLSearchParams,document,window:{scrollTo(){},addEventListener(){}},location:{hash:''},history:{replaceState(){}},console});
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
assert.equal(els.backHost.hidden,true,'No mostrar regreso sin destino');
const hostContext=vm.createContext({URL,URLSearchParams,document,window:{scrollTo(){},addEventListener(){}},location:{hash:'',search:'?anfitrion=https%3A%2F%2Fexample.com%2Fpitch%23cierre',href:'https://example.com/panel.html',protocol:'https:'},history:{replaceState(){}},console});
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],hostContext);
assert.equal(els.backHost.attrs.href,'https://example.com/pitch#cierre');
assert.equal(els.backHost.hidden,false);
// Reiniciar los elementos del arnés antes de las comprobaciones de navegación.
els.dots.children=[];
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],vm.createContext({URL,URLSearchParams,document,window:{scrollTo(){},addEventListener(){}},location:{hash:'',search:'?anfitrion=javascript:alert(1)',href:'https://example.com/panel.html',protocol:'https:'},history:{replaceState(){}},console}));
assert.equal(els.backHost.hidden,true,'No aceptar destinos ejecutables');
assert.equal(slides.length,4);assert.equal(els.dots.children.length,4);assert(els.prev.disabled);
for(let i=1;i<4;i++)els.next.listeners.click();assert(els.next.disabled);assert.equal(els.counter.textContent,'04 / 04');
els.dots.children[2].listeners.click();assert.equal(els.counter.textContent,'03 / 04');
els.notFound.listeners.click();assert.equal(els.pendingNumber.textContent,'1');assert(els.demoState.textContent.includes('sigue pendiente'));
els.buy.listeners.click();assert.equal(els.pendingNumber.textContent,'1');assert.equal(els.deliver.hidden,false);
els.deliver.listeners.click();assert.equal(els.pendingNumber.textContent,'0');assert.equal(els.demoState.textContent,'Entregado · en el historial');
els.resetDemo.listeners.click();assert.equal(els.pendingNumber.textContent,'1');

els.speakerNotes.hidden=true;els.notesToggle.listeners.click();assert.equal(els.speakerNotes.hidden,false);
assert(!/<script[^>]+src=/.test(html));assert(!/<link[^>]+href=/.test(html));
console.log('OK: 4 diapositivas, navegación, perfiles, compra pendiente/entregada, reinicio, guion y archivo autónomo.');
