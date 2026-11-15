**Language:** English | [Español](./README.es.md)

# SismoView

SismoView is an interactive web visualizer of seismic activity and Earth
observation products in Venezuela. It combines a guided experience about the
NISAR satellite with 3D maps, InSAR layers, and a dashboard to explore the
data from a two-earthquake case study.

## The problem it addresses

Seismic and satellite products are often presented as separate files,
measurements, or maps. Without context, it's hard to relate an epicenter's
location to radar coverage, the coherence of an image, and ground deformation
estimates.

SismoView brings these elements together in a visual experience: it lets you
move from an introduction to NISAR and the location of the events to the
inspection of geospatial layers and their metrics. The goal is to make it
easier to explore and communicate a complex dataset; it does not issue alerts
or replace a seismological or geodetic analysis.

The story starts from a question: how did the surface change around the
epicenters? It proposes as a hypothesis that the rupture may have deformed
the terrain and suggests examining phase, coherence, and displacement before
interpreting it. The hypothesis alone does not identify the responsible fault
nor attribute every observed change to the earthquake.

## What it includes

- **Introduction and interactive tour:** explains the NISAR mission, its
  orbit, the epicenters, the radar observations, and the finite-fault model.
- **3D globe:** explore the terrain, the satellite's illustrative orbit, and
  the epicenters with Cesium.
- **Geospatial layers:** compare line-of-sight (LOS) displacement, phase
  fringes, coherence, deformation components, phase gradients, and GCOV
  HH/HV backscatter from different dates.
- **Analytics dashboard:** presents epicenter and coverage maps, magnitude,
  moment rate, and moment tensor charts, plus case metrics. It includes a
  GCOV comparison with an HH/HV curtain, three clues linked to their layers,
  a conclusion with hypotheses and limitations, and a territorial context map
  where LOS or coherence can be overlaid on towns and roads.
  The GCOV comparison uses a top-down view without vertical exaggeration and
  zoom controls; the other layers keep their 3D view.
- **Spanish and English interface:** the language selector saves the
  preference locally in the browser.
- **NISAR observatory:** includes an informational page built into the
  interactive satellite model.
- **Processing tools:** contains Python scripts exported from notebooks to
  prepare some NISAR products and fault layers. They are documented
  separately in [`scripts/README.md`](./scripts/README.md).

## Data and interpretation

The application presents local data included in the repository; it does not
query a real-time seismic feed or an API to automatically update events. The
event set and several dashboard metrics are preconfigured for this case
study:

| Event | Location shown | Magnitude |
| --- | --- | --- |
| Yunare | 17 km west of Catia La Mar, La Guaira state | M 7.5 |
| San Felipe | 20 km east of San Felipe, Yaracuy state | M 7.2 |

The included products include coherence and displacement rasters, fringe
images, LOS/East-West/Vertical deformation mosaics, GCOV overlays, fault
geometries, and a finite-fault model. The public files are located in
`public/data/venezuela/`; the frontend code defines their paths, geographic
bounds, and scales in `src/data/`.

Keep these limitations in mind when interpreting the results:

- A LOS displacement image measures motion projected along the radar's line
  of sight; it is not, by itself, the three-dimensional movement.
- Coherence describes signal similarity between observations and helps
  assess its quality; it is not a measure of seismic magnitude.
- Phase, gradients, mosaics, and their scales depend on the processing and
  metadata of each product.
- Layers from different dates or tracks are not necessarily comparable as a
  direct before/after sequence.
- The Boconó fault visualization and the finite-fault model provide context,
  but they do not by themselves prove the fault caused the events, nor do
  they independently identify the rupture.
- The dashboard mixes geospatial products with metrics configured for the
  case study; it should not be interpreted as an automatic update or an
  operational report.

For product details and to reproduce the preparation workflows, see
[`scripts/README.md`](./scripts/README.md).

### Case sources

| Visualization | Data and processing | Dates and units |
| --- | --- | --- |
| GCOV HH/HV comparison | NISAR L2 GCOV, downloaded from ASF; [`nisar_gcov_overlays.py`](./scripts/nisar_gcov_overlays.py) checks the grid, reprojects, and uses a common scale per polarization. | June 13 and September 17, 2026; gamma-0 backscatter in dB. Changes may also reflect moisture or vegetation. |
| Fringes and LOS | NISAR L2 GUNW; [`nisar_gunw.py`](./scripts/nisar_gunw.py) processes phase and displacement. Local coherence is presented as a quality layer. | June 13–25, 2026, ascending track 162; cyclic phase, coherence 0–1, and relative LOS in cm. |
| Geometries, components, and gradients | LOS products from [UCSD](https://topex.ucsd.edu/VNZ_7.5/web/), prepared with [`ucsd_los_fault_layers.py`](./scripts/ucsd_los_fault_layers.py). | Ascending June 13–25 and descending June 17–29, 2026; LOS and components in mm. Gradients are not displacements. |
| Territorial map | Tiles and data from [OpenStreetMap and its contributors](https://www.openstreetmap.org/copyright), overlaid with the local layers. | The map provides context on towns and roads, not verified damage or exposure data. |
| Finite fault and seismic charts | Model and parameters attributed to USGS in the visualizations; the local GeoJSON includes the identifier `us6000t7zp`. | The model is an interpretation, not a direct measurement of the fault. |

The full NISAR granule identifiers are listed in the scripts. The displayed
coherence metrics are computed on the local GeoTIFF with
[`coherence_metrics.mjs`](./scripts/coherence_metrics.mjs): finite values
between 0 and 1 are included, including zeros; the radii use pixel centers
within 10 km of the epicenter in EPSG:32619. The 16.7% uses all raster
pixels as the denominator, including invalid ones. The figures are
precomputed in the frontend and do not update automatically if the GeoTIFF
changes. The generation of the coherence PNG is not documented in the
scripts; its exact correspondence with the GeoTIFF has not been verified.
The layers, scales, dates, and limitations also appear in "Layer information
and sources" within the app.
The calculation script can be downloaded from the coherence card or its
sources sheet in the application.

## Requirements

- Node.js compatible with Vite 8 (Node.js 20.19+ or 22.12+).
- npm.
- A [Cesium ion](https://ion.cesium.com/) token to enable the Cesium ion
  assets used by the 3D globe. The dashboard also contains maps based on
  OpenStreetMap.
- To run the processing scripts: a NASA Earthdata account when the NISAR
  workflow requires it, and a Google Colab environment. See the scripts
  guide for the specific requirements.

## Installation and local setup

```bash
git clone https://github.com/CavichiaBruno/SismoView.git
cd SismoView
npm ci
```

Create an `.env` file from the template and add your Cesium ion token:

```bash
cp .env.example .env
```

```dotenv
VITE_CESIUM_ION_TOKEN=your_cesium_ion_token
```

The `.env` file is excluded from Git. Do not commit tokens or credentials to
the repository. Vite loads `VITE_*` variables on startup or build; if you
change `.env`, restart the dev server.

Start the application:

```bash
npm run dev
```

Open the address Vite shows in the browser (usually
`http://localhost:5173`). The application and its geospatial data are served
locally; the token is used for Cesium ion assets.

## Available commands

| Command | Description |
| --- | --- |
| `npm run dev` | Starts Vite with hot reload for development. |
| `npm run build` | Checks the TypeScript projects and generates the production build in `dist/`. |
| `npm run preview` | Serves the `dist/` build locally for review. |
| `npm run lint` | Runs Oxlint. |

To check a production build:

```bash
npm run build
npm run preview
```

When deploying, set `VITE_CESIUM_ION_TOKEN` in the provider's build
environment and publish the contents of `dist/`. If the site is hosted on a
path other than the domain root, also set Vite's `base` for that path and
rebuild.

## Project structure

```text
src/
  components/   UI, tour, maps, charts, and visual components
  data/         Types, paths, metadata, and layer/event configuration
  lib/          Shared utilities
  App.tsx       Main startup, tour, and dashboard flow
  i18n.ts       Languages and translations
public/
  data/         Static geospatial products used by the application
  observatorio-nisar.html
                Informational page built into the NISAR mission
  sounds/       Experience audio
scripts/
  *.py          Data preparation workflows for Google Colab
  README.md     Script requirements, usage, and outputs
```

## Main technologies

- React 19, TypeScript, and Vite 8.
- Cesium for 3D globe visualization and its layers.
- Leaflet for epicenter and coverage maps.
- Recharts for dashboard charts.
- i18next and react-i18next for the bilingual interface.
- Tailwind CSS and React components for the UI.
- Python, NumPy, h5py, rasterio, SciPy, Matplotlib, and Pillow in the
  processing workflows documented in `scripts/`.

## Processing or updating data

The scripts in `scripts/` are set up for Google Colab and work with products
and parameters from a specific case study. They are not part of the
application server and do not run when the site starts. For credentials,
dependencies, commands, expected results, and where to copy the products,
follow [`scripts/README.md`](./scripts/README.md).

After adding or replacing a layer, check that the file, its metadata,
geographic bounds, coordinate system, units, and display range configured in
`src/data/` all match.

## License and attribution

The project's own code and documentation are distributed under the
[MIT license](./LICENSE). This license does not change the rights or terms
of use of third-party data, maps, sources, models, images, audio, logos, or
dependencies. Check their sources and conditions before reusing or
redistributing them; the list above and the scripts document the identified
sources, but do not constitute a transfer of rights to third-party
resources.
