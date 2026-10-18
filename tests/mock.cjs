const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('examples/prueba.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];

class Element {
 constructor(){this.value='';this.children=[];this.hidden=false;this.textContent='';}
 append(...items){this.children.push(...items)}
 replaceChildren(){this.children=[]}
 addEventListener(){} setAttribute(){} focus(){}
}
const elements={};const document={getElementById:id=>elements[id]??=new Element(),createElement:()=>new Element(),querySelectorAll:()=>[]};
const ctx=vm.createContext({document,window:{},console,Date,Math,Promise});
vm.runInContext(script,ctx);
vm.runInContext(`
perfil='Cayma'; render();
if ($('history').children.length!==2) throw Error('Historial de Cayma');
if ($('siteView').hidden || !$('adminView').hidden) throw Error('Visibilidad');
`,ctx);
(async()=>{
 await vm.runInContext(`save({action:'crear',sede:'Cayma',detalle:'Prueba <script> literal',solicitante:'Ana Torres',foto:{name:'boton.jpg',type:'image/jpeg',dataUrl:'data:image/jpeg;base64,/9j/2Q=='}})`,ctx);
 vm.runInContext(`if(pedidos[0].Foto.name!=='boton.jpg'||!photoReference(pedidos[0])) throw Error('Foto en solicitud');if(photoReference({Foto:{url:'javascript:alert(1)'}})!==null) throw Error('URL no válida');`,ctx);
 await assert.rejects(vm.runInContext(`readPhoto({type:'image/svg+xml',size:1})`,ctx),/JPG/);
 await assert.rejects(vm.runInContext(`readPhoto({type:'image/jpeg',size:6*1024*1024})`,ctx),/5 MB/);
 vm.runInContext(`render(); if ($('history').children.length!==3) throw Error('Crear'); perfil='Abastecedor';render(); if ($('purchases').children.length!==4) throw Error('Compras');`,ctx);
 vm.runInContext(`
 const line = $('purchases').children[0];
 if (line.className !== 'purchase-line') throw Error('Lista continua');
 if (line.children.length !== 1 || !line.children[0].textContent.includes('[Sede: Cerro Colorado]')) throw Error('Texto sin controles individuales');
 `,ctx);
 await vm.runInContext(`save({action:'actualizar',id:pedidos[0].ID,estado:'Comprado'})`,ctx);
 vm.runInContext(`render(); if ($('purchases').children.length!==3) throw Error('Filtro comprado'); perfil='Administrativo'; $('visit').value='Cayma';render();if ($('deliveries').children.length!==3) throw Error('Checklist');`,ctx);
 await vm.runInContext(`save({action:'actualizar',id:pedidos[0].ID,estado:'Entregado'})`,ctx);
 vm.runInContext(`render();if ($('deliveries').children.length!==2) throw Error('Filtro entregado'); perfil='Cayma';render();if (pedidos[0].Estado!=='Entregado') throw Error('Estado compartido'); $('visit').value='Jose Luis Bustamante'; perfil='Administrativo';render();if ($('deliveries').children[0].className!=='empty') throw Error('Estado vacío');`,ctx);
 assert.equal((html.match(/<option>/g)||[]).length,12);
 assert(!html.includes('id="stats"'), 'Sin métricas decorativas');
 assert(!html.includes('type="checkbox"'), 'Sin controles individuales de compra');
 vm.runInContext(`
 perfil='Yanahuara';render();if (!$('pendingNotice').hidden) throw Error('Entregado no genera aviso');
 perfil='Cayma';render();if ($('pendingNotice').hidden) throw Error('Destacar trabajo pendiente');
 perfil='Administrativo';$('visit').value='Jose Luis Bustamante';render();if (!$('pendingNotice').hidden) throw Error('Sede vacía sin aviso');
 `,ctx);
 vm.runInContext(`perfil='Abastecedor';`,ctx);
 vm.runInContext(`openPurchaseEditor();const pendingIds=pedidos.filter(p=>p.Estado==='Pendiente').map(p=>p.ID);purchaseDraft.set(pendingIds[0],'si');purchaseDraft.set(pendingIds[1],'no');`,ctx);
 await vm.runInContext(`commitPurchases()`,ctx);
 vm.runInContext(`
 if(pedidos.find(p=>p.ID===pendingIds[0]).Estado!=='Comprado') throw Error('Compra parcial');
 if(pedidos.find(p=>p.ID===pendingIds[1]).Estado!=='Pendiente'||!noComprados.has(pendingIds[1])) throw Error('No compré conserva pendiente');
 if($('pendingNotice').hidden) throw Error('Persistir aviso pendiente');
 openPurchaseEditor();purchaseDraft.set(pendingIds[1],'si');closePurchaseEditor();
 if(pedidos.find(p=>p.ID===pendingIds[1]).Estado!=='Pendiente') throw Error('Cancelar conserva estado');
 `,ctx);
 await vm.runInContext(`save({action:'comprarLote',ids:pedidos.filter(p => p.Estado==='Pendiente').map(p => p.ID)})`,ctx);
 vm.runInContext(`render();if (pedidos.some(p => p.Estado==='Pendiente')) throw Error('Compra global');if (!$('buyAll').disabled) throw Error('Botón vacío');if (pedidos[0].Estado!=='Entregado') throw Error('Preservar entregados');if (!$('pendingNotice').hidden) throw Error('Retirar aviso de compras resueltas');`,ctx);
 console.log('OK: sintaxis JavaScript, 7 perfiles + 5 sedes, creación, filtros, compra, entrega y estado vacío.');
})().catch(e=>{console.error(e);process.exitCode=1});
