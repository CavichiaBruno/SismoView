# -*- coding: utf-8 -*-
"""Download and prepare UCSD LOS deformation and fault map layers."""

import urllib.request, tarfile, os, glob
import numpy as np, pandas as pd
import matplotlib.pyplot as plt

BASE = "https://topex.ucsd.edu/VNZ_7.5/web/los_files/sat_look_disp_NSR_{}_500m_mask_clean.tar.gz"

def descargar(track):
    tgz = f"{track}.tar.gz"
    if not os.path.exists(tgz):
        urllib.request.urlretrieve(BASE.format(track), tgz)
    os.makedirs(track, exist_ok=True)
    with tarfile.open(tgz) as t:
        t.extractall(track)
    archivos = [f for f in glob.glob(f"{track}/**/*", recursive=True) if os.path.isfile(f)]
    print(track, "->", archivos)
    return archivos[0]

def cargar(path, paso=0.005):
    # columnas: lon lat look_E look_N look_U desplazamiento_mm
    a = np.loadtxt(path, comments="#")
    df = pd.DataFrame(a[:, :6], columns=["lon", "lat", "le", "ln", "lu", "d"])
    df["lon"] = (df.lon / paso).round() * paso
    df["lat"] = (df.lat / paso).round() * paso
    return df.groupby(["lon", "lat"]).mean().reset_index()

def mapa(df, col, titulo, cmap="RdBu_r"):
    g = df.pivot(index="lat", columns="lon", values=col)
    v = np.nanpercentile(np.abs(g.values), 98)
    plt.figure(figsize=(9, 6))
    plt.pcolormesh(g.columns, g.index, g.values, cmap=cmap, vmin=-v, vmax=v, shading="auto")
    plt.colorbar(label="mm"); plt.title(titulo)
    plt.xlabel("lon"); plt.ylabel("lat"); plt.show()

# 1) Descendente T54D
desc = cargar(descargar("T54D"))
print(desc.describe())
mapa(desc, "d", "T54D - LOS (mm)")

# 2) Ascendente T162A (si el nombre del archivo existe)
try:
    asc = cargar(descargar("T162A"))
    m = asc.merge(desc, on=["lon", "lat"], suffixes=("_a", "_d")).dropna()

    # Sistema 2x2 por pixel (norte = 0): d_los = le*E + lu*U
    det = m.le_a * m.lu_d - m.lu_a * m.le_d
    ok = np.abs(det) > 0.1
    m = m[ok].copy(); det = det[ok]
    m["E"] = (m.d_a * m.lu_d - m.lu_a * m.d_d) / det
    m["U"] = (m.le_a * m.d_d - m.d_a * m.le_d) / det

    mapa(m, "E", "Este-oeste (mm)  (+ = este)")
    mapa(m, "U", "Vertical (mm)  (+ = arriba)")
    m[["lon", "lat", "E", "U"]].to_csv("E_U_nisar.csv", index=False)
except Exception as e:
    print("No pude bajar/usar T162A:", e)

import os, tarfile, glob, json, zipfile, requests
import numpy as np, pandas as pd
import matplotlib.pyplot as plt, matplotlib as mpl

URL = "https://topex.ucsd.edu/VNZ_7.5/web/los_files/sat_look_disp_NSR_{}_500m_mask_clean.tar.gz"
PASO = 0.005

def archivo(track):
    # si la carpeta ya existe con archivos, se reutiliza
    if os.path.isdir(track):
        fs = [f for f in glob.glob(f"{track}/**/*", recursive=True) if os.path.isfile(f)]
        if fs:
            print(track, "-> ya existe, reutilizo")
            return fs[0]
    tgz = f"{track}.tar.gz"
    r = requests.get(URL.format(track), stream=True, headers={"User-Agent": "Mozilla/5.0"})
    esperado = int(r.headers.get("Content-Length", 0))
    with open(tgz, "wb") as f:
        for c in r.iter_content(1 << 20):
            f.write(c)
    real = os.path.getsize(tgz)
    print(track, "| esperado:", esperado, "| bajado:", real)
    assert esperado == 0 or esperado == real, f"{track}: descarga incompleta, repite la celda"
    os.makedirs(track, exist_ok=True)
    with tarfile.open(tgz) as t:
        try: t.extractall(track, filter="data")
        except TypeError: t.extractall(track)
    return [f for f in glob.glob(f"{track}/**/*", recursive=True) if os.path.isfile(f)][0]

def cargar(path):
    a = np.loadtxt(path, comments="#")
    df = pd.DataFrame(a[:, :6], columns=["lon", "lat", "le", "ln", "lu", "d"])
    df["ix"] = (df.lon / PASO).round().astype(int)
    df["iy"] = (df.lat / PASO).round().astype(int)
    return df.groupby(["ix", "iy"])[["le", "ln", "lu", "d"]].mean().reset_index()

def mosaico(tracks):
    dfs = [cargar(archivo(t)) for t in tracks]
    for t, d in zip(tracks, dfs):
        print(t, "lon", round(d.ix.min()*PASO, 2), "a", round(d.ix.max()*PASO, 2))
    return pd.concat(dfs).groupby(["ix", "iy"]).mean().reset_index()

asc = mosaico(["T162A", "T61A"])
desc = mosaico(["T54D", "T126D"])

m = asc.merge(desc, on=["ix", "iy"], suffixes=("_a", "_d")).dropna()
det = m.le_a * m.lu_d - m.lu_a * m.le_d
ok = np.abs(det) > 0.1
m = m[ok].copy(); det = det[ok]
m["E"] = (m.d_a * m.lu_d - m.lu_a * m.d_d) / det
m["U"] = (m.le_a * m.d_d - m.d_a * m.le_d) / det
print("puntos E/U:", len(m), "| lon", round(m.ix.min()*PASO, 2), "a", round(m.ix.max()*PASO, 2))

def grid(df, col):
    g = df.pivot(index="iy", columns="ix", values=col)
    g = g.reindex(index=np.arange(g.index.min(), g.index.max() + 1),
                  columns=np.arange(g.columns.min(), g.columns.max() + 1))
    return g.sort_index(ascending=False)

def exportar(df, col, nombre, cmap="RdBu_r"):
    g = grid(df, col)
    v = float(np.nanpercentile(np.abs(g.values), 98))
    rgba = mpl.colormaps[cmap](mpl.colors.Normalize(-v, v)(g.values))
    rgba[np.isnan(g.values), 3] = 0
    plt.imsave(f"{nombre}.png", rgba)
    b = {"sur": float(g.index.min()*PASO - PASO/2), "norte": float(g.index.max()*PASO + PASO/2),
         "oeste": float(g.columns.min()*PASO - PASO/2), "este": float(g.columns.max()*PASO + PASO/2),
         "min_mm": -v, "max_mm": v}
    json.dump(b, open(f"{nombre}.json", "w"))
    plt.figure(figsize=(9, 5)); plt.imshow(rgba); plt.title(nombre); plt.axis("off"); plt.show()
    print(nombre, b)

nombres = ["este_oeste_completo", "vertical_completo", "los_asc_mosaico", "los_desc_mosaico"]
exportar(m, "E", nombres[0]); exportar(m, "U", nombres[1])
exportar(asc, "d", nombres[2]); exportar(desc, "d", nombres[3])

with zipfile.ZipFile("capas_completas.zip", "w") as z:
    for n in nombres:
        z.write(n + ".png"); z.write(n + ".json")
from google.colab import files
files.download("capas_completas.zip")

import os, zipfile, json, requests
import xml.etree.ElementTree as ET

K = "https://topex.ucsd.edu/VNZ_7.5/web/kmz/{}"
archivos = {"yphase_t162_f7_lines.kmz": "lineas", "yphase_mask_ll_T162A.kmz": "gradiente"}

def bajar(nombre):
    r = requests.get(K.format(nombre), headers={"User-Agent": "Mozilla/5.0"})
    r.raise_for_status()
    open(nombre, "wb").write(r.content)
    d = nombre.replace(".kmz", "")
    zipfile.ZipFile(nombre).extractall(d)
    print(nombre, "->", os.listdir(d))
    return d

def tag(e): return e.tag.split("}")[-1]

def kml_de(d):
    return next(os.path.join(d, f) for f in os.listdir(d) if f.endswith(".kml"))

# 1) Líneas de falla -> GeoJSON
d = bajar("yphase_t162_f7_lines.kmz")
feats = []
for pm in ET.parse(kml_de(d)).getroot().iter():
    if tag(pm) != "Placemark": continue
    nombre = next((e.text for e in pm if tag(e) == "name"), "")
    for ls in pm.iter():
        if tag(ls) == "LineString":
            txt = next(e.text for e in ls if tag(e) == "coordinates")
            pts = [[float(v) for v in p.split(",")[:2]] for p in txt.split()]
            feats.append({"type": "Feature", "properties": {"name": nombre},
                          "geometry": {"type": "LineString", "coordinates": pts}})
json.dump({"type": "FeatureCollection", "features": feats}, open("falla_traza.geojson", "w"))
print("líneas:", len(feats))

# 2) Gradiente de fase -> PNG + límites
d2 = bajar("yphase_mask_ll_T162A.kmz")
for e in ET.parse(kml_de(d2)).getroot().iter():
    if tag(e) == "GroundOverlay":
        href = next(x.text for x in e.iter() if tag(x) == "href")
        box = {tag(x): float(x.text) for x in next(y for y in e.iter() if tag(y) == "LatLonBox")
               if tag(x) in ("north", "south", "east", "west")}
        os.replace(os.path.join(d2, href), "gradiente_fase.png")
        json.dump({"sur": box["south"], "norte": box["north"],
                   "oeste": box["west"], "este": box["east"]}, open("gradiente_fase.json", "w"))
        print("gradiente:", box)

with zipfile.ZipFile("fallas.zip", "w") as z:
    for f in ["falla_traza.geojson", "gradiente_fase.png", "gradiente_fase.json"]:
        z.write(f)
from google.colab import files
files.download("fallas.zip")

import os, zipfile, json, requests
import xml.etree.ElementTree as ET

K = "https://topex.ucsd.edu/VNZ_7.5/web/kmz/{}"
def tag(e): return e.tag.split("}")[-1]

def bajar(nombre):
    r = requests.get(K.format(nombre), headers={"User-Agent": "Mozilla/5.0"})
    r.raise_for_status()
    open(nombre, "wb").write(r.content)
    d = nombre.replace(".kmz", "")
    zipfile.ZipFile(nombre).extractall(d)
    return next(os.path.join(d, f) for f in os.listdir(d) if f.endswith(".kml")), d

def lineas(nombre, etiqueta):
    kml, _ = bajar(nombre)
    feats = []
    for pm in ET.parse(kml).getroot().iter():
        if tag(pm) != "Placemark": continue
        for ls in pm.iter():
            if tag(ls) == "LineString":
                txt = next(e.text for e in ls if tag(e) == "coordinates")
                pts = [[float(v) for v in p.split(",")[:2]] for p in txt.split()]
                feats.append({"type": "Feature", "properties": {"fuente": etiqueta},
                              "geometry": {"type": "LineString", "coordinates": pts}})
    return feats

feats = []
feats += lineas("yphase_t162_f7_lines.kmz", "T162A azimuth")
feats += lineas("xphase_t54_f83_lines.kmz", "T54D range")
feats += lineas("yphase_t54_f83_lines.kmz", "T54D azimuth")
json.dump({"type": "FeatureCollection", "features": feats}, open("fallas_todas.geojson", "w"))
print("líneas totales:", len(feats))

def gradiente(nombre, salida):
    kml, d = bajar(nombre)
    for e in ET.parse(kml).getroot().iter():
        if tag(e) == "GroundOverlay":
            href = next(x.text for x in e.iter() if tag(x) == "href")
            box = {tag(x): float(x.text) for x in next(y for y in e.iter() if tag(y) == "LatLonBox")
                   if tag(x) in ("north", "south", "east", "west")}
            os.replace(os.path.join(d, href), f"{salida}.png")
            json.dump({"sur": box["south"], "norte": box["north"],
                       "oeste": box["west"], "este": box["east"]}, open(f"{salida}.json", "w"))
            print(salida, box)

gradiente("yphase_mask_ll_T162A.kmz", "gradiente_T162A")
gradiente("yphase_mask_ll_T54D.kmz", "gradiente_T54D")

with zipfile.ZipFile("fallas_completo.zip", "w") as z:
    for f in ["fallas_todas.geojson", "gradiente_T162A.png", "gradiente_T162A.json",
              "gradiente_T54D.png", "gradiente_T54D.json"]:
        z.write(f)
from google.colab import files
files.download("fallas_completo.zip")

import json, numpy as np
import matplotlib.pyplot as plt

gj = json.load(open("fallas_todas.geojson"))
LON0, LON1, LAT0, LAT1 = -68.60, -68.15, 10.40, 10.60   # zona de Bocono
ANG_MIN, ANG_MAX, LARGO_MIN = 0, 30, 0.3                # rumbo ENE, largo en km

todos, buenos = [], []
for f in gj["features"]:
    p = np.array(f["geometry"]["coordinates"])
    ok = (p[:,0]>=LON0)&(p[:,0]<=LON1)&(p[:,1]>=LAT0)&(p[:,1]<=LAT1)
    if ok.sum() < 2: continue
    p = p[ok]; todos.append(p)
    dx = (p[-1,0]-p[0,0])*np.cos(np.radians(10.5)); dy = p[-1,1]-p[0,1]
    ang = np.degrees(np.arctan2(dy, dx)) % 180
    largo = np.hypot(dx, dy)*111
    if ((ang<=ANG_MAX) or (ang>=180-5)) and largo >= LARGO_MIN:
        buenos.append(p)

pts = np.vstack(buenos)
print("segmentos en la zona:", len(todos), "| conservados:", len(buenos))

# ajuste robusto: lat = f(lon), grado 2, descartando puntos lejanos
x, y = pts[:,0], pts[:,1]
m = np.ones(len(x), bool)
for _ in range(5):
    c = np.polyfit(x[m], y[m], 2)
    r = y - np.polyval(c, x)
    m = np.abs(r) < max(2*np.std(r[m]), 0.003)   # ~300 m
xs = np.linspace(x[m].min(), x[m].max(), 200)
linea = np.column_stack([xs, np.polyval(c, xs)])
print("puntos usados:", m.sum(), "de", len(x), "| lon", round(xs.min(),3), "a", round(xs.max(),3))

json.dump({"type":"FeatureCollection","features":[{"type":"Feature",
  "properties":{"name":"Traza de ruptura interpretada (Bocono)"},
  "geometry":{"type":"LineString","coordinates":linea.tolist()}}]},
  open("ruptura_bocono.geojson","w"))

# verificación visual
plt.figure(figsize=(11,5))
for p in todos: plt.plot(p[:,0], p[:,1], color="lightgray", lw=.8)
for p in buenos: plt.plot(p[:,0], p[:,1], color="red", lw=1)
plt.plot(linea[:,0], linea[:,1], color="gold", lw=2.5)
plt.gca().set_aspect(1/np.cos(np.radians(10.5)))
plt.title("gris: todas | rojo: conservadas | amarillo: línea final"); plt.show()

from google.colab import files
files.download("ruptura_bocono.geojson")



import json
import matplotlib as mpl

def exportar(m, col, nombre, paso=0.005, cmap="RdBu_r"):
    g = m.pivot(index="lat", columns="lon", values=col).sort_index(ascending=False)  # norte arriba
    v = np.nanpercentile(np.abs(g.values), 98)
    norm = mpl.colors.Normalize(-v, v)
    rgba = mpl.colormaps[cmap](norm(g.values))
    rgba[np.isnan(g.values), 3] = 0          # sin datos = transparente
    plt.imsave(f"{nombre}.png", rgba)
    b = {"sur": float(g.index.min() - paso/2), "norte": float(g.index.max() + paso/2),
         "oeste": float(g.columns.min() - paso/2), "este": float(g.columns.max() + paso/2),
         "min_mm": float(-v), "max_mm": float(v)}
    json.dump(b, open(f"{nombre}.json", "w"))
    print(nombre, b)

exportar(m, "E", "este_oeste")
exportar(m, "U", "vertical")

from google.colab import files
for f in ["este_oeste.png", "este_oeste.json", "vertical.png", "vertical.json"]:
    files.download(f)

import os, zipfile
from google.colab import files

print([f for f in os.listdir() if f.endswith((".png", ".json"))])

with zipfile.ZipFile("capas.zip", "w") as z:
    for f in ["este_oeste.png", "este_oeste.json", "vertical.png", "vertical.json"]:
        z.write(f)

files.download("capas.zip")