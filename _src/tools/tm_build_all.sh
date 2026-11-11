#!/bin/bash
cd /home/claude/work
node kit/build.mjs videos/tm_szemeloszlas Szemeloszlasi_vizsgalat "Szemeloszlási vizsgálat" | tail -1
node kit/build.mjs videos/tm_folyasi Folyasi_hatar "Folyási határ" | tail -1
node kit/build.mjs videos/tm_sodrasi Sodrasi_hatar "Sodrási határ" | tail -1
node kit/build.mjs videos/tm_zsugorodasi Zsugorodasi_hatar "Zsugorodási határ" | tail -1
node kit/build.mjs videos/tm_szerves Szervesanyag_tartalom "Szervesanyag-tartalom" | tail -1
node kit/build.mjs videos/tm_kompresszio Kompresszios_vizsgalat "Kompressziós vizsgálat" | tail -1
node kit/build.mjs videos/tm_konszolidacio Konszolidacios_vizsgalat "Konszolidációs vizsgálat" | tail -1
node kit/build.mjs videos/tm_nyiras Kozvetlen_nyirovizsgalat "Közvetlen nyíróvizsgálat" | tail -1
node kit/build.mjs videos/tx_triax Triaxialis_vizsgalat "Triaxiális vizsgálat" | tail -1
