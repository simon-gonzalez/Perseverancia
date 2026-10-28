# Perseverancia

Simulación 3D del rover Perseverance (Percy) en Marte, hecha con Vite + Three.js.

- Paisaje marciano: dunas, rocas, cielo caramelo con polvo, sol de tarde, Fobos y Deimos.
- Modelo 3D oficial de la NASA a tamaño real, manejable con el teclado y con huellas.
- Control de misión con telemetría real (patrón de Open MCT): distancia recorrida, altura del terreno e inclinación (historial de manejos de la NASA) y tiempo de luz Tierra–Marte calculado en vivo.
- Las cámaras de Percy (Mastcam-Z, NavCam, HazCam frontal, WATSON) abren fotos reales de Marte.

## Cómo correrlo

```bash
npm install
npm run dev      # http://localhost:5173
npm run check    # Chrome invisible: captura, errores de consola, telemetría y fotos
npm run build    # versión de producción en dist/
```

`npm run check` usa el Chrome instalado (no descarga navegadores) y guarda capturas en `screenshots/`.

## Controles

| Tecla | Acción |
|---|---|
| W / S | Avanzar / retroceder |
| A / D | Girar |
| Mouse | Orbitar la cámara y zoom |
| T | Ocultar / mostrar el control de misión |
| Clic en un punto brillante | Tomar foto con esa cámara |
| ← → · clic · Esc | Más fotos · ampliar · volver al juego |

## Código

| Archivo | Qué hace |
|---|---|
| `src/main.js` | Escena, luces, cámara que sigue al rover, bucle principal |
| `src/terrain.js`, `sky.js`, `rocks.js`, `moons.js`, `dust.js` | Paisaje |
| `src/rover.js` | Carga del modelo, manejo y huellas |
| `src/telemetry.js` | Proveedores de telemetría (estilo Open MCT) |
| `src/missionControl.js` | Panel del control de misión |
| `src/cameras.js` | Puntos de las cámaras y visor de fotos |
| `scripts/check.mjs` | Verificación automática |

## Datos y créditos

- Modelo: [NASA 3D Resources](https://github.com/nasa/NASA-3D-Resources), Mars 2020 Perseverance Rover.
- Telemetría: copia de `M20_waypoints.json` (mars.nasa.gov, hasta el sol 2009) en `public/data/`.
- Fotos: API raw_images de mars.nasa.gov, elegidas a mano (soles 2014–2021) en `public/photos/`. Crédito NASA/JPL-Caltech.

Los datos y fotos son copias fijas: no se actualizan solos.
