# Plan: Paisaje de Marte con Vite + Three.js

## Contexto
Carpeta vacía (solo CLAUDE.md). Objetivo: escena marciana cinematográfica (dunas, rocas, cielo caramelo con polvo, sol de tarde cálido con sombras suaves, Fobos y Deimos), vista en vivo en el navegador de VS Code, con un `npm run check` de autoverificación. Más adelante entrará el rover.

## Pasos
0. **Guardar este plan** como `plan.md` en la raíz del proyecto (primer paso tras aprobar).
1. **Arranque rápido (<2 min)**: crear `package.json`, `index.html`, `src/main.js` a mano (sin scaffolding interactivo); `npm i three` y `npm i -D vite playwright-core`. Lanzar `npm run dev` en segundo plano (puerto 5173, `--host`) y avisar la URL `http://localhost:5173` para abrir en Simple Browser de VS Code.
2. **Escena v1** en `src/main.js`: terreno PlaneGeometry con ruido (dunas), material óxido, DirectionalLight cálida baja + HemisphereLight, sombras PCFSoft, niebla color caramelo, cielo degradado, rocas instanciadas, dos lunas pequeñas, OrbitControls.
3. **Check**: `scripts/check.mjs` con `playwright-core` usando `chromium.launch({ channel: 'chrome', headless: true })` (Chrome instalado, sin descargar navegadores). Abre la página, espera ~3 s, guarda `screenshots/check.png`, imprime errores de consola/pageerror y sale con código 1 si hay errores. `npm run check`.
4. **Mejoras (máx. 3 rondas, `npm run check` tras cada una, mirar captura y corregir)**:
   - Dunas con ruido fBm + crestas, textura de detalle procedural, normales.
   - Cielo shader (degradado caramelo→azulado cerca del sol, halo), partículas de polvo, ACES tone mapping.
   - Rocas con geometría deformada y variedad de tamaños; lunas visibles en el encuadre de cámara inicial.

## Archivos
`package.json`, `index.html`, `src/main.js` (+ `src/terrain.js`, `src/sky.js` si crece), `scripts/check.mjs`, `.gitignore` (node_modules, screenshots).

## Verificación
Listo cuando `npm run check` reporta 0 errores y la captura muestra dunas, rocas, cielo polvoriento caramelo, sol cálido con sombras suaves y las dos lunas.
