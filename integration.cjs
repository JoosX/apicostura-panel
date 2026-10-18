const fs=require('fs'),vm=require('vm'),assert=require('assert');
class Element {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.listeners={};this.hidden=false;this.value='';this.disabled=false;this.attributes={};}
 append(...children){this.children.push(...children)}
 replaceChildren(){this.children=[]}
 addEventListener(type,handler){this.listeners[type]=handler}
 setAttribute(name,value){this.attributes[name]=value}
 removeAttribute(name){delete this.attributes[name]}
 focus(){}
 showModal(){this.open=true}
 close(){this.open=false}
}
class Root {
 set innerHTML(html){this.html=html;this.elements={};for(const match of html.matchAll(/id="([^"]+)"/g))this.elements[match[1]]=new Element();}
 getElementById(id){if(!this.elements[id])throw Error('Elemento inexistente: '+id);return this.elements[id]}
 querySelectorAll(){return Object.values(this.elements)}
}
class Base {
 constructor(){this.ownerDocument={createElement:tag=>new Element(tag)}}
 attachShadow(){this.shadowRoot=new Root()}
}
let Panel;
const context=vm.createContext({HTMLElement:Base,customElements:{get:()=>false,define:(name,type)=>Panel=type},window:{},console,Date,Math,Promise,Set,Map});
const source=fs.readFileSync('src/apicostura-panel.js','utf8');
new vm.Script(source);vm.runInContext(source,context);
const image='data:image/jpeg;base64,/9j/2Q==';
let rows=[{ID:'p1',Fecha:new Date().toISOString(),Sede_Solicitante:'Cayma',Detalle_Pedido:'Botón negro',Estado:'Pendiente',Solicitante:'Ana Torres',Foto:{dataUrl:image}}];
const calls=[];
const adapter={
 listarPedidos:async()=>rows.map(p=>({...p})),
 crearPedido:async p=>{calls.push(p);rows.push({ID:'p2',Fecha:new Date().toISOString(),Sede_Solicitante:p.sede,Detalle_Pedido:p.detalle,Estado:'Pendiente',Solicitante:p.solicitante,Foto:p.foto})},
 actualizarEstado:async p=>{rows.find(r=>r.ID===p.id).Estado=p.estado},
 registrarCompras:async ({resultados})=>{resultados.forEach(r=>{const p=rows.find(p=>p.ID===r.id);p.Estado=r.resultado==='Comprado'?'Comprado':'Pendiente';p.No_Comprado=r.resultado==='No comprado'})}
};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 const site=new Panel();await site.configure({session:{rol:'Sede',sede:'Cayma',nombre:'Ana Torres'},adapter});
 const root=site.shadowRoot;
 assert.equal(root.getElementById('requester').value,'Ana Torres');
 assert.equal(root.getElementById('history').children[0].children.find(c=>c.tagName==='details').children[1].src,image);
 assert(!root.html.includes('id="login"'));assert(!root.html.includes('id="logout"'));
 root.getElementById('detail').value='Cierre azul';
 root.getElementById('requestForm').listeners.submit({preventDefault(){}});await flush();
 assert.equal(calls.length,0,'No guardar antes de confirmar');
 root.getElementById('cancelConfirm').listeners.click();
 assert.equal(root.getElementById('detail').value,'Cierre azul','Volver conserva el texto');
 root.getElementById('requestForm').listeners.submit({preventDefault(){}});
 root.getElementById('acceptConfirm').listeners.click();await flush();
 assert.equal(calls[0].solicitante,'Ana Torres');assert.equal(calls[0].foto,null);
 const buyer=new Panel();await buyer.configure({session:{rol:'Abastecedor'},adapter});
 const b=buyer.shadowRoot;
 b.getElementById('buyAll').listeners.click();
 const review=b.getElementById('purchaseReview').children;
 review[0].children[1].value='no';review[0].children[1].listeners.change();
 review[1].children[1].value='si';review[1].children[1].listeners.change();
 b.getElementById('savePurchases').listeners.click();await flush();
 assert.equal(rows[1].Estado,'Pendiente','Compra espera confirmación');
 b.getElementById('acceptConfirm').listeners.click();await flush();
 assert.equal(rows[0].Estado,'Pendiente');assert(rows[0].No_Comprado);assert.equal(rows[1].Estado,'Comprado');
 const admin=new Panel();await admin.configure({session:{rol:'Administrativo'},adapter});
 const a=admin.shadowRoot;a.getElementById('visit').value='Cayma';a.getElementById('visit').listeners.change();
 const first=a.getElementById('deliveries').children[0];assert(first.children.some(c=>c.tagName==='details'));
 first.children.find(c=>c.tagName==='button').listeners.click();await flush();assert.equal(rows[0].Estado,'Pendiente','Entrega espera confirmación');
 a.getElementById('acceptConfirm').listeners.click();await flush();assert.equal(rows[0].Estado,'Entregado');
 const updatedSite=new Panel();await updatedSite.configure({session:{rol:'Sede',sede:'Cayma'},adapter});
 assert.equal(updatedSite.shadowRoot.getElementById('history').children.length,1);
 assert.equal(updatedSite.shadowRoot.getElementById('deliveredOrders').children.length,1);
 assert.equal(updatedSite.shadowRoot.getElementById('deliveredHistory').hidden,false);
 const failing=new Panel();await failing.configure({session:{rol:'Sede',sede:'Cayma'},adapter:{...adapter,listarPedidos:async()=>{throw Error('Conexión no disponible')}}});
 assert.equal(failing.shadowRoot.getElementById('message').textContent,'Conexión no disponible');
 console.log('OK: módulo sin datos ficticios, sesión, creación, fotos, compras parciales, entrega y error de conexión.');
})().catch(error=>{console.error(error);process.exitCode=1});
