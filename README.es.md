**Idioma:** Español | [English](./README.md)

# SismoView

SismoView es un visualizador web interactivo de actividad sísmica y productos
de observación de la Tierra en Venezuela. Combina una experiencia guiada sobre
el satélite NISAR con mapas 3D, capas InSAR y un dashboard para explorar los
datos de un caso de estudio de dos sismos.

## El problema que aborda

Los productos sísmicos y satelitales suelen presentarse como archivos,
mediciones o mapas separados. Sin contexto, cuesta relacionar la ubicación de
un epicentro con la cobertura del radar, la coherencia de una imagen y las
estimaciones de deformación del terreno.

SismoView reúne esos elementos en una experiencia visual: permite pasar de una
introducción a NISAR y la ubicación de los eventos a la inspección de capas
geoespaciales y sus métricas. El objetivo es facilitar la exploración y la
comunicación de un conjunto de datos complejo; no emitir alertas ni sustituir
un análisis sismológico o geodésico.

La historia parte de una pregunta: ¿cómo cambió la superficie en torno a los
epicentros? Plantea como hipótesis que la ruptura pudo deformar el terreno y
propone examinar fase, coherencia y desplazamiento antes de interpretarlo. La
hipótesis no identifica por sí sola la falla responsable ni atribuye todos los
cambios observados al sismo.

## Qué incluye

- **Introducción y recorrido interactivo:** explica la misión NISAR, su órbita,
  los epicentros, las observaciones radar y el modelo de falla finita.
- **Globo 3D:** explora el terreno, la órbita ilustrativa del satélite y los
  epicentros con Cesium.
- **Capas geoespaciales:** permite comparar desplazamiento en la línea de
  visión (LOS), franjas de fase, coherencia, componentes de deformación,
  gradientes de fase y retrodispersión GCOV HH/HV de distintas fechas.
- **Dashboard analítico:** presenta mapas de epicentros y cobertura, gráficas
  de magnitud, tasa de momento y tensor de momento, además de métricas del caso.
  Incluye una comparación GCOV con cortina HH/HV, tres pistas conectadas a sus
  capas, una conclusión con hipótesis y límites, y un mapa de contexto territorial
  donde se pueden superponer LOS o coherencia a localidades y vías.
  La comparación GCOV usa una vista cenital sin exageración vertical y controles
  de zoom; las demás capas conservan su vista 3D.
- **Interfaz en español e inglés:** el selector de idioma guarda la preferencia
  localmente en el navegador.
- **Observatorio NISAR:** incluye una página informativa integrada en el
  modelo interactivo del satélite.
- **Herramientas de procesamiento:** contiene scripts Python exportados de
  notebooks para preparar algunos productos NISAR y capas de fallas. Se
  documentan por separado en [`scripts/README.md`](./scripts/README.md).

## Datos e interpretación

La aplicación presenta datos locales incluidos en el repositorio; no consulta
un feed sísmico en tiempo real ni una API para actualizar automáticamente los
eventos. El conjunto de eventos y varias métricas del dashboard están
preconfigurados para este caso de estudio:

| Evento | Ubicación mostrada | Magnitud |
| --- | --- | --- |
| Yunare | 17 km al oeste de Catia La Mar, estado La Guaira | M 7,5 |
| San Felipe | 20 km al este de San Felipe, estado Yaracuy | M 7,2 |

Entre los productos incluidos hay rásteres de coherencia y desplazamiento,
imágenes de franjas, mosaicos de deformación LOS/Este-Oeste/Vertical, overlays
GCOV, geometrías de fallas y un modelo de falla finita. Los archivos públicos
se encuentran en `public/data/venezuela/`; el código del frontend define sus
rutas, límites geográficos y escalas en `src/data/`.

Ten en cuenta estas limitaciones al interpretar los resultados:

- Una imagen de desplazamiento LOS mide el movimiento proyectado en la línea
  de visión del radar; no es por sí sola el movimiento tridimensional.
- La coherencia describe la similitud de la señal entre observaciones y ayuda
  a evaluar su calidad; no es una medida de magnitud sísmica.
- La fase, los gradientes, los mosaicos y sus escalas dependen del
  procesamiento y de los metadatos de cada producto.
- Las capas de distintas fechas o tracks no son necesariamente comparables
  como una secuencia directa antes/después.
- La visualización de la falla de Boconó y el modelo de falla finita aporta
  contexto, pero no demuestra por sí misma que la falla causó los eventos ni
  identifica de forma independiente la ruptura.
- El dashboard mezcla productos geoespaciales con métricas configuradas para
  el caso de estudio; no debe interpretarse como una actualización automática
  ni como un informe operativo.

Para obtener detalles de los productos y reproducir los flujos de preparación,
consulta [`scripts/README.md`](./scripts/README.md).

### Fuentes del caso

| Visualización | Datos y procesamiento | Fechas y unidades |
| --- | --- | --- |
| Comparación GCOV HH/HV | NISAR L2 GCOV, descargado desde ASF; [`nisar_gcov_overlays.py`](./scripts/nisar_gcov_overlays.py) comprueba la cuadrícula, reproyecta y usa una escala común por polarización. | 13 de junio y 17 de septiembre de 2026; retrodispersión gamma-0 en dB. Los cambios también pueden reflejar humedad o vegetación. |
| Franjas y LOS | NISAR L2 GUNW; [`nisar_gunw.py`](./scripts/nisar_gunw.py) procesa fase y desplazamiento. La coherencia local se presenta como capa de calidad. | 13–25 de junio de 2026, track 162 ascendente; fase cíclica, coherencia 0–1 y LOS relativo en cm. |
| Geometrías, componentes y gradientes | Productos LOS de [UCSD](https://topex.ucsd.edu/VNZ_7.5/web/), preparados con [`ucsd_los_fault_layers.py`](./scripts/ucsd_los_fault_layers.py). | Ascendente 13–25 y descendente 17–29 de junio de 2026; LOS y componentes en mm. Los gradientes no son desplazamientos. |
| Mapa territorial | Teselas y datos de [OpenStreetMap y sus colaboradores](https://www.openstreetmap.org/copyright), superpuestos con las capas locales. | El mapa aporta contexto de localidades y vías, no datos de daños ni de exposición verificada. |
| Falla finita y gráficos sísmicos | Modelo y parámetros atribuidos a USGS en las visualizaciones; el GeoJSON local incluye el identificador `us6000t7zp`. | El modelo es una interpretación, no una medición directa de la falla. |

Los identificadores completos de los gránulos NISAR figuran en los scripts.
Las métricas de coherencia mostradas se calculan sobre el GeoTIFF local con
[`coherence_metrics.mjs`](./scripts/coherence_metrics.mjs): se incluyen los
valores finitos entre 0 y 1, incluidos los ceros; los radios utilizan centros
de píxel a 10 km del epicentro en EPSG:32619. El 16,7 % usa como denominador
todos los píxeles del ráster, incluidos los inválidos. Las cifras están
precalculadas en el frontend y no se actualizan automáticamente si cambia el
GeoTIFF. La generación del PNG de coherencia no está documentada en los
scripts; no se ha verificado su correspondencia exacta con el GeoTIFF. Las
capas, escalas, fechas y limitaciones también aparecen en «Ficha de la capa y
fuentes» dentro de la app.
El script de cálculo se puede descargar desde la tarjeta de coherencia o su
ficha de fuentes en la aplicación.

## Requisitos

- Node.js compatible con Vite 8 (Node.js 20.19+ o 22.12+).
- npm.
- Un token de [Cesium ion](https://ion.cesium.com/) para habilitar los recursos
  de Cesium ion usados por el globo 3D. El dashboard también contiene mapas
  basados en OpenStreetMap.
- Para ejecutar los scripts de procesamiento: una cuenta de NASA Earthdata
  cuando el flujo NISAR la requiera y un entorno de Google Colab. Consulta la
  guía de scripts para los requisitos concretos.

## Instalación y ejecución local

```bash
git clone https://github.com/CavichiaBruno/SismoView.git
cd SismoView
npm ci
```

Crea un archivo `.env` a partir de la plantilla y añade tu token de Cesium ion:

```bash
cp .env.example .env
```

```dotenv
VITE_CESIUM_ION_TOKEN=tu_token_de_cesium_ion
```

El archivo `.env` está excluido de Git. No subas tokens ni credenciales al
repositorio. Vite carga las variables `VITE_*` al iniciar o compilar el
proyecto; si cambias `.env`, reinicia el servidor de desarrollo.

Inicia la aplicación:

```bash
npm run dev
```

Abre en el navegador la dirección que indique Vite (normalmente
`http://localhost:5173`). La aplicación y sus datos geoespaciales se sirven
localmente; el token se usa para los recursos de Cesium ion.

## Comandos disponibles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia Vite con recarga en caliente para desarrollo. |
| `npm run build` | Comprueba los proyectos TypeScript y genera la versión de producción en `dist/`. |
| `npm run preview` | Sirve localmente la compilación de `dist/` para revisarla. |
| `npm run lint` | Ejecuta Oxlint. |

Para comprobar una compilación de producción:

```bash
npm run build
npm run preview
```

Al desplegar, configura `VITE_CESIUM_ION_TOKEN` en el entorno de compilación
del proveedor y publica el contenido de `dist/`. Si el sitio se aloja en una
ruta que no sea la raíz del dominio, configura también la `base` de Vite para
esa ruta y vuelve a compilar.

## Estructura del proyecto

```text
src/
  components/   Interfaz, recorrido, mapas, gráficas y componentes visuales
  data/         Tipos, rutas, metadatos y configuración de capas y eventos
  lib/          Utilidades compartidas
  App.tsx       Flujo principal de inicio, recorrido y dashboard
  i18n.ts       Idiomas y traducciones
public/
  data/         Productos geoespaciales estáticos usados por la aplicación
  observatorio-nisar.html
                Página informativa integrada sobre la misión NISAR
  sounds/       Audio de la experiencia
scripts/
  *.py          Flujos de preparación de datos para Google Colab
  README.md     Requisitos, ejecución y salidas de los scripts
```

## Tecnologías principales

- React 19, TypeScript y Vite 8.
- Cesium para la visualización 3D del globo y sus capas.
- Leaflet para mapas de epicentros y cobertura.
- Recharts para gráficas del dashboard.
- i18next y react-i18next para la interfaz bilingüe.
- Tailwind CSS y componentes React para la interfaz.
- Python, NumPy, h5py, rasterio, SciPy, Matplotlib y Pillow en los flujos de
  procesamiento documentados en `scripts/`.

## Procesar o actualizar datos

Los scripts de `scripts/` están preparados para Google Colab y trabajan con
productos y parámetros de un caso de estudio concreto. No forman parte del
servidor de la aplicación ni se ejecutan al iniciar el sitio. Para conocer las
credenciales, dependencias, comandos, resultados esperados y ubicaciones donde
copiar los productos, sigue [`scripts/README.md`](./scripts/README.md).

Después de añadir o reemplazar una capa, comprueba que coincidan el archivo,
sus metadatos, límites geográficos, sistema de coordenadas, unidades y rango
de visualización configurados en `src/data/`.

## Licencia y atribución

El código y la documentación propios se distribuyen bajo la [licencia MIT](./LICENSE).
Esta licencia no modifica los derechos ni las condiciones de uso de los datos,
mapas, fuentes, modelos, imágenes, audio, logotipos o dependencias de terceros.
Consulta sus fuentes y condiciones antes de reutilizarlos o redistribuirlos;
la lista anterior y los scripts documentan las fuentes identificadas, no
constituyen una cesión de derechos de los recursos de terceros.
