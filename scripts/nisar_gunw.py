# -*- coding: utf-8 -*-
"""Download and process NISAR GUNW interferograms for the Venezuela event."""

# In Colab, install dependencies first with:
# %pip install -r scripts/requirements.txt
import asf_search as asf

name = "NISAR_L2_PR_GUNW_022_162_A_007_023_4000_SH_20260613T100656_20260613T100731_20260625T100655_20260625T100730_P05023_N_F_J_001"
res = asf.granule_search([name])
print(len(res), "resultados")
for r in res:
    print(r.properties["fileID"], r.properties["startTime"])

# Dependencies are listed in scripts/requirements.txt.
import asf_search as asf
from getpass import getpass

user = input("Usuario Earthdata: ")
pw = getpass("Contraseña: ")
session = asf.ASFSession().auth_with_creds(user, pw)

name = "NISAR_L2_PR_GUNW_022_162_A_007_023_4000_SH_20260613T100656_20260613T100731_20260625T100655_20260625T100730_P05023_N_F_J_001"
res = asf.granule_search([name])
res.download(path="/content", session=session)

import glob, os
f = glob.glob("/content/*GUNW*.h5")[0]
print(f, round(os.path.getsize(f) / 1e6), "MB")

import h5py, glob, json, os, zipfile
import numpy as np
from rasterio.transform import from_origin, from_bounds
from rasterio.warp import reproject, Resampling
from matplotlib import colormaps
from PIL import Image
from google.colab import files

RES = 0.001      # grados por pixel (~110 m)
LOOK = 3         # promedio complejo 3x3 -> pixeles de 60 m
COH_MIN = 0.3    # se oculta donde la fase es ruido

f = glob.glob("/content/*GUNW*.h5")[0]
B = {"west": -69.82414755943846, "south": 9.345277233280278,
     "east": -66.70414755943845, "north": 12.355277233280278}   # los MISMOS limites que el mapa de calor
G = "science/LSAR/GUNW/grids/frequencyA/wrappedInterferogram/"

with h5py.File(f) as h:
    wz = h[G + "HH/wrappedInterferogram"]
    wx = h[G + "xCoordinates"][:]; wy = h[G + "yCoordinates"][:]
    epsg = int(h[G + "projection"][()])
    freq = float(h["science/LSAR/GUNW/grids/frequencyA/centerFrequency"][()])
    ny, nx = wz.shape
    ny2, nx2 = ny // LOOK, nx // LOOK
    re = np.zeros((ny2, nx2), np.float32); im = np.zeros_like(re); vd = np.zeros_like(re)
    step = LOOK * 300
    for r0 in range(0, ny2 * LOOK, step):
        r1 = min(r0 + step, ny2 * LOOK)
        z = wz[r0:r1, :nx2 * LOOK]
        ok = np.isfinite(z) & (z != 0)
        z = np.where(ok, z, 0).astype(np.complex64)
        a = (r1 - r0) // LOOK
        zb = z.reshape(a, LOOK, nx2, LOOK)
        n = ok.reshape(a, LOOK, nx2, LOOK).sum(axis=(1, 3))
        s = zb.sum(axis=(1, 3))
        ab = np.abs(zb).sum(axis=(1, 3))
        with np.errstate(invalid="ignore", divide="ignore"):
            m_ = s / n
            coh = np.abs(s) / ab
            u = m_ / np.abs(m_)
        good = (n >= LOOK * LOOK // 2 + 1) & np.isfinite(coh) & (coh >= COH_MIN) & np.isfinite(u)
        i0 = r0 // LOOK
        re[i0:i0 + a] = np.where(good, u.real, 0)
        im[i0:i0 + a] = np.where(good, u.imag, 0)
        vd[i0:i0 + a] = good
        print("bloque", r0, "/", ny2 * LOOK, end="\r")

print("\nProyeccion EPSG:", epsg, "| pixeles multilook:", ny2, "x", nx2, "| validos: %.1f%%" % (100 * vd.mean()))

# orientacion norte arriba
dxo = abs(wx[1] - wx[0]); dyo = abs(wy[1] - wy[0])
if wy[0] < wy[-1]:
    re, im, vd = re[::-1], im[::-1], vd[::-1]
src_tr = from_origin(wx.min() - dxo / 2, wy.max() + dyo / 2, dxo * LOOK, dyo * LOOK)

# reproyectar a lat/lon, sobre la caja exacta del mapa de calor
dw = int(round((B["east"] - B["west"]) / RES)); dh = int(round((B["north"] - B["south"]) / RES))
dst_tr = from_bounds(B["west"], B["south"], B["east"], B["north"], dw, dh)
def rp(a):
    out = np.zeros((dh, dw), np.float32)
    reproject(np.ascontiguousarray(a), out, src_transform=src_tr, src_crs=f"EPSG:{epsg}",
              dst_transform=dst_tr, dst_crs="EPSG:4326", resampling=Resampling.average)
    return out
R, I, V = rp(re), rp(im), rp(vd)

# se reproyecta parte real e imaginaria (no la fase) para no romper el salto de 2*pi
ang = np.arctan2(I, R)
mag = np.hypot(R, I) / np.maximum(V, 1e-6)
show = (V >= 0.5) & (mag >= 0.3)

rgba = (colormaps["twilight"]((ang + np.pi) / (2 * np.pi)) * 255).astype("uint8")
rgba[..., 3] = np.where(show, 255, 0)
img = Image.fromarray(rgba)
img.save("/content/franjas.png", optimize=True)
mb = os.path.getsize("/content/franjas.png") / 1e6
if mb > 20:   # si pesa demasiado para la web, se reduce
    img = img.resize((int(dw * 0.7), int(dh * 0.7)), Image.LANCZOS)
    img.save("/content/franjas.png", optimize=True)
    mb = os.path.getsize("/content/franjas.png") / 1e6
    print("PNG reducido al 70% por tamano")

meta_f = {"bounds": B, "resolution_deg": RES, "multilook": LOOK, "coherence_min": COH_MIN,
          "fringe_cycle_cm": float(299792458.0 / freq * 100 / 2),
          "colormap": "twilight", "ionosphere_corrected": False,
          "granule": os.path.basename(f).replace(".h5", "")}
json.dump(meta_f, open("/content/meta_franjas.json", "w"))
print("Imagen:", img.size[0], "x", img.size[1], "| PNG: %.1f MB" % mb,
      "| 1 ciclo de color = %.1f cm" % meta_f["fringe_cycle_cm"],
      "| visible: %.1f%%" % (100 * show.mean()))

with zipfile.ZipFile("/content/franjas.zip", "w") as z_:
    z_.write("/content/franjas.png", "franjas.png"); z_.write("/content/meta_franjas.json", "meta_franjas.json")
files.download("/content/franjas.zip")

# Dependencies are listed in scripts/requirements.txt.
import os, io, json, base64, math, glob, urllib.request
import numpy as np, rasterio
from rasterio.warp import reproject, Resampling
from rasterio.transform import from_bounds
from scipy.ndimage import map_coordinates
from PIL import Image
from google.colab import files

W, E, S, N = -69.5, -66.8, 9.8, 11.0     # zona de la escena
RES = 0.005                               # ~550 m por celda
nx, ny = int(round((E - W) / RES)), int(round((N - S) / RES))

# 1) desplazamiento (cm) sobre la cuadricula lat/lon
if not os.path.exists("/content/desplazamiento_cm.tif"):
    print("Selecciona desplazamiento_cm.tif"); files.upload()
dst_tr = from_bounds(W, S, E, N, nx, ny)
with rasterio.open("/content/desplazamiento_cm.tif") as src:
    disp = np.full((ny, nx), np.nan, np.float32)
    reproject(rasterio.band(src, 1), disp, src_nodata=np.nan, dst_transform=dst_tr,
              dst_crs="EPSG:4326", dst_nodata=np.nan, resampling=Resampling.average)

# 2) elevacion (AWS Terrain Tiles, formato terrarium, zoom 9)
Z = 9
def txy(lon, lat):
    n = 2 ** Z
    return (lon + 180) / 360 * n, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
xa, yb = txy(W, S); xb, ya = txy(E, N)
tx0, tx1, ty0, ty1 = int(xa), int(xb), int(ya), int(yb)
mos = np.zeros(((ty1 - ty0 + 1) * 256, (tx1 - tx0 + 1) * 256), np.float32)
for tx in range(tx0, tx1 + 1):
    for ty in range(ty0, ty1 + 1):
        url = f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{tx}/{ty}.png"
        a = np.array(Image.open(io.BytesIO(urllib.request.urlopen(url, timeout=60).read())).convert("RGB"), np.float32)
        mos[(ty-ty0)*256:(ty-ty0+1)*256, (tx-tx0)*256:(tx-tx0+1)*256] = a[..., 0]*256 + a[..., 1] + a[..., 2]/256 - 32768
lons = W + (np.arange(nx) + .5) * RES
lats = N - (np.arange(ny) + .5) * RES
xt = (lons + 180) / 360 * 2**Z
yt = (1 - np.arcsinh(np.tan(np.radians(lats))) / np.pi) / 2 * 2**Z
PX, PY = np.meshgrid((xt - tx0) * 256 - .5, (yt - ty0) * 256 - .5)
elev = map_coordinates(mos, [PY, PX], order=1, mode="nearest")

# 3) geometria de la linea de vista
los = {"approx": True, "east": 0.633, "north": 0.112, "up": 0.766}
try:
    import h5py
    f = glob.glob("/content/*GUNW*.h5")[0]
    with h5py.File(f) as h:
        r = h["science/LSAR/GUNW/metadata/radarGrid/"]
        vals = {}
        for k in ["losUnitVectorX", "losUnitVectorY", "incidenceAngle"]:
            d = r[k]; vals[k] = float(np.nanmean(d[d.shape[0] // 2]))
            print(k, "| descripcion:", d.attrs.get("description"), "| unidades:", d.attrs.get("units"), "| media:", vals[k])
    los = {"approx": False, "losUnitVectorX": vals["losUnitVectorX"], "losUnitVectorY": vals["losUnitVectorY"],
           "incidenceAngle": vals["incidenceAngle"]}
except Exception as e:
    print("Sin .h5, uso valores APROXIMADOS:", e)

# 4) exportar compacto
d16 = np.where(np.isfinite(disp), np.clip(np.round(disp * 10), -30000, 30000), -32768).astype("<i2")
e16 = np.round(elev).astype("<i2")
out = {"bounds": {"west": W, "south": S, "east": E, "north": N}, "nx": nx, "ny": ny, "res_deg": RES,
       "row0": "north", "disp_scale": 10, "disp_nodata": -32768, "los": los,
       "disp_b64": base64.b64encode(d16.tobytes()).decode(), "elev_b64": base64.b64encode(e16.tobytes()).decode()}
json.dump(out, open("/content/terreno.json", "w"))
ok = np.isfinite(disp)
print("Cuadricula:", nx, "x", ny, "| elevacion m (min/max):", e16.min(), e16.max(),
      "| desplazamiento valido: %.1f%%" % (100 * ok.mean()),
      "| cm (min/max):", np.nanmin(disp), np.nanmax(disp),
      "| archivo: %.2f MB" % (os.path.getsize("/content/terreno.json") / 1e6))
files.download("/content/terreno.json")

from shapely.geometry import shape, Point
import asf_search as asf

name = "NISAR_L2_PR_GUNW_022_162_A_007_023_4000_SH_20260613T100656_20260613T100731_20260625T100655_20260625T100730_P05023_N_F_J_001"
res = asf.granule_search([name])
poly = shape(res[0].geometry)

epicentros = {"M7.5 principal": (-68.3206, 10.4009), "M7.2 primero": (-68.5277, 10.4360)}
for nombre, (lon, lat) in epicentros.items():
    print(nombre, "dentro de la imagen:", poly.contains(Point(lon, lat)))
print("Huella (lon_min, lat_min, lon_max, lat_max):", poly.bounds)

import asf_search as asf, os, glob
from getpass import getpass

user = input("Usuario Earthdata: ")
pw = getpass("Contraseña: ")
session = asf.ASFSession().auth_with_creds(user, pw)

name = "NISAR_L2_PR_GUNW_022_162_A_007_023_4000_SH_20260613T100656_20260613T100731_20260625T100655_20260625T100730_P05023_N_F_J_001"
res = asf.granule_search([name])
res.download(path="/content", session=session)

f = glob.glob("/content/*.h5")[0]
print(f, round(os.path.getsize(f)/1e6), "MB")

# Dependencies are listed in scripts/requirements.txt.
import h5py
with h5py.File(f) as h:
    h.visititems(lambda n, o: print(n, o.shape) if isinstance(o, h5py.Dataset) else None)

# Dependencies are listed in scripts/requirements.txt.

import h5py
import numpy as np
import matplotlib.pyplot as plt
import glob
import os
import asf_search as asf
from getpass import getpass

# 1. DESCARGA NASA ASF

user = input("Usuario Earthdata: ")
pw = getpass("Contraseña: ")

session = asf.ASFSession().auth_with_creds(user, pw)

name = "NISAR_L2_PR_GUNW_022_162_A_007_023_4000_SH_20260613T100656_20260613T100731_20260625T100655_20260625T100730_P05023_N_F_J_001"

res = asf.granule_search([name])

if len(res) == 0:
    raise ValueError("Producto no encontrado.")

res.download(path="/content", session=session)

files = glob.glob("/content/*GUNW*.h5")

if not files:
    raise FileNotFoundError("No se encontró el archivo HDF5.")

f = files[0]

print("Archivo:", f)
print("Tamaño:", round(os.path.getsize(f)/1e6, 2), "MB")


# 2. LEER INTERFEROGRAMA

G = "science/LSAR/GUNW/grids/frequencyA/"

with h5py.File(f, "r") as h:

    w = h[G + "wrappedInterferogram/HH/wrappedInterferogram"]

    wx = h[G + "wrappedInterferogram/HH/xCoordinates"][:]
    wy = h[G + "wrappedInterferogram/HH/yCoordinates"][:]

    print("Dtype:", w.dtype)
    print("Resolución X:", abs(wx[1]-wx[0]), "m")
    print("Dimensiones:", w.shape)

    # Zona de estudio
    xi = np.where((wx > 560000) & (wx < 590000))[0]
    yi = np.where((wy > 1140000) & (wy < 1185000))[0]

    if len(xi) == 0 or len(yi) == 0:
        raise ValueError("Coordenadas fuera del área del producto.")

    sub = w[
        yi[0]:yi[-1]+1:3,
        xi[0]:xi[-1]+1:3
    ]

    extent = [
        wx[xi[0]], wx[xi[-1]],
        wy[yi[-1]], wy[yi[0]]
    ]

# 3. FASE ENVUELTA

phase = np.angle(sub) if np.iscomplexobj(sub) else sub

# 4. GENERAR IMAGEN

fig, ax = plt.subplots(figsize=(12, 10))

im = ax.imshow(
    phase,
    extent=extent,
    cmap="twilight",
    interpolation="nearest",
    aspect="auto",
    vmin=-np.pi,
    vmax=np.pi
)

ax.axhline(
    1161000,
    color="white",
    linestyle="--",
    linewidth=1
)

ax.set_title(
    "NISAR - Wrapped Interferogram",
    fontsize=15
)

ax.set_xlabel("Este UTM (m)")
ax.set_ylabel("Norte UTM (m)")

cbar = plt.colorbar(im, ax=ax)
cbar.set_label("Fase (rad)")

plt.tight_layout()

# 5. GUARDAR PNG

output = "/content/NISAR_interferogram.png"

plt.savefig(
    output,
    dpi=300,
    bbox_inches="tight"
)

plt.show()

print("Imagen guardada:", output)

# 1. Instalar la biblioteca ASF
# Dependencies are listed in scripts/requirements.txt.

# 2. Importar librerías
import asf_search as asf
from getpass import getpass
from google.colab import files
import os
import glob

# 3. Identificador exacto del producto
granule = "NISAR_L2_PR_GUNW_022_162_A_007_023_4000_SH_20260613T100656_20260613T100731_20260625T100655_20260625T100730_P05023_N_F_J_001"

# 4. Introducir credenciales NASA Earthdata
username = input("Usuario NASA Earthdata: ")
password = getpass("Contraseña NASA Earthdata: ")

# 5. Autenticar
session = asf.ASFSession().auth_with_creds(username, password)

# 6. Buscar el producto exacto
print("Buscando producto en ASF...")
results = asf.search(
    dataset="NISAR",
    granule_list=[granule]
)

if len(results) == 0:
    raise Exception(
        "No se encontró el producto. Comprueba el identificador "
        "y que esté disponible en ASF Vertex."
    )

print("Producto encontrado:", len(results))

# 7. Descargar el archivo
download_dir = "/content/NISAR_download"
os.makedirs(download_dir, exist_ok=True)

print("Iniciando descarga. Puede tardar según el tamaño del archivo...")
results.download(
    path=download_dir,
    session=session
)

# 8. Localizar el archivo descargado
h5_files = glob.glob(download_dir + "/**/*.h5", recursive=True)
h5_files += glob.glob(download_dir + "/**/*.hdf5", recursive=True)

if not h5_files:
    raise Exception("La descarga terminó, pero no se encontró ningún HDF5.")

# 9. Descargarlo a tu ordenador
file_path = h5_files[0]

print("Archivo descargado correctamente:")
print(file_path)
print("Tamaño:", round(os.path.getsize(file_path) / (1024**3), 2), "GB")

files.download(file_path)

import h5py, numpy as np, glob
import matplotlib.pyplot as plt

f = glob.glob("/content/*GUNW*.h5")[0]
base = "science/LSAR/GUNW/grids/frequencyA/unwrappedInterferogram/"

with h5py.File(f) as h:
    g = h[base + "HH"]
    phase = g["unwrappedPhase"][:]
    coh   = g["coherenceMagnitude"][:]
    cc    = g["connectedComponents"][:]
    iono  = g["ionospherePhaseScreen"][:]
    x = g["xCoordinates"][:]; y = g["yCoordinates"][:]
    mask  = h[base + "mask"][:]
    freq  = float(h["science/LSAR/GUNW/grids/frequencyA/centerFrequency"][()])
    proj  = h[base + "projection"]
    print("Proyeccion:", proj[()], dict(proj.attrs))

wl = 299792458.0 / freq
print("Frecuencia (Hz):", freq, "| Longitud de onda (cm):", wl * 100)
print("Valores unicos de mask:", np.unique(mask)[:10])
print("Valores unicos de connectedComponents:", np.unique(cc)[:10])
print("Fase: min/max", np.nanmin(phase), np.nanmax(phase))
print("Coherencia media:", np.nanmean(coh))

# Fase -> desplazamiento en la linea de vista (cm)
valid = np.isfinite(phase) & (phase != 0) & (coh > 0.4) & (cc > 0)
ph = np.where(valid, phase - iono, np.nan)   # quitamos ionosfera
disp_cm = ph * wl / (4 * np.pi) * 100
disp_cm -= np.nanmedian(disp_cm)             # referencia provisional

print("Pixeles validos: %.1f%%" % (100 * valid.mean()))
print("Desplazamiento cm  p2/p98:", np.nanpercentile(disp_cm, [2, 98]))

ext = [x[0], x[-1], y[-1], y[0]]
fig, ax = plt.subplots(1, 2, figsize=(16, 7))
lim = np.nanpercentile(np.abs(disp_cm), 98)
im = ax[0].imshow(disp_cm[::2, ::2], extent=ext, cmap="RdBu_r", vmin=-lim, vmax=lim)
ax[0].set_title("Desplazamiento en linea de vista (cm)"); plt.colorbar(im, ax=ax[0])
im = ax[1].imshow(coh[::2, ::2], extent=ext, cmap="gray", vmin=0, vmax=1)
ax[1].set_title("Coherencia"); plt.colorbar(im, ax=ax[1])
plt.show()

# Dependencies are listed in scripts/requirements.txt.
from pyproj import Transformer
import numpy as np, matplotlib.pyplot as plt

t = Transformer.from_crs("EPSG:4326", "EPSG:32619", always_xy=True)
epis = {"M7.5 principal": (-68.3206, 10.4009), "M7.2 primero": (-68.5277, 10.4360)}

valid2 = np.isfinite(phase) & (phase != 0) & (coh > 0.25) & (cc > 0)
ph2 = np.where(valid2, phase - iono, np.nan)
d2 = ph2 * wl / (4 * np.pi) * 100
d2 -= np.nanmedian(d2)
print("Pixeles validos (umbral 0.25): %.1f%%" % (100 * valid2.mean()))
print("Desplazamiento cm  min/p2/p98/max:", np.nanmin(d2), *np.nanpercentile(d2, [2, 98]), np.nanmax(d2))

ext = [x[0], x[-1], y[-1], y[0]]
lim = np.nanpercentile(np.abs(d2), 98)
fig, ax = plt.subplots(figsize=(11, 8))
im = ax.imshow(d2[::2, ::2], extent=ext, cmap="RdBu_r", vmin=-lim, vmax=lim)
for n, (lo, la) in epis.items():
    ex, ey = t.transform(lo, la)
    ax.plot(ex, ey, "k*", ms=18, mec="yellow")
    ax.annotate(n, (ex, ey), xytext=(8, 8), textcoords="offset points", fontsize=11)
    print(n, "-> x,y UTM:", round(ex), round(ey))
plt.colorbar(im, label="cm (linea de vista)")
ax.set_title("Desplazamiento NISAR 13-25 jun 2026 + epicentros")
plt.show()

# Dependencies are listed in scripts/requirements.txt.
import rasterio, warnings
from rasterio.transform import from_origin
import numpy as np, matplotlib.pyplot as plt, h5py, glob
warnings.filterwarnings("ignore")

# 1) Atributos de la capa de fase (para verificar el signo)
f = glob.glob("/content/*GUNW*.h5")[0]
with h5py.File(f) as h:
    g = h["science/LSAR/GUNW/grids/frequencyA/unwrappedInterferogram/HH"]
    for k, v in g["unwrappedPhase"].attrs.items():
        print("unwrappedPhase", k, "->", v)
    print("lookDirection:", h["science/LSAR/identification/lookDirection"][()])
    print("orbitPassDirection:", h["science/LSAR/identification/orbitPassDirection"][()])

# 2) Perfil norte-sur que pasa por el epicentro principal
x0 = 575000
i = np.argmin(np.abs(x - x0))
cols = slice(i - 40, i + 40)                 # franja de unos 6 km de ancho
prof = np.nanmedian(d2[:, cols], axis=1)
km = (y - y[0]) / 1000.0

fig, ax = plt.subplots(figsize=(11, 4))
ax.plot(y / 1000.0, prof, lw=1.5)
ax.axhline(0, color="gray", lw=0.5)
ax.axvline(1150.0, color="k", ls="--", lw=0.8)
ax.set_xlabel("Norte UTM (km)  ->  mas al norte a la derecha")
ax.set_ylabel("cm (linea de vista)")
ax.set_title("Perfil N-S a x = 575 km (mediana de franja de 6 km)")
plt.show()
print("Perfil min/max (cm):", np.nanmin(prof), np.nanmax(prof))
print("Min/max de todo el mapa (cm):", np.nanmin(d2), np.nanmax(d2))

# 3) Exportar GeoTIFF (UTM 19N)
dx = abs(x[1] - x[0]); dy = abs(y[1] - y[0])
north_up = y[0] > y[-1]
arr = d2.astype("float32") if north_up else d2[::-1].astype("float32")
north = (y.max() + dy / 2)
tr = from_origin(x.min() - dx / 2, north, dx, dy)
with rasterio.open("/content/desplazamiento_cm.tif", "w", driver="GTiff",
                   height=arr.shape[0], width=arr.shape[1], count=1,
                   dtype="float32", crs="EPSG:32619", transform=tr,
                   nodata=np.nan, compress="deflate") as dst:
    dst.write(arr, 1)
print("GeoTIFF guardado. y descendente:", north_up, "| tamano pixel (m):", dx, dy)

from google.colab import files
files.download("/content/desplazamiento_cm.tif")

import h5py, glob, numpy as np
f = glob.glob("/content/*GUNW*.h5")[0]
idp = "science/LSAR/identification/"
with h5py.File(f) as h:
    for k in ["referenceZeroDopplerStartTime", "secondaryZeroDopplerStartTime",
              "trackNumber", "frameNumber"]:
        print(k, "->", h[idp + k][()])
    print("temporalBaseline ->", h["science/LSAR/GUNW/metadata/orbit/temporalBaseline"][()])
    p = "science/LSAR/GUNW/metadata/processingInformation/parameters/geocoding/"
    for k in ["rangeIonosphericCorrectionApplied", "azimuthIonosphericCorrectionApplied",
              "hydrostaticTroposphericCorrectionApplied", "wetTroposphericCorrectionApplied"]:
        print(k, "->", h[p + k][()])

print("Ionosfera (rad)  p2/p50/p98:", np.nanpercentile(iono[np.isfinite(iono) & (iono != 0)], [2, 50, 98]))
print("Ionosfera en cm equivalentes:", np.nanpercentile(iono[np.isfinite(iono) & (iono != 0)], [2, 50, 98]) * wl / (4*np.pi) * 100)

import numpy as np, matplotlib.pyplot as plt
from pyproj import Transformer

t = Transformer.from_crs("EPSG:4326", "EPSG:32619", always_xy=True)
epis = {"M7.5": (-68.3206, 10.4009), "M7.2": (-68.5277, 10.4360)}

valid = np.isfinite(phase) & (phase != 0) & (coh > 0.25) & (cc > 0) & np.isfinite(iono)
k = wl / (4 * np.pi) * 100
raw = np.where(valid, phase, np.nan) * k
cor = np.where(valid, phase - iono, np.nan) * k
ion = np.where(valid, iono, np.nan) * k
for a in (raw, cor, ion):
    a -= np.nanmedian(a)

ext = [x[0], x[-1], y[-1], y[0]]
s = 3
lim = np.nanpercentile(np.abs(cor), 98)
limi = np.nanpercentile(np.abs(ion), 98)
fig, ax = plt.subplots(1, 3, figsize=(20, 7))
for a_, arr, ttl, l in [(ax[0], raw, "Sin corregir ionosfera", lim),
                        (ax[1], cor, "Corregida (fase - ionosfera)", lim),
                        (ax[2], ion, "Ionosfera sola", limi)]:
    im = a_.imshow(arr[::s, ::s], extent=ext, cmap="RdBu_r", vmin=-l, vmax=l)
    a_.set_title(ttl)
    plt.colorbar(im, ax=a_, shrink=0.7, label="cm")
    for n, (lo, la) in epis.items():
        ex, ey = t.transform(lo, la)
        a_.plot(ex, ey, "k*", ms=14, mec="yellow")
plt.show()

# Perfil N-S en x = 575 km
i = np.argmin(np.abs(x - 575000)); cols = slice(i - 40, i + 40)
fig, a_ = plt.subplots(figsize=(11, 4))
for arr, lab in [(raw, "sin corregir"), (cor, "corregida"), (ion, "ionosfera")]:
    a_.plot(y / 1000, np.nanmedian(arr[:, cols], axis=1), label=lab)
a_.axvline(1150, color="k", ls="--", lw=0.8); a_.axhline(0, color="gray", lw=0.5)
a_.set_xlabel("Norte UTM (km)"); a_.set_ylabel("cm"); a_.legend(); plt.show()

for n, arr in [("sin corregir", raw), ("corregida", cor), ("ionosfera", ion)]:
    print(n, "p2/p50/p98 (cm):", np.round(np.nanpercentile(arr, [2, 50, 98]), 1))

import h5py, glob, numpy as np, matplotlib.pyplot as plt
f = glob.glob("/content/*GUNW*.h5")[0]
G = "science/LSAR/GUNW/grids/frequencyA/"

with h5py.File(f) as h:
    w  = h[G + "wrappedInterferogram/HH/wrappedInterferogram"]
    wx = h[G + "wrappedInterferogram/HH/xCoordinates"][:]
    wy = h[G + "wrappedInterferogram/HH/yCoordinates"][:]
    print("wrapped dtype:", w.dtype, "| pixel (m):", abs(wx[1] - wx[0]))
    xi = np.where((wx > 560000) & (wx < 590000))[0]
    yi = np.where((wy > 1140000) & (wy < 1185000))[0]
    sub = w[yi[0]:yi[-1] + 1:3, xi[0]:xi[-1] + 1:3]
    wext = [wx[xi[0]], wx[xi[-1]], wy[yi[-1]], wy[yi[0]]]

    o = G + "pixelOffsets/"
    ro = h[o + "HH/slantRangeOffset"][:]
    cp = h[o + "HH/correlationSurfacePeak"][:]
    ox = h[o + "xCoordinates"][:]; oy = h[o + "yCoordinates"][:]
    print("slantRangeOffset units:", h[o + "HH/slantRangeOffset"].attrs.get("units"))

ph_w = np.angle(sub) if np.iscomplexobj(sub) else sub
fig, ax = plt.subplots(1, 2, figsize=(16, 7))
ax[0].imshow(ph_w, extent=wext, cmap="twilight", interpolation="nearest")
ax[0].axhline(1161000, color="k", ls="--", lw=0.8)
ax[0].set_title("Fase envuelta (zona del escalon, x 560-590 km)")

ok = np.isfinite(ro) & (ro != 0)
print("offsets validos: %.1f%%" % (100 * ok.mean()))
valid = ok & (cp >= np.nanmedian(cp[ok]))
r = np.where(valid, ro, np.nan)
dxo = abs(ox[1] - ox[0]); half = max(int(3000 / dxo), 1)
i = np.argmin(np.abs(ox - 575000))
prof = np.nanmedian(r[:, i - half:i + half + 1], axis=1)
ax[1].plot(oy / 1000, prof * 100)
ax[1].axvline(1161, color="k", ls="--", lw=0.8)
ax[1].set_xlabel("Norte UTM (km)"); ax[1].set_ylabel("slantRangeOffset (cm)")
ax[1].set_title("Offsets de rango, perfil N-S a x = 575 km")
plt.show()

import h5py, glob, numpy as np, matplotlib.pyplot as plt
f = glob.glob("/content/*GUNW*.h5")[0]
G = "science/LSAR/GUNW/grids/frequencyA/"
k = wl / (4 * np.pi) * 100          # rad -> cm

with h5py.File(f) as h:
    wx = h[G + "wrappedInterferogram/HH/xCoordinates"][:]
    wy = h[G + "wrappedInterferogram/HH/yCoordinates"][:]
    xi = int(np.argmin(np.abs(wx - 575000)))
    rows = np.where((wy > 1145000) & (wy < 1180000))[0]
    r0, r1 = rows.min(), rows.max() + 1
    z = h[G + "wrappedInterferogram/HH/wrappedInterferogram"][r0:r1, xi - 10:xi + 11]
    yy = wy[r0:r1]

if yy[0] > yy[-1]:                  # ordenar de sur a norte
    z = z[::-1]; yy = yy[::-1]

zm = np.nanmean(z, axis=1)          # promedio coherente en ~420 m de ancho
d = np.angle(zm[1:] * np.conj(zm[:-1]))
loc = np.concatenate([[0], np.cumsum(d)]) * k
print("Max gradiente entre pixeles (rad):", np.nanmax(np.abs(d)), "(debe ser < 3.14)")

def med(arr, y0, y1):
    m = (y >= y0) & (y <= y1)
    i = int(np.argmin(np.abs(x - 575000)))
    return np.nanmedian(arr[m][:, i - 40:i + 40])

def medloc(y0, y1):
    m = (yy >= y0) & (yy <= y1)
    return np.nanmedian(loc[m])

a0, a1, b0, b1 = 1153000, 1157000, 1168000, 1172000
print("SALTO local (fase envuelta, 20 m): %.1f cm" % (medloc(b0, b1) - medloc(a0, a1)))
print("SALTO producto (unwrappedPhase sin corregir): %.1f cm" % (med(raw, b0, b1) - med(raw, a0, a1)))

fig, ax = plt.subplots(figsize=(11, 4))
ax.plot(yy / 1000, loc - np.nanmedian(loc), label="desenrollado local 20 m")
i = int(np.argmin(np.abs(x - 575000)))
pr = np.nanmedian(raw[:, i - 40:i + 40], axis=1)
m = (y >= 1145000) & (y <= 1180000)
ax.plot(y[m] / 1000, pr[m] - np.nanmedian(pr[m]), label="producto 80 m")
ax.axvline(1161, color="k", ls="--", lw=0.8); ax.legend(); ax.set_ylabel("cm")
plt.show()

import numpy as np, json, zipfile
from rasterio.warp import reproject, Resampling, calculate_default_transform
from rasterio.transform import from_origin
from matplotlib import cm
from PIL import Image
from pyproj import Transformer
from google.colab import files

dx = abs(x[1] - x[0]); dy = abs(y[1] - y[0])
north_up = y[0] > y[-1]
arr = (cor if north_up else cor[::-1]).astype("float32")
L, B = x.min() - dx / 2, y.min() - dy / 2
R, T = x.max() + dx / 2, y.max() + dy / 2
src_tr = from_origin(L, T, dx, dy)
h_, w_ = arr.shape

dst_tr, dw, dh = calculate_default_transform(
    "EPSG:32619", "EPSG:4326", w_, h_, left=L, bottom=B, right=R, top=T, resolution=0.0025)
dst = np.full((dh, dw), np.nan, dtype="float32")
reproject(arr, dst, src_transform=src_tr, src_crs="EPSG:32619",
          dst_transform=dst_tr, dst_crs="EPSG:4326",
          src_nodata=np.nan, dst_nodata=np.nan, resampling=Resampling.average)

west = dst_tr.c; north = dst_tr.f
east = west + dw * dst_tr.a; south = north + dh * dst_tr.e

LIM = 40.0
rgba = (cm.get_cmap("RdBu_r")((np.clip(dst, -LIM, LIM) + LIM) / (2 * LIM)) * 255).astype("uint8")
rgba[~np.isfinite(dst), 3] = 0
rgba[np.isfinite(dst), 3] = 215
Image.fromarray(rgba).save("/content/desplazamiento.png", optimize=True)

# Perfil N-S a x = 575 km
t_inv = Transformer.from_crs("EPSG:32619", "EPSG:4326", always_xy=True)
i = int(np.argmin(np.abs(x - 575000)))
sl = slice(i - 40, i + 40)
step = 5
yy_ = y[::step]
pc = np.nanmedian(cor[:, sl], axis=1)[::step]
pr = np.nanmedian(raw[:, sl], axis=1)[::step]
lons, lats = t_inv.transform(np.full(len(yy_), x[i]), yy_)
clean = lambda a: [None if not np.isfinite(v) else round(float(v), 2) for v in a]

meta = {
  "bounds": {"west": west, "south": south, "east": east, "north": north},
  "color_limit_cm": LIM,
  "epicenters": [
    {"name": "M7.2 (primero)", "lat": 10.4360, "lon": -68.5277},
    {"name": "M7.5 (principal)", "lat": 10.4009, "lon": -68.3206}],
  "profile": {"lat": clean(lats), "lon": clean(lons),
              "corrected_cm": clean(pc), "uncorrected_cm": clean(pr)},
  "granule": "NISAR_L2_PR_GUNW_022_162_A_007_023_4000_SH_20260613T100656_20260613T100731_20260625T100655_20260625T100730_P05023_N_F_J_001",
  "reference_date": "2026-06-13", "secondary_date": "2026-06-25",
  "wavelength_cm": float(wl * 100), "band": "L", "look": "Left", "pass": "Ascending",
  "coherence_threshold": 0.25, "ionosphere_subtracted": True,
  "jump_cm_product_80m": -38.0, "jump_cm_local_20m": -39.0}
json.dump(meta, open("/content/meta.json", "w"))

with zipfile.ZipFile("/content/app_data.zip", "w") as z:
    z.write("/content/desplazamiento.png", "desplazamiento.png")
    z.write("/content/meta.json", "meta.json")

print("Imagen:", dw, "x", dh, "px")
print("Bounds (lat/lon):", round(south, 3), round(north, 3), round(west, 3), round(east, 3))
import os; print("PNG:", round(os.path.getsize("/content/desplazamiento.png") / 1e6, 2), "MB")
files.download("/content/app_data.zip")