# Talajmechanikai laborok – animációs oktatóvideók

Statikus oldal kilenc animációs videóval a talajmechanikai laborvizsgálatokról; a Vercel közvetlenül a repo gyökeréből szolgálja ki (nincs build).

| # | Videó | Szabvány |
|---|---|---|
| 1 | Szemeloszlási vizsgálat | EN ISO 17892-4 |
| 2 | Folyási határ | EN ISO 17892-12 |
| 3 | Sodrási határ | EN ISO 17892-12 |
| 4 | Zsugorodási határ | Kis Talajmechanika (2026) |
| 5 | Szervesanyag-tartalom | EN 17685-1, EN ISO 14688-2 |
| 6 | Kompressziós vizsgálat | EN ISO 17892-5 |
| 7 | Konszolidációs vizsgálat | EN ISO 17892-5 |
| 8 | Közvetlen nyíróvizsgálat | EN ISO 17892-10 |
| 9 | Triaxiális vizsgálat (UU, CU, CD) | EN ISO 17892-8, -9 |

- `index.html` – nyitóoldal, beágyazott lejátszó
- `videok/` – a videók önálló HTML-ként (three.js, felirat és zene beágyazva)
- `assets/` – poszterképek

## Forrás és újraépítés

A szerkeszthető forrás a `_src/` mappában van (a Vercel nem teszi ki). Egy videó építése:

```
cd _src
node kit/build.mjs videos/tm_szemeloszlas Szemeloszlasi_vizsgalat "Szemeloszlási vizsgálat"
cp videos/tm_szemeloszlas/dist/Szemeloszlasi_vizsgalat.html ../videok/01_Szemeloszlasi_vizsgalat.html
```

- `videos/tm_lab/` – a közös labor (helyiség, laboráns, mérleg, szárítószekrény), a konzisztencia-eszközök, az ödométer és a 2D elemek
- `videos/tm_*/` – egy-egy videó: `timeline.js` (idővonal, adatok), `app.js` (készülék, mozgás, kézfogások), `shots.js` (kamera), `script.js` (feliratok, ábrák)
- `videos/tx_triax/` – a triaxiális videó
- zene: `tools/tm_music.sh <videómappa> <stílus>` (a hangmintakönyvtár szükséges)

## Videók zenéje

Valódi hangszerek felvett mintáiból (indiepop, funk, rezes). Hangminták: Salamander Grand Piano (Alexander Holm, CC BY 3.0); tonejs-instruments (nbrosowsky; VSCO2, Karoryfer, Iowa, Freesound – CC BY 3.0); Tone.js dobminták.
