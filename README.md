# Talajmechanikai laborok – animációs oktatóvideók

Statikus oldal a talajmechanikai laborvizsgálatokról készült animációs videókkal; a Vercel közvetlenül a repo gyökeréből szolgálja ki (nincs build).

- `index.html` – nyitóoldal, a videók beágyazott lejátszóval
- `videok/` – a videók önálló HTML-ként (three.js, felirat és zene beágyazva)
  - `1_Triaxialis_vizsgalat_video.html` – Triaxiális vizsgálat (UU, CU, CD), 4:45
- `assets/` – poszterképek

## Forrás és újraépítés

A szerkeszthető forrás a `_src/` mappában van (a Vercel nem teszi ki):

```
cd _src
node kit/build.mjs videos/tx_triax Triaxialis_vizsgalat "Triaxiális vizsgálat"
cp videos/tx_triax/dist/Triaxialis_vizsgalat.html ../videok/1_Triaxialis_vizsgalat_video.html
```

A zene újrakeverését és az ellenőrző eszközöket a `_src/videos/tx_triax/README.md` írja le.

## Videók zenéje

Valódi hangszerek felvett mintáiból, fejezetenként váltott stílussal (indiepop, funk, rezes). Hangminták: Salamander Grand Piano (Alexander Holm, CC BY 3.0); tonejs-instruments (nbrosowsky; VSCO2, Karoryfer, Iowa, Freesound – CC BY 3.0); Tone.js dobminták.
