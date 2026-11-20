# OpenStreetMap の都道府県の境界（admin_level=4・ISO3166-2 が JP-xx）だけを GeoJSON にする。
# 入力：osmium export -f geojsonseq の出力。出力：{"pref": "27", "name": "大阪府"} を持つ面の集まり。
import json, sys
src, dst = sys.argv[1:3]
feats = []
with open(src, encoding="utf-8") as f:
    for line in f:
        line = line.lstrip("\x1e").strip()
        if not line:
            continue
        ft = json.loads(line)
        p = ft.get("properties", {})
        iso = p.get("ISO3166-2", "")
        if p.get("admin_level") == "4" and iso.startswith("JP-") and len(iso) == 5:
            feats.append({"type": "Feature", "properties": {"pref": iso[3:], "name": p.get("name")}, "geometry": ft["geometry"]})
json.dump({"type": "FeatureCollection", "features": feats}, open(dst, "w", encoding="utf-8"), ensure_ascii=False)
print(f"都道府県の境界 {len(feats)} 件")
if len(feats) < 47:
    sys.exit(f"都道府県の境界が足りません（{len(feats)} 件）")
