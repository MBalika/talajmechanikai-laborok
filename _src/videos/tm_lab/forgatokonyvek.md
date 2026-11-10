# Talajmechanikai laborok – forgatókönyvek

Animációs oktatóvideó-sorozat a talajmechanikai laborvizsgálatokról (three.js 3D + feliratok + hangmintás zene), az Eurocode 7 (EN 1997-2) által hivatkozott EN ISO szabványok és a Kis Talajmechanika (2026) szerint.
Közös labor: laborasztal, szárítószekrény (105 °C), mérleg, számítógép, laboráns kék nitrilkesztyűben; minden lépést a laboráns keze végez.
Weboldal: GitHub MBalika/talajmechanikai-laborok → Vercel. A számértékek szemléltető mintapéldák.

| # | Videó | Szabvány | Hossz |
|---|---|---|---|
| 1 | Szemeloszlási vizsgálat | EN ISO 17892-4 | 2:21 |
| 2 | Folyási határ | EN ISO 17892-12 | 1:55 |
| 3 | Sodrási (plasztikus) határ | EN ISO 17892-12 | 1:38 |
| 4 | Zsugorodási határ | Kis Talajmechanika 2.6 | 1:38 |
| 5 | Szervesanyag-tartalom | EN 17685-1 (izzítási veszteség), EN ISO 14688-2 | 1:38 |
| 6 | Kompressziós vizsgálat | EN ISO 17892-5 | 2:04 |
| 7 | Konszolidációs vizsgálat | EN ISO 17892-5 | 1:46 |
| 8 | Közvetlen nyíróvizsgálat | EN ISO 17892-10 | 1:51 |
| 9 | Triaxiális vizsgálat (UU, CU, CD) | EN ISO 17892-8, -9 | 4:45 |

## 1. Szemeloszlási vizsgálat
Szárítás 105 °C → m₀ = 500 g → nedves szitálás a 0,063 mm-es szitán (mosogató) → újraszárítás → szitasor (8 … 0,063 mm) rázógépen 10 percig → szitánként mᵢ, áthullott % (Sᵢ = (m₀ − Σmᵢ)/m₀·100 %) → hidrometrálás 1000 cm³-es hengerben (desztillált víz + diszpergálószer, rázás, aerométer 0,5 perc … 24 óra, Stokes: v ~ d²) → teljes görbe frakciókkal.
Mintapélda: iszapos homok (siSa): agyag 8 %, iszap 20 %, homok 64 %, kavics 8 %; d₁₀ ≈ 0,0036 mm, d₃₀ ≈ 0,071 mm, d₆₀ ≈ 0,27 mm; C_U ≈ 76, C_C ≈ 5.

## 2. Folyási határ
0,4 mm alatti rész péppé keverve (üveglap, spatula) → csésze légbuborék nélkül → ejtőkúp 80 g / 30°, 5 s, behatolás (3 mérés átlaga) → víztartalom a kráter mellől → 4 víztartalom → szemilogaritmikus ábra, 20 mm-nél w_L. Casagrande-csésze: árok, 1 cm-es ejtés, 25 ütésnél w_L.
Mintapélda: ejtőkúp w_L = 46,9 %, Casagrande w_L = 47,2 %.

## 3. Sodrási határ
Kb. 10 g pép, szikkasztás, golyó → tenyérrel sodrás szűrőpapíros üveglapon → 3 mm-nél még ép: újragyúrás → 3 mm-nél morzsolódik → tégely, mérés, szárítás → két párhuzamos.
Mintapélda: w_P = 24,6 %; I_P = 22,3 % (közepes agyag); w = 30,2 % mellett I_C ≈ 0,75 (gyúrható).

## 4. Zsugorodási határ
Homogén talaj I_C ≈ 0,7-en → Ø 25 × 25 mm-es kiszúrt henger → m = 24,30 g, méretek tolómérővel → szárítás szobahőn (napok), majd 105 °C-on → m_d = 18,66 g, d = h = 22,9 mm.
β_s = 0,30; ε_s = 1 − (1/(1+β_s))^(1/3) = 8,4 % > 5 % (veszélyes); V_s = m_d/ρ_s; w_S = (V_d − V_s)·ρ_w/m_d = 13,5 %.

## 5. Szervesanyag-tartalom (izzítási veszteség)
110 °C-on szárított, 2 mm alatti minta → tégely előizzítva, exszikkátorban hűtve, m_c → 0,5–15 g talaj (≤ 5 mm réteg), m₁ → izzítókemence 550 ± 25 °C, ≥ 2 óra → exszikkátor → m₂.
w_LOI = (m₁ − m₂)/(m₁ − m_c)·100 % = 8,8 % (két minta átlaga 8,9 %) → közepesen szerves (EN ISO 14688-2: 2–6 / 6–20 / > 20 %). Agyagban a kristályvíz-veszteség miatt a szervesanyag valamivel kisebb.

## 6. Kompressziós vizsgálat
Kompressziós gyűrű Ø 75 × 20 mm → szűrőkövek, terhelőlap, vezetőgyűrű → emelőkaros keret (1:10), előterhelés < 3 kPa, mérőóra nullázása, víz a cellába → lépcsők 25, 50, 100, 200, 400, 800 kPa (24 óra / lépcső), tehermentesítés 100 kPa-ra, újraterhelés.
Mintapélda: e₀ = 0,85; E_oed(100–200) ≈ 4,0 MPa; C_c = 0,30; C_s = 0,05; σ′_p ≈ 150 kPa.

## 7. Konszolidációs vizsgálat
Egy lépcső (100 → 200 kPa), kétirányú szűrés: H = h/2 = 9,65 mm; leolvasások 6 s … 24 óra; Terzaghi-féle rugós modell.
Taylor (√t): 1,15-szörös egyenes → t₉₀ ≈ 130 perc, c_v = 0,848·H²/t₉₀ ≈ 0,6 mm²/perc. Casagrande (log t): t₁₀₀, t₅₀ ≈ 31 perc, c_v = 0,197·H²/t₅₀; utána másodlagos összenyomódás. k = c_v·γ_w/E_oed ≈ 2,5·10⁻¹¹ m/s.

## 8. Közvetlen nyíróvizsgálat
Négyzetes kiszúró 60 × 60 × 20 mm → nyíródoboz (két keret, szűrőkövek, terhelőlap) vízkádban → σ = 100 kPa emelőkarral, konszolidáció → rögzítőcsapok ki → lassú, állandó sebességű nyírás, nyíróerő, vízszintes és függőleges elmozdulás → 100 / 200 / 300 kPa → Coulomb-egyenes → nyírási sík a két keret határán.
Mintapélda: c′ = 8 kPa, φ′ = 28°.

## 9. Triaxiális vizsgálat
Lezárt mintacső a laborban (kupak, paraffin le) → kinyomás a behatolás irányában → esztergálás Ø 50 × 100 mm → mérés → beépítés lépésenként (talp: szűrőkő + papír, minta, fejlemez, gumimembrán feszítővel, 2-2 O-gyűrű, felső drén, akrilhenger, anyák, feltöltés alulról légtelenítéssel, felfekvés) → UU, CU, CD, törésképek vágott nézetben (hordósodás / nyírási sík).
Mintapélda: c_u ≈ 55 kPa; c′ = 5 kPa; φ′ = 27°.
