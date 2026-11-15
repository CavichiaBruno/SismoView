# Scripts de procesamiento de imágenes

Estos scripts reúnen los procesos de los cuadernos de Google Colab usados para
descargar y preparar las capas NISAR y los productos de deformación/fallas que
se visualizan en el proyecto. Son exportaciones de cuadernos: algunos pasos
incluyen gráficos exploratorios además de los PNG que consume la aplicación.

## Entorno y ejecución

Los cuatro scripts están preparados para ejecutarse en **Google Colab**. Usan
`/content` como carpeta de trabajo, `google.colab.files` para subir o descargar
archivos y, en los flujos NISAR, solicitan credenciales de NASA Earthdata de
forma interactiva. No guardes las credenciales en el código ni en el repositorio.

1. Abre un notebook de Colab y clona el repositorio:

   ```python
   !git clone https://github.com/CavichiaBruno/SismoView.git
   %cd SismoView
   %pip install -r scripts/requirements.txt
   ```

2. Ejecuta el script que corresponda:

   ```python
   %run scripts/nisar_gunw.py
   ```

   Sustituye el nombre por el script deseado. También se puede abrir el archivo
   `.py` y ejecutar sus bloques en orden en un notebook. Los scripts conservan
   rutas, identificadores de producto, fechas, coordenadas y parámetros del
   análisis originales; edítalos si se quiere procesar otra escena o región.

3. Guarda los ZIP o archivos que ofrece Colab. Los PNG destinados al sitio deben
   copiarse a la ruta de `public/` indicada en la tabla de abajo.

`requirements.txt` contiene las dependencias externas de Python. `google.colab`
viene incluido en Colab y no se instala con pip. Las descargas de NISAR requieren
una cuenta de NASA Earthdata con acceso al producto. Las capas de UCSD se
descargan desde sus URL públicas.

> Los productos HDF5 de NISAR son grandes; revisa el espacio disponible en el
> runtime de Colab antes de descargarlos. Los archivos temporales se guardan bajo
> `/content`. Descarga los resultados antes de cerrar o reiniciar el runtime.

## Scripts

Para reproducir las métricas de coherencia del dashboard con el GeoTIFF local
incluido, instala las dependencias de Node desde la raíz y ejecuta:

```bash
npm ci
node scripts/coherence_metrics.mjs
```

El cálculo usa píxeles finitos entre 0 y 1 (incluidos ceros), centros de píxel
en un radio de 10 km en EPSG:32619 y el total de píxeles del ráster como
denominador del porcentaje con coherencia ≥ 0,4. Las métricas del frontend son
precalculadas; actualízalas si cambia el GeoTIFF. Este cálculo no verifica la
procedencia del PNG de coherencia.

| Script | Qué hace | Productos principales |
| --- | --- | --- |
| [`nisar_gunw.py`](./nisar_gunw.py) | Busca y descarga el producto NISAR GUNW de junio de 2026; inspecciona el interferograma envuelto, estima desplazamiento LOS, reproyecta las capas a latitud/longitud y prepara datos auxiliares de terreno. En sus bloques exploratorios también compara fase/coherencia y examina perfiles. | `franjas.png` y `meta_franjas.json`; `desplazamiento.png`, `meta.json` y `app_data.zip`; `terreno.json`. El bloque de terreno solicita `desplazamiento_cm.tif` si todavía no está en `/content`. |
| [`nisar_gcov_comparison.py`](./nisar_gcov_comparison.py) | Descarga los productos GCOV del 17 y 29 de junio de 2026, compara retrodispersión HH/HV en Catia La Mar y San Felipe y exporta overlays georreferenciados. | Gráficos comparativos y ZIP con PNG de HH/HV. Incluye también una variante de overlays de mayor extensión para esas fechas. |
| [`nisar_gcov_overlays.py`](./nisar_gcov_overlays.py) | Descarga los GCOV del 13 de junio y 17 de septiembre de 2026; verifica que compartan cuadrícula, recorta a la extensión geográfica del mapa y aplica la misma escala de color por polarización. | ZIP con `gcov_hh_20260613.png`, `gcov_hh_20260917.png`, `gcov_hv_20260613.png` y `gcov_hv_20260917.png`. Copiar a [`public/data/venezuela/gcov/`](../public/data/venezuela/gcov/). |
| [`ucsd_los_fault_layers.py`](./ucsd_los_fault_layers.py) | Descarga productos LOS y KMZ publicados por UCSD, combina geometrías de diferentes tracks y estima componentes Este-Vertical a partir de pares ascendente/descendente. | Capas PNG/JSON de deformación, geometrías GeoJSON de fallas y capas PNG/JSON de gradiente. Los PNG/JSON se usan en [`public/data/venezuela/deformation/`](../public/data/venezuela/deformation/) y [`public/data/venezuela/faults/`](../public/data/venezuela/faults/). |

## Flujo general

1. **Descarga de datos:** ASF Search obtiene los HDF5 de NISAR usando los
   identificadores fijados en cada script. El flujo de UCSD descarga archivos
   TAR.GZ y KMZ desde el servidor público.
2. **Procesamiento:** `h5py` lee los grupos/datasets HDF5, `rasterio` reproyecta
   y remuestrea los rásteres, y NumPy/SciPy realizan los cálculos y máscaras.
   Las visualizaciones se crean con Matplotlib o Pillow.
3. **Exportación:** los PNG transparentes se acompañan de JSON con límites,
   escala y metadatos cuando la aplicación los necesita. Varios scripts también
   empaquetan resultados en ZIP para descargarlos desde Colab.
4. **Integración web:** copia cada producto a la carpeta `public/` que consume
   el frontend. Mantén juntos los PNG y sus JSON asociados: los límites y la
   escala del JSON son necesarios para dibujar correctamente las capas.

## Notas de interpretación

- Los scripts contienen parámetros de un caso de estudio concreto; sus salidas
  no son automáticamente válidas para cualquier escena.
- En GUNW, la fase se convierte a desplazamiento en la línea de visión (LOS).
  La fase, la corrección ionosférica, la coherencia y el desenrollado deben
  interpretarse con los metadatos de la escena.
- En GCOV se calcula retrodispersión en dB y se utiliza una escala común entre
  fechas para permitir la comparación visual. No equivale por sí sola a una
  estimación de desplazamiento.
- La combinación de tracks LOS para componentes Este/Vertical supone que los
  desplazamientos norte-sur son despreciables en ese cálculo.
- Verifica antes de publicar que la escena, las fechas, el CRS, los límites del
  mapa y las unidades del producto correspondan a los datos que quieres mostrar.
