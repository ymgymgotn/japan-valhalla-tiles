#!/usr/bin/env bash
# Build Valhalla tiles for Japan from the Geofabrik OpenStreetMap extract.
# Output: out/valhalla_tiles.tar.part-NN (each < 2 GB), out/valhalla_tiles.tar.sha256, out/RELEASE_NOTES.md
set -euo pipefail

PBF_URL="https://download.geofabrik.de/asia/japan-latest.osm.pbf"
ROOT="$(pwd)"
WORK="$ROOT/work"
OUT="$ROOT/out"
mkdir -p "$WORK" "$OUT"
cd "$WORK"

echo "== download $PBF_URL"
curl -fsSL -o japan-latest.osm.pbf "$PBF_URL"
curl -fsSL -o japan-latest.osm.pbf.md5 "$PBF_URL.md5"
md5sum -c japan-latest.osm.pbf.md5
DATA_TS="$(osmium fileinfo -g header.option.osmosis_replication_timestamp japan-latest.osm.pbf || true)"
echo "data timestamp: ${DATA_TS:-unknown}"

echo "== filter: roads and ferries only (routing graph)"
osmium tags-filter japan-latest.osm.pbf w/highway w/route=ferry r/route=ferry -o roads.osm.pbf --overwrite

echo "== config"
valhalla_build_config \
  --mjolnir-tile-dir "$WORK/tiles" \
  --mjolnir-tile-extract "$WORK/valhalla_tiles.tar" \
  --mjolnir-admin "$WORK/admins.sqlite" \
  --mjolnir-concurrency "$(nproc)" > valhalla.json

echo "== admins (country/region rules such as driving on the left) from the full extract"
valhalla_build_admins -c valhalla.json japan-latest.osm.pbf
rm -f japan-latest.osm.pbf

echo "== tiles"
valhalla_build_tiles -c valhalla.json roads.osm.pbf
rm -f roads.osm.pbf

echo "== tar extract"
valhalla_build_extract -c valhalla.json -v
rm -rf "$WORK/tiles"
ls -la "$WORK/valhalla_tiles.tar"

echo "== split and checksum"
(cd "$WORK" && sha256sum valhalla_tiles.tar > "$OUT/valhalla_tiles.tar.sha256")
split -b 1900m -d -a 2 "$WORK/valhalla_tiles.tar" "$OUT/valhalla_tiles.tar.part-"
rm -f "$WORK/valhalla_tiles.tar"

VALHALLA_VERSION="$(python -c 'import valhalla; print(valhalla.__version__)')"
cat > "$OUT/RELEASE_NOTES.md" <<NOTES
Valhalla tiles for Japan.

- OpenStreetMap data timestamp: ${DATA_TS:-unknown}
- Source: ${PBF_URL} (processed by Geofabrik GmbH)
- Built with pyvalhalla ${VALHALLA_VERSION}
- Graph: highways and ferries; admin boundaries from the full extract

Rebuild: \`cat valhalla_tiles.tar.part-* > valhalla_tiles.tar && sha256sum -c valhalla_tiles.tar.sha256\`

Data © OpenStreetMap contributors, Open Database License (ODbL) 1.0: https://opendatacommons.org/licenses/odbl/1-0/
NOTES
ls -la "$OUT"
