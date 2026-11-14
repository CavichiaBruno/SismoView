# -*- coding: utf-8 -*-
"""Compare NISAR GCOV backscatter scenes and export map overlays."""

# Commented out IPython magic to ensure Python compatibility.
# %pip install asf_search

import os
import glob
import getpass
import shutil
import asf_search as asf

user = input("Usuario Earthdata: ")
pw = getpass.getpass("Contraseña Earthdata: ")
session = asf.ASFSession().auth_with_creds(user, pw)

names = [
    "NISAR_L2_PR_GCOV_023_054_D_083_4005_DHDH_A_20260617T230235_20260617T230310_P05023_N_F_J_001",
    "NISAR_L2_PR_GCOV_024_054_D_083_4005_DHDH_A_20260629T230235_20260629T230309_P05023_N_F_J_001",
]

outdir = "/content/gcov"
os.makedirs(outdir, exist_ok=True)

free_gb = shutil.disk_usage(outdir).free / 1e9
print(f"Espacio libre en Colab: {free_gb:.1f} GB")

for name in names:
    print(f"\nBuscando {name}...")
    results = asf.granule_search([name])

    if len(results) == 0:
        raise RuntimeError(f"ASF no encontró el granule: {name}")

    print(f"Encontrado. Descargando en {outdir}...")
    results.download(path=outdir, session=session)

    files = glob.glob(os.path.join(outdir, name + "*"))
    for file in files:
        print(f"Descargado: {file} — {os.path.getsize(file) / 1e9:.2f} GB")

import os
import glob
import h5py

files = glob.glob("/content/gcov/**/*.h5", recursive=True)
if not files:
    raise FileNotFoundError("No encontré archivos .h5 en /content/gcov")

for file in files:
    print(f"\n{os.path.basename(file)} — {os.path.getsize(file) / 1e9:.2f} GB")
    with h5py.File(file, "r") as h5:
        def show_info(name, obj):
            if isinstance(obj, h5py.Dataset) and any(
                key in name.lower()
                for key in ("hhhh", "hvhv", "xcoordinates", "ycoordinates", "projection", "mask")
            ):
                print(f"  {name} | shape={obj.shape} | dtype={obj.dtype}")

        h5.visititems(show_info)

import glob, os, h5py

files = sorted(glob.glob("/content/gcov/*GCOV*.h5"))
if len(files) != 2:
    raise RuntimeError(f"Esperaba 2 archivos GCOV; encontré {len(files)}")

for file in files:
    print(f"\n{os.path.basename(file)}")
    with h5py.File(file, "r") as h5:
        grid = h5["science/LSAR/GCOV/grids/frequencyA"]

        proj = grid["projection"]
        print("Proyección:", proj[()])
        print("Atributos de proyección:", dict(proj.attrs))

        for name in ("xCoordinates", "yCoordinates"):
            coords = grid[name][:]
            print(
                f"{name}: min={coords.min()}, max={coords.max()}, "
                f"primero={coords[0]}, último={coords[-1]}, "
                f"atributos={dict(grid[name].attrs)}"
            )

        for name in ("HHHH", "HVHV"):
            print(f"{name} atributos:", dict(grid[name].attrs))

# Commented out IPython magic to ensure Python compatibility.
# %pip install -q pyproj

import glob, os
import h5py
import numpy as np
import matplotlib.pyplot as plt
from pyproj import Transformer

files = {
    "17 jun (antes)": glob.glob("/content/gcov/*20260617*.h5"),
    "29 jun (después)": glob.glob("/content/gcov/*20260629*.h5"),
}
for fecha, encontrados in files.items():
    if len(encontrados) != 1:
        raise RuntimeError(f"{fecha}: esperaba 1 archivo; encontré {len(encontrados)}")
    files[fecha] = encontrados[0]

centers = {
    "Catia La Mar": (-67.194, 10.622),
    "San Felipe": (-68.556, 10.371),
}
radius_m = 15_000
outdir = "/content/gcov"

with h5py.File(files["17 jun (antes)"], "r") as h5:
    grid = h5["science/LSAR/GCOV/grids/frequencyA"]
    xs = grid["xCoordinates"][:]
    ys = grid["yCoordinates"][:]
    epsg = int(grid["projection"].attrs["epsg_code"])

# Verifica que las escenas se alineen en la misma cuadrícula.
with h5py.File(files["29 jun (después)"], "r") as h5:
    grid = h5["science/LSAR/GCOV/grids/frequencyA"]
    assert np.array_equal(xs, grid["xCoordinates"][:]), "No coincide la cuadrícula X"
    assert np.array_equal(ys, grid["yCoordinates"][:]), "No coincide la cuadrícula Y"

project = Transformer.from_crs("EPSG:4326", f"EPSG:{epsg}", always_xy=True)

for place, (lon, lat) in centers.items():
    cx, cy = project.transform(lon, lat)
    cols = np.flatnonzero((xs >= cx - radius_m) & (xs <= cx + radius_m))
    rows = np.flatnonzero((ys >= cy - radius_m) & (ys <= cy + radius_m))

    if not len(cols) or not len(rows):
        print(f"{place}: el epicentro queda fuera de esta escena.")
        continue

    r0, r1 = rows.min(), rows.max() + 1
    c0, c1 = cols.min(), cols.max() + 1
    crops = {}

    for fecha, filepath in files.items():
        crops[fecha] = {}
        with h5py.File(filepath, "r") as h5:
            base = "science/LSAR/GCOV/grids/frequencyA"
            for pol, dataset in [("HH", "HHHH"), ("HV", "HVHV")]:
                power = h5[f"{base}/{dataset}"][r0:r1, c0:c1]
                valid = np.isfinite(power) & (power > 0)

                db = np.full(power.shape, np.nan, dtype=np.float32)
                db[valid] = 10 * np.log10(power[valid])
                crops[fecha][pol] = db

                print(f"{place} · {fecha} · {pol}: "
                      f"{valid.mean() * 100:.1f}% de píxeles válidos")

    fig, axes = plt.subplots(2, 2, figsize=(12, 10), constrained_layout=True)

    for col, pol in enumerate(("HH", "HV")):
        # Misma escala para ambas fechas dentro de cada polarización.
        samples = np.concatenate([
            crops[fecha][pol][::10, ::10].ravel()
            for fecha in files
        ])
        vmin, vmax = np.nanpercentile(samples, [2, 98])

        for row, fecha in enumerate(files):
            ax = axes[row, col]
            im = ax.imshow(
                crops[fecha][pol],
                cmap="gray",
                vmin=vmin,
                vmax=vmax,
                extent=[xs[c0], xs[c1 - 1], ys[r1 - 1], ys[r0]],
                origin="upper",
            )
            ax.set_title(f"{fecha} · {pol}")
            ax.set_xlabel("Este UTM (m)")
            ax.set_ylabel("Norte UTM (m)")
            fig.colorbar(im, ax=ax, label="Retrodispersión gamma-0 (dB)")

    fig.suptitle(f"{place} — recorte de 30 × 30 km")
    output = os.path.join(outdir, f"comparacion_{place.replace(' ', '_')}.png")
    fig.savefig(output, dpi=150)
    plt.show()
    print("Imagen guardada en:", output)

import glob, h5py, numpy as np
from pyproj import Transformer

files = sorted(glob.glob("/content/gcov/*GCOV*.h5"))
places = {
    "Catia La Mar": (-67.194, 10.622),
    "San Felipe": (-68.556, 10.371),
}

for file in files:
    print("\n", file.split("/")[-1])
    with h5py.File(file, "r") as h5:
        base = "science/LSAR/GCOV/grids/frequencyA"
        grid = h5[base]
        xs, ys = grid["xCoordinates"][:], grid["yCoordinates"][:]
        project = Transformer.from_crs(
            "EPSG:4326", f"EPSG:{int(grid['projection'].attrs['epsg_code'])}",
            always_xy=True
        )

        for place, (lon, lat) in places.items():
            x, y = project.transform(lon, lat)
            col, row = np.abs(xs - x).argmin(), np.abs(ys - y).argmin()
            print(f"{place}: UTM=({x:.0f}, {y:.0f}), pixel=({row}, {col})")

            for pol in ("HHHH", "HVHV"):
                data = h5[f"{base}/{pol}"][
                    max(0, row-50):row+51, max(0, col-50):col+51
                ]
                valid = np.isfinite(data) & (data > 0)
                print(f"  {pol}: {valid.mean()*100:.1f}% válido")

import glob, os, h5py
import numpy as np
import matplotlib.pyplot as plt
from pyproj import Transformer

files = {
    "17 jun (antes)": glob.glob("/content/gcov/*20260617*.h5")[0],
    "29 jun (después)": glob.glob("/content/gcov/*20260629*.h5")[0],
}

# Epicentro de San Felipe
lon, lat = -68.556, 10.371
radius_m = 15_000

with h5py.File(files["17 jun (antes)"], "r") as h5:
    base = "science/LSAR/GCOV/grids/frequencyA"
    grid = h5[base]
    xs, ys = grid["xCoordinates"][:], grid["yCoordinates"][:]
    epsg = int(grid["projection"].attrs["epsg_code"])

transformer = Transformer.from_crs("EPSG:4326", f"EPSG:{epsg}", always_xy=True)
cx, cy = transformer.transform(lon, lat)

cols = np.flatnonzero(np.abs(xs - cx) <= radius_m)
rows = np.flatnonzero(np.abs(ys - cy) <= radius_m)
r0, r1 = rows.min(), rows.max() + 1
c0, c1 = cols.min(), cols.max() + 1

images = {}
for date, filepath in files.items():
    images[date] = {}
    with h5py.File(filepath, "r") as h5:
        for pol, dataset in [("HH", "HHHH"), ("HV", "HVHV")]:
            power = h5[f"{base}/{dataset}"][r0:r1, c0:c1]
            valid = np.isfinite(power) & (power > 0)
            if not valid.any():
                raise RuntimeError(f"No hay datos válidos para {date}, {pol}")

            db = np.full(power.shape, np.nan, dtype=np.float32)
            db[valid] = 10 * np.log10(power[valid])
            images[date][pol] = db
            print(f"{date} · {pol}: {valid.mean()*100:.1f}% válido")

fig, axes = plt.subplots(2, 2, figsize=(12, 9), constrained_layout=True)

for col, pol in enumerate(("HH", "HV")):
    samples = np.concatenate([
        images[date][pol][::10, ::10].ravel()
        for date in files
    ])
    vmin, vmax = np.nanpercentile(samples, [2, 98])

    for row, date in enumerate(files):
        im = axes[row, col].imshow(
            images[date][pol],
            cmap="gray", vmin=vmin, vmax=vmax,
            extent=[xs[c0], xs[c1-1], ys[r1-1], ys[r0]],
            origin="upper",
        )
        axes[row, col].set_title(f"{date} · {pol}")
        axes[row, col].set_xlabel("Este UTM (m)")
        axes[row, col].set_ylabel("Norte UTM (m)")
        fig.colorbar(im, ax=axes[row, col], label="Retrodispersión (dB)")

fig.suptitle("San Felipe — comparación NISAR GCOV")
plt.show()

import glob
import os
import zipfile

import h5py
import numpy as np
import rasterio
from PIL import Image
from rasterio.enums import Resampling
from rasterio.transform import from_bounds, from_origin
from rasterio.warp import reproject


INPUT_DIR = "/content/gcov"
OUTPUT_DIR = "/content/gcov/overlays"
OUTPUT_WIDTH = 3000
OUTPUT_HEIGHT = 3000
RADIUS_METERS = 15_000
CENTER_LON = -68.556
CENTER_LAT = 10.371
BOUNDS = (-68.6929846334, 10.2362533238, -68.4190153666, 10.5057466762)
GRID_PATH = "science/LSAR/GCOV/grids/frequencyA"
SCENES = {
    "20260617": "17 jun (antes)",
    "20260629": "29 jun (después)",
}
POLARIZATIONS = {"HH": "HHHH", "HV": "HVHV"}


def find_scene(date: str) -> str:
    matches = glob.glob(os.path.join(INPUT_DIR, f"*{date}*.h5"))
    if len(matches) != 1:
        raise FileNotFoundError(
            f"Esperaba un GCOV de {date} en {INPUT_DIR}; encontré {len(matches)}."
        )
    return matches[0]


def load_crop(path: str) -> tuple[dict[str, np.ndarray], np.ndarray, np.ndarray, int]:
    with h5py.File(path, "r") as h5:
        grid = h5[GRID_PATH]
        xs = grid["xCoordinates"][:]
        ys = grid["yCoordinates"][:]
        epsg = int(grid["projection"].attrs["epsg_code"])
        if epsg != 32619:
            raise ValueError(f"Se esperaba EPSG:32619; el archivo indica EPSG:{epsg}.")

        col = int(np.abs(xs - 548605).argmin())
        row = int(np.abs(ys - 1146466).argmin())
        col_radius = int(np.ceil(RADIUS_METERS / np.median(np.diff(xs))))
        row_radius = int(np.ceil(RADIUS_METERS / abs(np.median(np.diff(ys)))))
        r0, r1 = max(0, row - row_radius), min(len(ys), row + row_radius + 1)
        c0, c1 = max(0, col - col_radius), min(len(xs), col + col_radius + 1)

        crops = {}
        for polarization, dataset_name in POLARIZATIONS.items():
            power = grid[dataset_name][r0:r1, c0:c1]
            valid = np.isfinite(power) & (power > 0)
            if not valid.any():
                raise ValueError(f"El recorte no tiene datos válidos para {polarization}.")
            backscatter_db = np.full(power.shape, np.nan, dtype=np.float32)
            backscatter_db[valid] = 10 * np.log10(power[valid])
            crops[polarization] = backscatter_db
            print(f"{os.path.basename(path)} · {polarization}: "
                  f"{valid.mean() * 100:.1f}% válido")

        dx = float(np.median(np.diff(xs)))
        dy = float(abs(np.median(np.diff(ys))))
        source_transform = from_origin(xs[c0] - dx / 2, ys[r0] + dy / 2, dx, dy)
        return crops, np.array([source_transform.a, source_transform.e]), source_transform, epsg


def main() -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    paths = {date: find_scene(date) for date in SCENES}
    loaded = {date: load_crop(path) for date, path in paths.items()}

    reference_x = loaded["20260617"][1]
    reference_y = loaded["20260617"][2]
    for date in ("20260629",):
        x_coords = loaded[date][1]
        transform = loaded[date][2]
        if not np.array_equal(reference_x, x_coords) or (
            reference_y.a != transform.a or reference_y.e != transform.e
        ):
            raise ValueError("Las escenas no comparten resolución y cuadrícula.")

    dest_transform = from_bounds(*BOUNDS, OUTPUT_WIDTH, OUTPUT_HEIGHT)
    scales = {}
    for polarization in POLARIZATIONS:
        samples = np.concatenate([
            loaded[date][0][polarization][::10, ::10].ravel()
            for date in SCENES
        ])
        samples = samples[np.isfinite(samples)]
        scales[polarization] = tuple(np.percentile(samples, [2, 98]))
        print(f"Escala compartida {polarization}: "
              f"{scales[polarization][0]:.2f} a {scales[polarization][1]:.2f} dB")

    for date, label in SCENES.items():
        crops, _, source_transform, epsg = loaded[date]
        for polarization, source in crops.items():
            destination = np.full(
                (OUTPUT_HEIGHT, OUTPUT_WIDTH), np.nan, dtype=np.float32
            )
            reproject(
                source=source,
                destination=destination,
                src_transform=source_transform,
                src_crs=f"EPSG:{epsg}",
                src_nodata=np.nan,
                dst_transform=dest_transform,
                dst_crs="EPSG:4326",
                dst_nodata=np.nan,
                resampling=Resampling.bilinear,
            )

            valid = np.isfinite(destination)
            low, high = scales[polarization]
            gray = np.zeros(destination.shape, dtype=np.uint8)
            gray[valid] = np.clip(
                (destination[valid] - low) / (high - low) * 255, 0, 255
            ).astype(np.uint8)
            rgba = np.dstack((gray, gray, gray, valid.astype(np.uint8) * 255))

            output_path = os.path.join(
                OUTPUT_DIR, f"gcov_{polarization.lower()}_{date}.png"
            )
            Image.fromarray(rgba, mode="RGBA").save(output_path, optimize=True)
            print(f"Guardado: {output_path} ({label})")

    archive_path = "/content/gcov_overlays.zip"
    with zipfile.ZipFile(archive_path, "w", zipfile.ZIP_DEFLATED) as archive:
        for filename in os.listdir(OUTPUT_DIR):
            if filename.endswith(".png"):
                archive.write(os.path.join(OUTPUT_DIR, filename), filename)
    print(f"\nDescarga este ZIP y copia sus cuatro PNG a public/data/venezuela/gcov/:")
    print(archive_path)


if __name__ == "__main__":
    main()

import os
from google.colab import files

zip_path = "/content/gcov_overlays.zip"
print("Existe:", os.path.exists(zip_path))
if os.path.exists(zip_path):
    print(f"Tamaño: {os.path.getsize(zip_path) / 1e6:.1f} MB")
    files.download(zip_path)

# Commented out IPython magic to ensure Python compatibility.
# %pip install -q rasterio

import glob, os, zipfile, gc
import h5py
import numpy as np
import rasterio
from PIL import Image
from rasterio.enums import Resampling
from rasterio.transform import from_bounds, from_origin
from rasterio.warp import reproject

files = {
    "20260617": glob.glob("/content/gcov/*20260617*.h5"),
    "20260629": glob.glob("/content/gcov/*20260629*.h5"),
}
for date, matches in files.items():
    if len(matches) != 1:
        raise RuntimeError(f"{date}: esperaba 1 HDF5; encontré {len(matches)}")
    files[date] = matches[0]

grid_path = "science/LSAR/GCOV/grids/frequencyA"
bands = {"HH": "HHHH", "HV": "HVHV"}
bounds = (-69.8241475594, 9.3452772333, -66.7041475594, 12.3552772333)
width = height = 3000
outdir = "/content/gcov_overlays"
os.makedirs(outdir, exist_ok=True)

# Usa una escala común entre fechas para cada polarización.
samples = {"HH": [], "HV": []}
with h5py.File(files["20260617"], "r") as h5:
    grid = h5[grid_path]
    xs, ys = grid["xCoordinates"][:], grid["yCoordinates"][:]
    epsg = int(grid["projection"].attrs["epsg_code"])

dx = float(np.median(np.diff(xs)))
dy = float(abs(np.median(np.diff(ys))))
src_transform = from_origin(xs[0] - dx / 2, ys[0] + dy / 2, dx, dy)

for date, path in files.items():
    with h5py.File(path, "r") as h5:
        grid = h5[grid_path]
        if not np.array_equal(xs, grid["xCoordinates"][:]) or not np.array_equal(ys, grid["yCoordinates"][:]):
            raise ValueError("Las escenas no comparten la misma cuadrícula.")
        for pol, dataset in bands.items():
            sample = grid[dataset][::20, ::20]
            valid = np.isfinite(sample) & (sample > 0)
            samples[pol].append(10 * np.log10(sample[valid]))

scales = {
    pol: np.percentile(np.concatenate(values), [2, 98])
    for pol, values in samples.items()
}
del samples
gc.collect()

dst_transform = from_bounds(*bounds, width, height)

for date, path in files.items():
    with h5py.File(path, "r") as h5:
        grid = h5[grid_path]
        for pol, dataset in bands.items():
            print(f"Procesando {date} · {pol}...")
            power = grid[dataset][:]
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
                (10 * np.log10(result[valid]) - low) / (high - low) * 255,
                0, 255
            ).astype(np.uint8)

            rgba = np.zeros((height, width, 4), dtype=np.uint8)
            rgba[:, :, :3] = gray[:, :, None]
            rgba[:, :, 3] = valid.astype(np.uint8) * 255

            output = os.path.join(outdir, f"gcov_{pol.lower()}_{date}.png")
            Image.fromarray(rgba).save(output, optimize=True)
            del result, valid, gray, rgba
            gc.collect()
            print("Guardado:", output)

zip_path = "/content/gcov_overlays.zip"
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
    for name in os.listdir(outdir):
        if name.endswith(".png"):
            z.write(os.path.join(outdir, name), name)

print("ZIP listo:", zip_path)

from google.colab import files
files.download("/content/gcov_overlays.zip")

files.download("/content/gcov_overlays.zip")