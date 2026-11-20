# 道路だけの OSM データに、各 way の「県」（mp:pref＝2桁）と「人口集中地区の中か」（mp:did＝1/0）の印を足して書き出す。
# 判定は way の真ん中の点（節点の真ん中）。node と relation はそのまま通す。
import json, sys, time
import osmium
from shapely.geometry import shape, Point
from shapely.strtree import STRtree
from shapely.prepared import prep

src, dst, prefs_path, did_path = sys.argv[1:5]

def load(path, key):
    feats = json.load(open(path, encoding="utf-8"))["features"]
    geoms = [shape(f["geometry"]) for f in feats]
    return geoms, [f["properties"].get(key) for f in feats]

pref_geoms, pref_codes = load(prefs_path, "pref")
did_geoms, _ = load(did_path, "pref")
pref_tree, did_tree = STRtree(pref_geoms), STRtree(did_geoms)
pref_prep = [prep(g) for g in pref_geoms]
did_prep = [prep(g) for g in did_geoms]

def pref_of(pt):
    for i in pref_tree.query(pt):
        if pref_prep[i].contains(pt):
            return pref_codes[i]
    return None

def in_did(pt):
    return any(did_prep[i].contains(pt) for i in did_tree.query(pt))

class H(osmium.SimpleHandler):
    def __init__(self, w):
        super().__init__(); self.w = w; self.n = 0; self.tagged = 0; self.did = 0
    def node(self, n): self.w.add_node(n)
    def relation(self, r): self.w.add_relation(r)
    def way(self, w):
        self.n += 1
        tags = {t.k: t.v for t in w.tags}
        if "highway" in tags and len(w.nodes) > 0:
            loc = w.nodes[len(w.nodes) // 2].location
            if loc.valid():
                pt = Point(loc.lon, loc.lat)
                p = pref_of(pt)
                if p: tags["mp:pref"] = p
                d = in_did(pt)
                tags["mp:did"] = "1" if d else "0"
                self.tagged += 1; self.did += d
        self.w.add_way(w.replace(tags=tags))

t0 = time.time()
writer = osmium.SimpleWriter(dst, overwrite=True)
h = H(writer)
h.apply_file(src, locations=True)
writer.close()
print(f"way {h.n:,} 本／印を付けた {h.tagged:,} 本／うち人口集中地区 {h.did:,} 本／{time.time()-t0:.0f}秒")
