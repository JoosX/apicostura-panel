# Panel de Control · Apicostura

Módulo de pedidos de materiales entre sedes. Desarrollado con HTML, CSS y JavaScript nativo, sin librerías externas ni servidor propio.

**Este repositorio entrega el frontend y el contrato de integración.** El equipo del software anfitrión conecta autenticación, usuarios, base de datos y almacenamiento de fotos. Clonar el código no habilita esas conexiones automáticamente.

## Revisar el funcionamiento antes de integrar

```sh
git clone https://github.com/JoosX/apicostura-panel.git
cd apicostura-panel
```

1. Clona el repositorio o descarga **Code → Download ZIP** en GitHub y descomprímelo.
2. Abre `examples/prueba.html` con doble clic en un navegador moderno.
3. Elige una sede, Administrativo o Abastecedor y pulsa **Entrar**.

No necesitas instalar Node.js, ejecutar `npm install`, configurar Google Sheets ni levantar un servidor para esa revisión. La vista usa datos de ejemplo en memoria: recargar restaura los ejemplos y borra pedidos, fotos y anotaciones creados durante la prueba. No es una aplicación multiusuario.

### Prueba sugerida

1. En **Cayma**, solicita materiales con nombre y apellido y una foto opcional.
2. En **Abastecedor**, abre la foto y pulsa **Registrar lo que compré**. Marca un pedido “Sí compré” y otro “No conseguí”, revisa y guarda.
3. En **Administrativo**, selecciona Cayma y confirma una entrega.
4. Vuelve a Cayma: el entregado debe estar en **Ver entregados** y no debe contar como pendiente.

## Qué archivo se integra

| Archivo | Uso |
| --- | --- |
| `src/apicostura-panel.js` | Componente real, con estilos y eventos aislados mediante Shadow DOM. |
| `index.html` | Página de montaje. Sin conexión muestra el diseño con controles desactivados; es intencional. |
| `examples/prueba.html` | Revisión interactiva con datos simulados; no usar en producción. |
| `docs/INTEGRACION.md` | Contrato de datos, sesión, funciones del backend y fotos. |
| `docs/GUIA_DE_USO.md` | Guía breve para el personal. |
| `scripts/build.cjs` | Regenera el módulo y la página de montaje desde la vista de revisión. |
| `tests/` | Comprobaciones de lógica con DOM simulado. |

## Conectar al software original

### Adaptarse primero al anfitrión

El código entregado es una referencia funcional y visual, no una obligación de cambiar la arquitectura del software original. Antes de integrar, identificar su framework y versión, estructura de componentes y rutas, sistema de estilos, sesión, nombres de roles/sedes, API, base de datos y almacenamiento de archivos.

- Si el anfitrión admite Web Components, se puede montar el componente directamente con el adaptador documentado abajo.
- Si su arquitectura exige componentes nativos, portar la interfaz y los flujos al framework existente. Reutilizar sus servicios, formularios, navegación, manejo de errores y patrones de accesibilidad. Evitar mantener una segunda aplicación paralela.
- Mapear sus roles, usuarios, sedes y modelo de datos al contrato del panel. No duplicar usuarios, autenticación o tablas ya existentes; crear migraciones solo cuando hagan falta.
- Respetar su sistema de diseño, cabecera, menú y tamaños de pantalla. Conservar la identidad visual y los objetivos aprobados del panel, ajustando los detalles necesarios para que encaje en el producto.
- No sustituir el backend, imponer Google Sheets, introducir un framework adicional ni cambiar versiones o dependencias del anfitrión solo para incorporar este módulo.

La elección entre montar o portar debe quedar explicada por el integrador después de revisar el proyecto real. Los ejemplos siguientes muestran la opción Web Component; si se porta, el contrato sirve como referencia funcional y debe documentarse su correspondencia con los servicios reales.

Incluye el script y monta el componente donde deba aparecer el panel:

```html
<script src="/ruta-del-modulo/src/apicostura-panel.js"></script>
<apicostura-panel id="panel-materiales"></apicostura-panel>
```

Después de iniciar sesión en el sistema anfitrión:

```js
await document.getElementById('panel-materiales').configure({
  session: {
    rol: 'Sede', // Sede | Administrativo | Abastecedor
    sede: 'Cayma',
    nombre: 'Ana Torres'
  },
  adapter: {
    listarPedidos: contexto => apiPedidos.listar(contexto),
    crearPedido: pedido => apiPedidos.crear(pedido),
    actualizarEstado: cambio => apiPedidos.actualizar(cambio),
    registrarCompras: lote => apiPedidos.compras(lote)
  }
});
```

**`apiPedidos` es un ejemplo del cliente del anfitrión; no está implementado aquí.** La sesión debe venir del usuario autenticado, no de un selector público. La sede solo se requiere para el rol Sede. Hay que crear una nueva instancia del componente al cambiar de usuario o rol.

Si prefieres usar `index.html`, ejecuta `window.conectarApicostura({session, adapter})` con los mismos datos. El aviso de conexión desaparecerá y se mostrará la vista del rol recibido.

Consulta [el contrato completo de integración](docs/INTEGRACION.md) antes de implementar los endpoints. No es obligatorio usar Google Apps Script ni Google Sheets: el adaptador permite utilizar el backend existente.

## Datos y reglas

- Sedes: Cerro Colorado, Yanahuara, Avelino Caceres, Cayma y Jose Luis Bustamante.
- Estados: **Pendiente → Comprado → Entregado**. También se permite entrega directa desde Pendiente, según el flujo acordado.
- “No conseguí” mantiene el estado Pendiente y se guarda como `No_Comprado=true` en la integración.
- Cada pedido incluye identificador, fecha, sede, detalle, estado y solicitante. Puede incluir una foto.
- Foto opcional JPG, PNG o WebP de hasta 5 MiB. Se convierte a JPEG de hasta 1600 px en su lado mayor antes de enviarse al adaptador. El anfitrión guarda el archivo y devuelve su URL HTTPS autorizada.
- El backend debe validar permisos y transiciones, registrar quién hizo cada movimiento y evitar duplicados/reintentos inconsistentes. El frontend no reemplaza esa validación.

## Desarrollo y verificación

Para modificar y regenerar se necesita Node.js 18 o superior. No hay dependencias npm.

Desde la carpeta del repositorio:

```sh
npm run build
npm run check
npm test
```

Edita `examples/prueba.html` para cambios de interfaz y `scripts/build.cjs` para cambios del adaptador o del montaje. `src/apicostura-panel.js` e `index.html` son salidas generadas; no editar únicamente esos archivos porque el siguiente build reemplazará los cambios.

Las pruebas cubren solicitudes, filtros, estados, compras parciales, confirmaciones/cancelación, referencias fotográficas y fallos de consulta. Usan un DOM simulado: faltan pruebas en navegadores reales, accesibilidad, usabilidad con el personal y validación contra el backend del anfitrión.

## Responsabilidades del anfitrión antes de operar

- Conectar y verificar las cuatro funciones del adaptador.
- Obtener rol y sede desde la sesión autenticada y aplicar permisos en el servidor.
- Guardar solicitudes, resultados de compras y entregas de forma persistente y consistente.
- Almacenar fotos con acceso autorizado y validar su contenido y tamaño en el servidor.
- Registrar usuario y fecha de los cambios, y definir un procedimiento para corregir operaciones ya guardadas.
- Probar con usuarios de dos sedes y confirmar que ven los mismos datos desde equipos distintos.

GitHub permite compartir y versionar el código. **No reemplaza la base de datos ni el almacenamiento de fotos.** En un repositorio privado, el anfitrión necesitará acceso para clonar o descargar. No subir credenciales, fotos reales ni datos de trabajadoras al repositorio.

## Instrucciones para copiar y enviar a la IA del anfitrión

Copia el siguiente bloque completo y adjunta este repositorio o dale acceso a su carpeta clonada. Las instrucciones no dependen de que la IA conozca la conversación original.

```text
Actúa como desarrollador Full-Stack encargado de integrar el Panel de Control
de Apicostura en nuestro software existente.

Repositorio del módulo: https://github.com/JoosX/apicostura-panel

OBJETIVO
Integra esta sección dentro del software original aprovechando su sesión,
sus permisos, backend, base de datos y almacenamiento de archivos. Conserva
el diseño aprobado, la paleta, la decoración de hilo, los textos accesibles,
la carga de foto y los flujos actuales. No conviertas la prueba en producción.
Adapta la implementación a las tecnologías y convenciones del anfitrión;
no obligues al software original a adoptar la arquitectura de este repositorio.

ANTES DE MODIFICAR
1. Lee README.md, docs/INTEGRACION.md y docs/GUIA_DE_USO.md.
2. Inspecciona el proyecto anfitrión: framework, enrutamiento, sesión, roles,
   esquema de datos, endpoints y servicio de archivos. No inventes esas piezas.
3. Revisa examples/prueba.html para entender los flujos. src/apicostura-panel.js
   es una implementación Web Component sin dependencias. Decide si conviene
   montarlo directamente o portar sus flujos a componentes nativos del anfitrión.
   Explica la elección y qué archivos, servicios y modelos existentes reutilizarás.
4. Si falta información imprescindible o acceso al proyecto anfitrión,
   identifícalo expresamente antes de inventar una conexión simulada.

IMPLEMENTACIÓN
5. Integra en la sección Panel de Control existente. Si usas el Web Component,
   monta <apicostura-panel>, carga src/apicostura-panel.js y llama a
   configure({session,adapter}). Si lo portas, usa el framework y servicios
   existentes con comportamiento equivalente. Usa el usuario real autenticado.
   Mapea sus permisos a los roles Sede, Administrativo y Abastecedor.
   Para Sede incluye la sede autorizada; precarga nombre cuando esté disponible.
   Reemplaza la instancia al cambiar de usuario. No muestres selector de perfiles.
6. Implementa las cuatro funciones asíncronas del adaptador siguiendo exactamente
   docs/INTEGRACION.md: listarPedidos, crearPedido, actualizarEstado y
   registrarCompras. Reutiliza los mecanismos de acceso a datos del anfitrión.
7. Reutiliza las tablas/colecciones disponibles y crea solo las migraciones
   necesarias, ajustadas al backend existente, para ID, fecha, sede, detalle, estado, solicitante, foto y
   No_Comprado. Guarda además el usuario y fecha de cada movimiento.
   Mantén los estados Pendiente, Comprado y Entregado.
8. Aplica permisos también en servidor: una sede solo consulta/crea sus pedidos,
   Abastecedor registra compras y Administrativo confirma entregas. No confíes
   en el rol, sede, nombre o IDs enviados por el navegador para autorizar.
9. Implementa compras parciales: Sí compré pasa a Comprado y limpia No_Comprado;
   No conseguí conserva Pendiente y guarda No_Comprado=true; Aún no revisé no
   se envía ni modifica. Valida concurrencia y aplica el lote de forma atómica.
10. La entrega quita el pedido de los pendientes y lo conserva en el historial.
    Está permitida desde Pendiente o Comprado según el flujo aprobado.
    Revertir una entrega guardada requiere operación autorizada y auditada;
    no simules un deshacer cambiando solo el estado local del navegador.
11. Guarda las fotos opcionales en el almacenamiento privado del anfitrión.
    Valida tipo, tamaño y contenido en servidor. El frontend envía un JPEG
    optimizado en foto.dataUrl; al listar devuelve Foto.url como HTTPS con
    acceso autorizado. No almacenes imágenes base64 en una celda de Sheets
    ni publiques fotos para sortear permisos. No subas imágenes reales a Git.
12. Controla errores reales, reintentos, duplicados, escrituras concurrentes y
    resultados inciertos si se corta la conexión. Usa idempotencia para crear
    solicitudes y guardar movimientos. No muestres éxito antes de persistir.
    Si hace falta cambiar el contrato, actualiza código, documentación y pruebas.
13. Si mantienes esta implementación, edita examples/prueba.html y
    scripts/build.cjs según corresponda, ejecuta npm run build y conserva las
    salidas. No edites únicamente src/apicostura-panel.js porque se regenera.
    Si portas el panel, usa la estructura, estilos, compilación y pruebas del
    anfitrión; no mantengas dos versiones operativas del mismo flujo.

VALIDACIÓN Y ENTREGA
14. Para este módulo ejecuta npm run build, npm run check y npm test, sin npm
    install. Para una adaptación nativa ejecuta además los comandos de validación
    del anfitrión y documenta cómo se reproduce la comprobación.
15. Añade y ejecuta pruebas de integración reales contra tu backend y navegador:
    solicitud con foto, compra parcial, No conseguí, entrega, aislamiento entre
    sedes, permisos de fotos, recarga, errores de red y reintentos sin duplicados.
16. Verifica el flujo con dos cuentas y dispositivos: una sede solicita,
    Abastecedor compra y la dueña ve la foto y confirma la entrega. El entregado
    nunca debe contar como pendiente. Prueba móvil y acceso por teclado.
17. No incluyas examples/prueba.html en el flujo operativo. No añadas una etiqueta
    Demo, perfiles elegibles públicamente ni pedidos ficticios a producción.
18. Entrega cambios, migraciones, variables de entorno documentadas sin secretos,
    pasos de instalación y resultados de pruebas. Enumera cualquier pendiente.
    No declares integración terminada si solo funciona con datos simulados.

El repositorio NO contiene el backend original ni un servidor operativo.
Para completar la integración necesitas acceso al código y configuración del
anfitrión; no es suficiente cambiar una constante del prototipo.
```
