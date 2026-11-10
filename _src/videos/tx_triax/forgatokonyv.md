# Talajmechanikai laborok – forgatókönyvek

Sorozat: animációs oktatóvideók a talajmechanikai laborvizsgálatokról (three.js 3D + feliratok + saját, hangmintás zene).
Közös stílus: lila kiemelőszín, „Talajmechanikai laborok” címkártya, modern automata laborgépek, a gépeket ember kezeli.

---

## 1. rész – Triaxiális vizsgálat (UU, CU, CD)

- Fájl: `Triaxialis_vizsgalat.html` (egyetlen önálló HTML, zenével)
- Hossz: 4:46 (130 ütem, 110 BPM)
- Zene: indiepop → funk (CU) → brassy (CD) → indiepop (összevetés) → funk (zárás), élő hangmintákból
- Színkód: UU narancs, CU türkiz, CD sárga, víz kék
- Szabványi háttér: MSZ EN ISO 17892-8 (UU), MSZ EN ISO 17892-9 (CU, CD), MSZ EN ISO 22475-1 (mintavétel); összevetésre ASTM D2850 / D4767 / D7181, BS 1377, Head: Manual of Soil Laboratory Testing

### Jelenetek

| Idő | Ütem | Fejezet | Tartalom |
|---|---|---|---|
| 0:00 | 0–4 | Hideg nyitás | Közeli: a minta nyírási síkon eltörik a cellában. „Mennyit bír a talaj? Addig nyomjuk, amíg el nem törik” |
| 0:09 | 4–8 | Cím | Triaxiális vizsgálat – A mintától a nyírószilárdságig |
| 0:17 | 8–22 | 1. Mintavétel | Fúrókocsi, üreges csőspirál; a fúrólyuk aljáról vékonyfalú cső (Ø 76 mm, felületi arány ≤ 15 %) ütés nélkül, egyenletesen benyomva 3,75 m-ről; metszeti nézet az agyagban; „A” kategória → 1. osztályú minta; paraffin, kupak, címke, állítva szállítva |
| 0:48 | 22–36 | 2. Próbatest | Hidraulikus kitoló (a behatolás irányában); talajesztergán Ø 50 × 100 mm (H = 2D); mérleg 382,9 g, w = 28,4 %; beépítés: szűrőkő, szűrőpapír, minta, fejlemez, gumimembrán membránfeszítővel, két-két O-gyűrű |
| 1:18 | 36–44 | 3. Berendezés | Akrilcella, légtelenített víz; terhelőkeret, erőmérő, cella- és ellennyomás-szabályozó, számítógép |
| 1:36 | 44–48 | A két betű | 1. betű: konszolidáció (nincs / van), 2. betű: nyírás közben drénezetlen / drénezett → UU, CU, CD |
| 1:45 | 48–66 | UU | Zárt szelepek, cellanyomás; nyírás kb. 1 %/perc; törés q_max-nál vagy 15 %-nál, hordósodás; 3 próbatest (σ_c = 100/200/300 kPa): azonos körök → c_u ≈ 55 kPa, φ_u = 0; rugós modell: a többletet a pórusvíz veszi fel |
| 2:24 | 66–92 | CU | Vizes szűrőkövek, oldalsó drénsávok; telítés ellennyomással, B-érték 0,62 → 0,81 → 0,91 → 0,97; konszolidáció (t_100 = 60 perc); zárt szelepes, lassú nyírás pórusvíznyomás-méréssel; σ′ = σ − u, a körök Δu-val balra tolódnak; hatékony feszültségút; c′ = 5 kPa, φ′ = 27° |
| 3:21 | 92–112 | CD | Telítés és konszolidáció mint CU-nál; nyitott szelep, nagyon lassú nyírás, Δu ≈ 0; NC agyag térfogata csökken; ugyanaz a c′ és φ′; egy CD-próbatest napokig, akár hetekig tart |
| 4:04 | 112–122 | Összevetés | Időtartam-sávok (UU kb. fél óra, CU 2–3 nap, CD 4–7 nap); UU → rövid távú, drénezetlen (pl. töltés építése közben); CU · CD → hosszú távú, drénezett (pl. rézsű évek múlva) |
| 4:26 | 122–126 | Összegzés | UU: c_u, gyors · CU: c′, φ′ + Δu mérés · CD: c′, φ′, lassú · Legalább 3 próbatest |
| 4:35 | 126–130 | Zárás | TRIAXIÁLIS – egy minta, három út. „Következik: közvetlen nyíróvizsgálat” |

### Mintapélda (normálisan konszolidált agyag)

| Vizsgálat | σ_c vagy σ′_c [kPa] | q_f [kPa] | Egyéb |
|---|---|---|---|
| UU | 100 / 200 / 300 | 108 / 112 / 110 | c_u ≈ 55 kPa, φ_u = 0 |
| CU | 100 / 200 / 300 | 76 / 145 / 214 | Δu ≈ 64 / 123 / 181 kPa, A_f = 0,85 |
| CD | 100 / 200 / 300 | 183 / 349 / 515 | térfogatcsökkenés |

Hatékony nyírószilárdság: c′ = 5 kPa, φ′ = 27°. Talaj: w = 28,4 %, ρ = 1,95 g/cm³.
Nyírási idők a példában: UU ≈ 15 perc, CU ≈ 4,3 óra, CD ≈ 21 óra.

### Feltételezések, módosítható pontok

- A „Következik” sor (közvetlen nyíróvizsgálat) a sorozat következő részére tett javaslat.
- A számértékek szemléltető mintapélda, nem valódi mérés.

### Hangminták

Salamander Grand Piano (CC BY 3.0), tonejs-instruments (CC BY 3.0), Tone.js dobminták.
