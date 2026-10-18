# Panel de Control · Apicostura

## Archivos

- `src/apicostura-panel.js`: componente Vanilla JS para integrar, sin pedidos ficticios, selector de perfil ni dependencia de Google Apps Script. Estilos y eventos aislados con Shadow DOM.
- `index.html`: página de entrega sin datos ficticios ni selector de perfiles. Al abrirla sin conexión muestra el diseño de la sede con controles desactivados y el aviso de conexión pendiente. No representa datos reales ni una sede autenticada.
- `examples/prueba.html`: versión independiente para revisar flujos con doble clic, con datos simulados en memoria. Solo sirve para revisión; no debe publicarse como el panel operativo.

## Montaje en la aplicación anfitriona

Se puede usar el componente directamente como se muestra abajo, o conservar la página `index.html` y ejecutar `window.conectarApicostura({session,adapter})` después de autenticar al usuario. También se puede definir `window.APICOSTURA_CONFIG` antes del script de inicio de esa página. La página ya referencia el componente en `src/apicostura-panel.js`. Al conectar, el diseño desactivado desaparece y se muestra la vista del rol autenticado.

```html
<script src="/modulos/apicostura-panel.js"></script>
<apicostura-panel id="materiales"></apicostura-panel>
<script>
// El anfitrión proporciona una sesión autenticada y cuatro funciones asíncronas.
document.getElementById('materiales').configure({
  session: { rol: 'Sede', sede: 'Cayma', nombre: 'Ana Torres' },
  adapter: {
    listarPedidos: contexto => apiPedidos.listar(contexto),
    crearPedido: pedido => apiPedidos.crear(pedido),
    actualizarEstado: cambio => apiPedidos.actualizar(cambio),
    registrarCompras: lote => apiPedidos.compras(lote)
  }
});
</script>
```

`apiPedidos` representa el cliente del sistema anfitrión, no está incluido. Los roles aceptados son `Sede`, `Administrativo` y `Abastecedor`. Para una sede, `sede` debe ser uno de los cinco nombres existentes. Desmontar el elemento y crear uno nuevo al cambiar la sesión.

## Contrato

Todas las funciones devuelven Promesas. Deben rechazar con `Error` y un mensaje apto para mostrar al usuario si falla la operación. No devolver errores HTTP como si fueran éxitos. Las escrituras deben confirmar persistencia antes de resolver; luego el panel vuelve a consultar los datos. Mientras espera, bloquea los controles. Si falla, conserva el formulario y muestra el error; “Actualizar” permite reintentar la consulta.

### listarPedidos({rol,sede}) → Pedido[]

```js
{
  ID: 'identificador-unico',
  Fecha: '2026-10-17T15:00:00.000Z',
  Sede_Solicitante: 'Cayma',
  Detalle_Pedido: '10 botones negros de cuatro agujeros',
  Estado: 'Pendiente', // Pendiente | Comprado | Entregado
  Solicitante: 'Ana Torres',
  No_Comprado: false, // true conserva Estado=Pendiente
  Foto: { url: 'https://servidor-autorizado/referencia.jpg', name: 'boton.jpg' }
  // Foto puede ser null. No incluir imágenes base64 en las listas de producción.
}
```

Filtrar las sedes autorizadas en el servidor. Los parámetros del navegador no acreditan identidad ni permisos. El panel filtra además por perfil, estado y sede seleccionada. Los entregados no generan avisos ni aparecen en compras o entregas activas.

### crearPedido({action,sede,detalle,solicitante,foto})

`action` vale `crear`. Nombre y apellido obligatorios, hasta 100 caracteres; detalle de 1 a 2000 caracteres. `foto` es opcional y tiene forma `{name,type:'image/jpeg',dataUrl:'data:image/jpeg;base64,...'}`. El anfitrión guarda la foto y su relación con el pedido; al listar devuelve `Foto.url`. El servidor genera ID, fecha y Estado=Pendiente. Validar identidad, sede, nombre, detalle y archivo en el backend también.

### actualizarEstado({id,estado})

La interfaz administrativa solicita `Entregado`. Validar transición desde Pendiente o Comprado y autorización. Conservar la referencia fotográfica en el historial; limpiar `No_Comprado` al entregar.

### registrarCompras({resultados:[{id,resultado}]})

`resultado` puede ser `Comprado` o `No comprado`. “Sin decidir” no se envía. `Comprado` cambia el estado y limpia No_Comprado; `No comprado` conserva Pendiente y guarda No_Comprado=true. Aplicar el lote en una transacción, solo sobre pedidos todavía pendientes. Si hubo cambios concurrentes, rechazar el lote y pedir actualizar. Guardar usuario y fecha de cada movimiento. Las escrituras deberían ser idempotentes para evitar duplicados al reintentar después de una interrupción.

## Fotografías

- Una imagen opcional por solicitud: entrada JPG, PNG o WebP, hasta 5 MiB.
- Se decodifica y convierte a JPEG, lado mayor máximo 1600 px, calidad 0.82; se limita la salida base64 a 2.8 millones de caracteres. Se dibuja sobre fondo blanco y no se copian metadatos EXIF.
- Vista previa y botón Quitar antes de enviar. Un error conserva el texto del formulario. No se envía hasta que termina el procesamiento.
- Dueña, Abastecedor y sede pueden abrir “Ver foto de referencia”. El módulo acepta URLs HTTPS; la prueba usa base64 en memoria.
- El anfitrión valida contenido y tamaño real, guarda en almacenamiento privado y devuelve una URL accesible para el usuario autorizado (por ejemplo una URL firmada temporal). No hacer públicas las fotos para resolver permisos. Si la URL expiró, “Actualizar” debe devolver una nueva.
- La foto y “No compré” no son persistentes en la prueba: desaparecen al recargar, igual que los pedidos creados.

## Límites de la entrega

El módulo incluye interfaz y contrato de integración; no incorpora autenticación, almacenamiento, endpoints ni notificaciones externas. El anfitrión implementa y verifica esas partes. No se ha verificado contra el backend original, porque no está disponible en este proyecto. No publicar la prueba como aplicación operativa.

## Interacción y prevención de errores

- Contenido principal a 16 px o más y controles de al menos 48 px; etiquetas de estado incluyen texto, no dependen solo del color.
- Sede: “Pedir materiales”, ayuda de material/cantidad/color, nombre y apellido, foto opcional. Antes de enviar se muestra un resumen. “Volver y corregir” conserva campos y foto.
- Compras: “Registrar lo que compré” abre la edición con “Sí compré”, “No conseguí” y “Aún no revisé”. Antes de guardar se muestra la cantidad de cada resultado. Los valores del contrato de backend no cambian.
- Administración: “Confirmar entrega” muestra el detalle y la sede y requiere “Sí, ya entregué”. Cancelar o pulsar Escape no modifica datos.
- Las solicitudes entregadas están en “Ver entregados”, plegado inicialmente. Los pendientes siguen visibles al principio.
- La corrección disponible es antes de guardar. Revertir movimientos ya persistidos requiere una operación autorizada y auditada del backend anfitrión; no se simula un deshacer local.
- Validar con dos o tres trabajadoras reales las tareas de solicitud con foto, compra parcial y entrega, sin explicarles los pasos. Esta prueba de usabilidad aún está pendiente; las comprobaciones ejecutadas verifican la lógica con DOM simulado, no sustituyen pruebas visuales, lector de pantalla ni pruebas contra el sistema original.
