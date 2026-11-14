# -*- coding: utf-8 -*-
"""Download and export regional NISAR GCOV overlays."""

# Commented out IPython magic to ensure Python compatibility.
# %pip install -q asf_search rasterio

import os
import asf_search as asf
from getpass import getpass

user = input("Usuario Earthdata: ")
session = asf.ASFSession().auth_with_creds(user, getpass("Contraseña Earthdata: "))

names = [
    "NISAR_L2_PR_GCOV_022_162_A_007_4005_DHDH_A_20260613T100656_20260613T100731_P05023_N_F_J_001",
    "NISAR_L2_PR_GCOV_030_162_A_007_4005_DHDH_A_20260917T100652_20260917T100726_P05023_N_F_J_001",
]
outdir = "/content/gcov_162"
os.makedirs(outdir, exist_ok=True)

for name in names:
    results = asf.granule_search([name])
    if len(results) != 1:
        raise RuntimeError(f"Esperaba encontrar 1 granule para {name}; encontré {len(results)}")
    results.download(path=outdir, session=session)

print("Descargas completas:", *os.listdir(outdir), sep="\n")

import os, glob, zipfile, gc
import h5py
import numpy as np
from PIL import Image
from pyproj import Transformer
from rasterio.enums import Resampling
from rasterio.transform import from_bounds, from_origin
from rasterio.warp import reproject, transform_bounds
from google.colab import files

# Archivos ya descargados
input_dir = "/content/gcov_162"
paths = {
    "20260613": glob.glob(input_dir + "/*20260613*.h5"),
    "20260917": glob.glob(input_dir + "/*20260917*.h5"),
}
for date, matches in paths.items():
    if len(matches) != 1:
        raise RuntimeError(f"{date}: esperaba 1 HDF5; encontré {len(matches)}")
    paths[date] = matches[0]

grid_path = "science/LSAR/GCOV/grids/frequencyA"
bands = {"HH": "HHHH", "HV": "HVHV"}
# Misma extensión geográfica que las otras capas del mapa
bounds = (-69.8241475594, 9.3452772333, -66.7041475594, 12.3552772333)
width = height = 3000
outdir = "/content/gcov_162_overlays"
os.makedirs(outdir, exist_ok=True)

# Coordenadas y área fuente necesaria para cubrir el mapa
with h5py.File(paths["20260613"], "r") as h5:
    grid = h5[grid_path]
    xs, ys = grid["xCoordinates"][:], grid["yCoordinates"][:]
    epsg = int(grid["projection"].attrs["epsg_code"])

src_bounds = transform_bounds(
    "EPSG:4326", f"EPSG:{epsg}", *bounds, densify_pts=21
)
xmin, ymin, xmax, ymax = src_bounds
cols = np.flatnonzero((xs >= xmin) & (xs <= xmax))
rows = np.flatnonzero((ys >= ymin) & (ys <= ymax))
if not len(cols) or not len(rows):
    raise RuntimeError("La extensión del mapa no intersecta la escena GCOV.")

c0, c1 = cols.min(), cols.max() + 1
r0, r1 = rows.min(), rows.max() + 1
dx = float(np.median(np.diff(xs)))
dy = float(abs(np.median(np.diff(ys))))
src_transform = from_origin(xs[c0] - dx/2, ys[r0] + dy/2, dx, dy)
dst_transform = from_bounds(*bounds, width, height)

# Confirma que las escenas comparten la cuadrícula.
with h5py.File(paths["20260917"], "r") as h5:
    grid = h5[grid_path]
    if (not np.array_equal(xs, grid["xCoordinates"][:])
            or not np.array_equal(ys, grid["yCoordinates"][:])):
        raise ValueError("Las escenas no comparten la misma cuadrícula.")

# Escala visual común entre fechas para cada polarización.
samples = {"HH": [], "HV": []}
for date, path in paths.items():
    with h5py.File(path, "r") as h5:
        grid = h5[grid_path]
        for pol, dataset in bands.items():
            sample = grid[dataset][r0:r1:20, c0:c1:20]
            valid = np.isfinite(sample) & (sample > 0)
            if valid.any():
                samples[pol].append(10 * np.log10(sample[valid]))

scales = {}
for pol in bands:
    if not samples[pol]:
        raise RuntimeError(f"No hay valores válidos para calcular la escala {pol}.")
    scales[pol] = np.percentile(np.concatenate(samples[pol]), [2, 98])
del samples
gc.collect()

# Comprueba cobertura válida en una ventana pequeña alrededor de Catia La Mar.
to_utm = Transformer.from_crs("EPSG:4326", f"EPSG:{epsg}", always_xy=True)
catia_x, catia_y = to_utm.transform(-67.194, 10.622)
catia_col, catia_row = np.abs(xs - catia_x).argmin(), np.abs(ys - catia_y).argmin()

for date, path in paths.items():
    with h5py.File(path, "r") as h5:
        for pol, dataset in bands.items():
            window = h5[f"{grid_path}/{dataset}"][
                max(0, catia_row-50):catia_row+51,
                max(0, catia_col-50):catia_col+51
            ]
            valid = np.isfinite(window) & (window > 0)
            print(f"Catia · {date} · {pol}: {valid.mean()*100:.1f}% válido")
            del window

# Reproyecta solo la porción que cubre la extensión del mapa; crea PNG transparentes.
for date, path in paths.items():
    with h5py.File(path, "r") as h5:
        for pol, dataset in bands.items():
            print(f"Procesando {date} · {pol}...")
            power = h5[f"{grid_path}/{dataset}"][r0:r1, c0:c1]
            power[power <= 0] = np.nan

            result = np.full((height, width), np.nan, dtype=np.float32)
            reproject(
                source=power,
                destination=result,
                src_transform=src_transform,
                src_crs=f"EPSG:{epsg}",
                src_nodata=np.nan,
                dst_transform=dst_transform,
                dst_crs="EPSG:4326",
                dst_nodata=np.nan,
                resampling=Resampling.average,
                num_threads=2,
            )
            del power
            gc.collect()

            valid = np.isfinite(result) & (result > 0)
            gray = np.zeros((height, width), dtype=np.uint8)
            low, high = scales[pol]
            gray[valid] = np.clip(
                (10*np.log10(result[valid]) - low) / (high - low) * 255,
                0, 255
            ).astype(np.uint8)

            rgba = np.zeros((height, width, 4), dtype=np.uint8)
            rgba[:, :, :3] = gray[:, :, None]
            rgba[:, :, 3] = valid.astype(np.uint8) * 255

            output = f"{outdir}/gcov_{pol.lower()}_{date}.png"
            Image.fromarray(rgba).save(output, optimize=True)
            print("Guardado:", output)
            del result, valid, gray, rgba
            gc.collect()

zip_path = "/content/gcov_162_overlays.zip"
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
    for name in os.listdir(outdir):
        if name.endswith(".png"):
            z.write(f"{outdir}/{name}", name)

print("ZIP listo; iniciando descarga:", zip_path)
files.download(zip_path)

from google.colab import files
files.download("/content/gcov_162_overlays.zip")