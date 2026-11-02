#!/usr/bin/env python3
"""Validación de consistencia de la documentación 08-blueprint-ux (solo lectura)."""
import re, sys, pathlib

base = pathlib.Path(sys.argv[1])
docs = sorted(p for p in base.glob("*.md"))
text = {p.name: p.read_text(encoding="utf8") for p in docs}
problemas = []
# El documento 13 enumera las búsquedas prohibidas para describir la validación; se excluye de los checks 6, 7 y 8.
AUTODESCRIPTIVO = {"13-validacion-final-y-limitaciones.md"}

def err(msg): problemas.append(msg)

# 1. Identificadores definidos en 01
reg = text["01-filosofia-y-decisiones.md"]
def_dr = set(re.findall(r"^\| \**(DR-\d+)\**\s*\|", reg, re.M))
def_pd = set(re.findall(r"^\| (PD-\d+) \|", reg, re.M))
def_h = set(re.findall(r"^\| (H-\d+) \|", reg, re.M))
print(f"Definidos: DR={len(def_dr)} PD={len(def_pd)} H={len(def_h)}")

# Estados de DR
estados = {}
for m in re.finditer(r"^\| \**(DR-\d+)\**\s*\|\s*(\**[A-Z]\**)\s*\|", reg, re.M):
    estados[m.group(1)] = m.group(2).strip("*")
n_nuevas = len(re.findall(r"^\| \*\*DR-(3[1-9]|4\d)\*\* \|", reg, re.M))
cnt = {}
for k, v in estados.items(): cnt[v] = cnt.get(v, 0) + 1
print("Estados DR heredados:", cnt, "| nuevas (N):", n_nuevas)

# 2. Referencias a identificadores
for name, t in text.items():
    for tag, defs in (("DR", def_dr), ("PD", def_pd), ("H", def_h)):
        for ref in set(re.findall(rf"\b{tag}-\d+\b", t)):
            if ref not in defs:
                err(f"{name}: referencia a {ref} sin definición en 01")
    # rangos «DR-13 a DR-15» ya cubiertos por cada extremo

# 3. Secciones citadas «`NN` §X»
def secciones(t):
    s = set()
    for m in re.finditer(r"^#{2,3}\s+(\d+(?:\.\d+)?)[\.\s]", t, re.M): s.add(m.group(1))
    return s
sec = {n[:2]: secciones(t) for n, t in text.items() if re.match(r"\d\d-", n)}
for name, t in text.items():
    for m in re.finditer(r"`(\d\d)`\s*§(\d+(?:\.\d+)?)", t):
        doc, s = m.group(1), m.group(2)
        if doc not in sec: err(f"{name}: cita documento `{doc}` inexistente")
        elif s not in sec[doc] and s.split(".")[0] not in sec[doc]:
            err(f"{name}: cita `{doc}` §{s} pero ese documento no tiene esa sección")

# 4. Enlaces relativos
for name, t in text.items():
    for m in re.finditer(r"\]\(([^)#]+\.md)(#[^)]*)?\)", t):
        tgt = (base / m.group(1)).resolve()
        if not tgt.exists(): err(f"{name}: enlace roto a {m.group(1)}")

# 5. Tablas: mismo número de columnas por tabla
for name, t in text.items():
    lines = t.split("\n"); i = 0
    while i < len(lines):
        if lines[i].startswith("|") and i + 1 < len(lines) and re.match(r"^\|[\s:\-|]+\|\s*$", lines[i + 1]):
            def ncols(l): return len(re.split(r"(?<!\\)\|", l.strip().strip("|")))
            n = ncols(lines[i]); j = i + 2
            while j < len(lines) and lines[j].startswith("|"):
                # ignorar pipes dentro de `code`
                l = re.sub(r"`[^`]*`", lambda m: m.group(0).replace("|", "¦"), lines[j])
                if ncols(l) != n: err(f"{name}: línea {j+1}: {ncols(l)} columnas (esperadas {n})")
                j += 1
            i = j
        else: i += 1

# 6. Contenido fuera de alcance (restaurante / industria) en documentos nuevos
prohibidas = ["comanda", "cocina", "mesero", "recetas", "QR de mesa", "plano de mesas", "pedidos QR"]
for name, t in text.items():
    if name in AUTODESCRIPTIVO: continue
    for w in prohibidas:
        for m in re.finditer(re.escape(w), t, re.I):
            ctx = t[max(0, m.start() - 70): m.end() + 70].replace("\n", " ")
            print(f"[ALCANCE] {name}: «{w}» → …{ctx}…")

# 7. Cifras que deben ser consistentes
for name, t in text.items():
    if name in AUTODESCRIPTIVO: continue
    for bad in ["24 capacidades", "24 módulos", "cuatro pantallas escriben", "23 comprueban"]:
        for m in re.finditer(re.escape(bad), t):
            # se permite citarla como afirmación previa corregida: «24 capacidades»
            if t[max(0, m.start() - 1):m.start()] != "«":
                err(f"{name}: cifra obsoleta «{bad}»")

# 8. Marcadores sin resolver
for name, t in text.items():
    if name in AUTODESCRIPTIVO: continue
    for bad in ["{{", "TODO", "XXX", "FIXME"]:
        if bad in t: err(f"{name}: marcador sin resolver «{bad}»")

# 9. Decisiones heredadas: el estado coincide con el blueprint v3 (A→A, R→D) y no cambió su número
hist = base / "historico" / "blueprint-v3-base.md"
if hist.exists():
    v3 = hist.read_text(encoding="utf8")
    previas = {m.group(1): m.group(2) for m in re.finditer(r"^\| \*\*(DR-\d+)\*\* \[([AR])\]", v3, re.M)}
    print(f"Decisiones en v3: {len(previas)}")
    for k, v in previas.items():
        esperado = "A" if v == "A" else "D"
        if estados.get(k) != esperado:
            err(f"01: {k} tenía [{v}] en v3 y figura como {estados.get(k)} (esperado {esperado})")
    for k in previas:
        if k not in def_dr: err(f"01: falta {k} heredada de v3")
else:
    err("falta historico/blueprint-v3-base.md")

print(f"\nDocumentos: {len(text)} · líneas: {sum(len(t.splitlines()) for t in text.values())}")
if problemas:
    print(f"\nPROBLEMAS ({len(problemas)}):")
    for p in problemas: print(" -", p)
    sys.exit(1)
print("\nSin problemas de consistencia.")
