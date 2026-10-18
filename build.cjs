const fs = require('fs');
const html = fs.readFileSync('examples/prueba.html','utf8');
let css = html.match(/<style>([\s\S]*?)<\/style>/)[1].replaceAll(':root',':host').replace(/body\{[^}]*\}/g,'');
css += '\n:host{display:block}.wrap{padding:16px;max-width:760px}#dashboard{margin-top:0}';
let markup = html.match(/<main[\s\S]*?<\/main>/)[0]
 .replace(/<header[\s\S]*?<\/header>/,'')
 .replace(/<section id="login"[\s\S]*?<\/section>/,'')
 .replace(/<footer[\s\S]*?<\/footer>/,'')
 .replace(/<button class="secondary" id="logout">[\s\S]*?<\/button>/,'');
let js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
js = js.replace(/\/\/ HOY:[\s\S]*?(?=let perfil)/, "const SEDES = ['Cerro Colorado','Yanahuara','Avelino Caceres','Cayma','Jose Luis Bustamante'];\nlet pedidos = [];\n");
js = js.replace("let perfil = '', busy = false;", "let perfil = session.rol === 'Sede' ? session.sede : session.rol, busy = false;");
js = js.replace('// Aclaraciones de esta sesión: el estado de los no comprados sigue siendo Pendiente.', '// El backend devuelve No_Comprado sin cambiar Estado=Pendiente.');
js = js.replace(/function gas\([\s\S]*?(?=async function perform)/, `
async function load() {
  notify('Cargando pedidos…');
  const rows = await adapter.listarPedidos({rol:session.rol,sede:session.sede});
  if (!Array.isArray(rows) || rows.some(p => !p || typeof p.ID !== 'string' || !SEDES.includes(p.Sede_Solicitante) || typeof p.Detalle_Pedido !== 'string' || !['Pendiente','Comprado','Entregado'].includes(p.Estado) || !Number.isFinite(new Date(p.Fecha).getTime()))) throw new Error('No se pudieron leer los pedidos. Intenta actualizar.');
  pedidos = rows; noComprados.clear();
  rows.forEach(p => { if (p.No_Comprado && p.Estado === 'Pendiente') noComprados.add(p.ID); });
  notify('');
}
async function save(payload) {
  if (payload.action === 'crear') await adapter.crearPedido(payload);
  else if (payload.action === 'actualizar') await adapter.actualizarEstado({id:payload.id,estado:payload.estado});
  else throw new Error('Acción no disponible.');
  await load();
}
`);
js = js.replace(/^\$\('loginForm'\).*$/m,'');
js = js.replace("$('login').hidden = true; ", '');
js = js.replace(/^\$\('logout'\).*$/m,'');
js = js.replace(/^if \(!MOCK_MODE\).*$/m,'');
js = js.replace("notify(MOCK_MODE ? 'Vista actualizada con los datos de esta demostración.' : 'Pedidos actualizados desde Google Sheets.');", "notify('Pedidos actualizados.');");
js = js.replace(/  if \(bought.length\) await save\([\s\S]*?(?=  render\(\); notify\(bought.length)/, `  await adapter.registrarCompras({resultados:entries.filter(([,value]) => value).map(([id,value]) => ({id,resultado:value === 'si' ? 'Comprado' : 'No comprado'}))});
  await load();
`);
js += `
$('dashboard').hidden = false;
$('requester').value = session.nombre || '';
await perform(async () => { await load(); render(); });
`;
// Lexical DOM facade keeps selectors and event bindings inside this instance's shadow root.
const output = `/* Apicostura · módulo de integración. Ver INTEGRACION.md. */
(() => {
  'use strict';
  class ApicosturaPanel extends HTMLElement {
    constructor() { super(); this.attachShadow({mode:'open'}); this._configured = false; }
    async configure({session,adapter}) {
      if (this._configured) throw new Error('Cree una nueva instancia para cambiar de sesión.');
      if (!session || !['Sede','Administrativo','Abastecedor'].includes(session.rol)) throw new Error('Rol inválido.');
      if (session.rol === 'Sede' && !['Cerro Colorado','Yanahuara','Avelino Caceres','Cayma','Jose Luis Bustamante'].includes(session.sede)) throw new Error('Sede inválida.');
      for (const name of ['listarPedidos','crearPedido','actualizarEstado','registrarCompras']) if (!adapter || typeof adapter[name] !== 'function') throw new Error('Falta adapter.' + name);
      this._configured = true;
      session = Object.freeze({...session});
      const root = this.shadowRoot;
      root.innerHTML = ${JSON.stringify('<style>'+css+'</style>'+markup)};
      const nativeDocument = this.ownerDocument;
      const document = {getElementById:id=>root.getElementById(id),querySelectorAll:selector=>root.querySelectorAll(selector),createElement:tag=>nativeDocument.createElement(tag)};
      ${js}
    }
  }
  if (!customElements.get('apicostura-panel')) customElements.define('apicostura-panel',ApicosturaPanel);
})();
`;
fs.writeFileSync('src/apicostura-panel.js',output);
const screen = markup
 .replace('id="dashboard" hidden','id="dashboard"')
 .replace('id="siteView" class="grid" hidden','id="siteView" class="grid"')
 .replace('<h2 id="title"></h2>','<h2 id="title">Panel de Control - Apicostura</h2>')
 .replace('<p class="lead" id="subtitle"></p>','<p class="lead" id="subtitle">Pedidos de materiales</p>')
 .replace('<div class="list" id="history"></div>','<div class="list" id="history"><p class="empty">Tus solicitudes aparecerán aquí al conectar el panel.</p></div>');
const standaloneCss=html.match(/<style>([\s\S]*?)<\/style>/)[1];
fs.writeFileSync('index.html',`<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Panel de Control - Apicostura</title>
<style>${standaloneCss}
.connection-note{max-width:728px;margin:24px auto 0;padding:14px 18px;background:#FFF0DD;color:#583e09;border-radius:8px;font:16px system-ui,sans-serif}fieldset{border:0;padding:0;margin:0;min-width:0}fieldset:disabled{opacity:.85}apicostura-panel{max-width:760px;margin:24px auto;display:block}#presentation{margin:auto}
</style></head><body>
<p id="connectionNote" class="connection-note" role="status">Pendiente de conexión con el sistema principal. Los controles se habilitarán cuando se conecte.</p>
<div id="presentation"><fieldset disabled aria-label="Diseño del panel pendiente de conexión">${screen}</fieldset></div>
<apicostura-panel id="materiales" hidden></apicostura-panel>
<script src="./src/apicostura-panel.js"></script>
<script>
'use strict';
window.conectarApicostura = async function(config) {
  try {
    const panel = document.getElementById('materiales');
    await panel.configure(config);
    panel.hidden = false;
    document.getElementById('presentation').hidden = true;
    document.getElementById('connectionNote').hidden = true;
  } catch(error) {
    document.getElementById('connectionNote').textContent = 'No se pudo conectar el panel. Revisa la configuración con el administrador del sistema.';
    throw error;
  }
};
if (window.APICOSTURA_CONFIG) window.conectarApicostura(window.APICOSTURA_CONFIG).catch(error => console.error(error));
</script></body></html>`);
console.log('Módulo y página de entrega generados. La prueba se conserva en examples/prueba.html.');
