# japan-valhalla-tiles

Routing tiles for [Valhalla](https://github.com/valhalla/valhalla), covering Japan, built from OpenStreetMap data.

日本全体の [Valhalla](https://github.com/valhalla/valhalla)（経路検索・到達圏の計算エンジン）用の道路データです。OpenStreetMap のデータから作っています。

## Contents / 中身

- `build.sh` — the build steps (download → filter → admins → tiles → tar extract)
- `.github/workflows/build.yml` — runs `build.sh` on GitHub Actions and publishes the result as a Release
- **Releases** — `valhalla_tiles.tar` split into parts below 2 GB, with a SHA-256 checksum and build notes

Rebuild the tar from the parts and check it:

```sh
cat valhalla_tiles.tar.part-* > valhalla_tiles.tar
sha256sum -c valhalla_tiles.tar.sha256
```

The tiles are built with `pyvalhalla` (version noted in each Release). Read them with the same Valhalla version.

## License / ライセンス

- **Data (Releases)**: © OpenStreetMap contributors. Available under the [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Source extract processed by [Geofabrik GmbH](https://download.geofabrik.de/asia/japan.html). The tiles are an adapted database of OpenStreetMap and are offered under the same license.
- **Scripts (`build.sh`, workflow)**: MIT License (see `LICENSE`).
- **Valhalla**: MIT License, © Valhalla contributors. This repository does not redistribute the Valhalla software.

データ（Releases）は © OpenStreetMap contributors、ライセンスは ODbL 1.0 です。OpenStreetMap を加工したデータなので、同じライセンスで提供しています。
