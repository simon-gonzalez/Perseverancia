# Perseverancia

Simulación 3D del rover Perseverance (Percy) de la NASA en Marte: página web con Vite + Three.js, terreno marciano, el rover en 3D manejable con el teclado y vista desde distintos ángulos. Ver `README.md` para cómo correrlo, controles y estructura.

## Estado (oct 2026)

Hecho y en `main`:
1. Paisaje: dunas, rocas, cielo caramelo con polvo, sol de tarde, Fobos y Deimos.
2. Rover: modelo oficial de la NASA a tamaño real, WASD, huellas, cámara que lo sigue.
3. Control de misión (tecla T): 4 datos de telemetría reales con el patrón de Open MCT.
4. Cámaras de Percy: 4 puntos clicables que abren fotos reales de Marte.

## Forma de trabajar

- Hablar en español y en lenguaje simple; el usuario no es programador.
- Verificar con `npm run check` tras cada cambio grande (necesita `npm run dev` corriendo) y mirar las capturas de `screenshots/` antes de dar algo por listo.
- No instalar dependencias nuevas sin preguntar.

## Detalles no obvios

- El GLB de la NASA mira hacia +Z; en `src/rover.js` se gira 180° para que el rover avance hacia -Z.
- El GLB viene comprimido con Draco: el decodificador está en `public/draco/` (copiado de three).
- En `M20_waypoints.json` solo sirven los puntos con `final: "y"`; los intermedios (`"m"`) traen `dist_total_m = 0`.
- mars.nasa.gov no permite leer sus JSON desde otra web (CORS): datos y fotos van copiados en `public/`.
- El Chrome invisible del check corre a muy pocos FPS: por eso existen `window.__simulate` (avanza la física con pasos fijos), `window.__mission` y `window.__cams`. Son ganchos de prueba; no borrarlos.
- La cámara sigue al rover desplazándose lo mismo que él; el rover debe arrancar ya posado en el terreno o la cámara queda enterrada.
