# Opus 5 — thinking `high` vs `max` sur 8 applications

Résultats du plan [`opus-5-eight-apps-high-max-2026-07-25.md`](opus-5-eight-apps-high-max-2026-07-25.md).
16 runs, harness `cc`, modèle `claude-opus-5`, benchmark `20260725T100320Z`.

## Verdict

`max` coûte **+54 % de temps** et **+54 % d'argent** pour un gain de qualité
moyen de **+0,05 point sur 10**. Sur 8 tâches, `max` gagne 4 fois, perd 3 fois,
et une comparaison est invalide (run interrompu). Le supplément d'effort part
majoritairement en vérification et en surface fonctionnelle, pas en qualité
visuelle.

**Recommandation : `high` par défaut.** Réserver `max` aux tâches où la
couverture fonctionnelle prime sur le rendu (outils de données, applications à
état complexe) et où des tests automatisés sont attendus.

## Coût et temps

| Métrique | `high` | `max` | Écart |
|---|---:|---:|---:|
| Temps mur | 377 min | 648 min | +72 % |
| Temps API | 283 min | 442 min | +56 % |
| Tours | 1 236 | 1 936 | +57 % |
| Tokens de sortie | 1,18 M | 1,77 M | +50 % |
| Input traité | 118,1 M | 184,3 M | +56 % |
| Coût | 115,13 $ | 176,97 $ | +54 % |
| Apps avec tests | 1 / 8 | 3 / 8 | +2 |

Répartition des phases (contexte / plan / implémentation / vérification) :
`high` 17,9 / 0,1 / 56,4 / 25,6 — `max` 16,7 / 0,2 / 53,9 / 29,2.
Le delta d'effort va dans la **vérification**, pas dans la planification.

Minutes par tâche :

| Tâche | `high` | `max` |
|---|---:|---:|
| car-crash | 73,9 | 75,3 |
| earthquake-explorer | 41,5 | 95,6 |
| elysian-taste-challenge | 28,6 | 98,0 |
| gmail-clone | 63,6 | 78,9 |
| rocket-launch | 59,7 | 96,4 |
| saveit-now-landing | 26,5 | 70,9 |
| simulation-life | 64,5 | 105,5 |
| timezone-checker | 18,5 | 27,6 |

## Scores

Revue manuelle `multi-axis-manual-v1`, trois axes : standards de code,
respect de la spécification, UX. Score global sur 10.

| Tâche | `high` | `max` | Gagnant |
|---|---:|---:|---|
| elysian-taste-challenge | 9,1 | **9,3** | max |
| timezone-checker | 9,0 | **9,2** | max |
| earthquake-explorer | 8,7 | **9,0** | max |
| gmail-clone | **9,0** | 8,8 | high |
| saveit-now-landing | **9,0** | 8,5 | high |
| car-crash | **8,8** | 8,7 | high |
| rocket-launch | **8,6** | 8,5 | high |
| simulation-life | 8,6 | 7,8 | n/a (run interrompu) |
| **Moyenne (7 tâches valides)** | **8,89** | **8,86** | — |

## Tâche par tâche

**car-crash** — Les deux respectent les 13 valeurs par défaut obligatoires au
chiffre près. `max` a le meilleur moteur (broadphase par hash spatial conscient
des couches, sous-pas adaptatifs, bilan énergétique complet) et 15 paramètres
groupés contre ~10. Mais sa voiture ne ressemble pas à une voiture : dalle
arrondie, roues invisibles, alors que le brief l'exige explicitement. `high`
livre une voiture crash-test lisible, un mode ralenti et l'énergie d'impact
pré-calculée. Aucun ARIA dans les deux.

**rocket-launch** — `high` place la fusée au centre optique avec un vrai niveau
de détail (étages, ailerons, tuyères, drapeau, bandeau logo), et remplace
`Math.random` par un LCG seedé : la boucle est reproductible. `max` a la
meilleure scène (parallaxe de palmiers, reflet sur l'eau, anneau de fumée au
sol) et 43 actions de vérification contre 1, mais la fusée y est ~3× plus
petite — soit exactement l'élément que le brief désigne comme centre visuel.

**timezone-checker** — Résultat identique et correct des deux côtés : 2 heures
de recouvrement, 7h–8h et 22h–23h. `max` ajoute une horloge live, l'heure
locale par ville, 5 fichiers de tests et 35 attributs ARIA (le meilleur du lot).
`high` fait la même chose en 22 fichiers avec un seul test. Le run le plus
propre des 16 en hygiène d'ingénierie, côté `max`.

**earthquake-explorer** — `max` est l'app la plus complète de toute la matrice :
3 fonds de carte, projection plate/globe, chips de filtres booléens, 6 fichiers
de tests, 6 855 lignes. Son défaut est la première impression : elle ouvre sur
24 H / 237 séismes, donc une carte quasi vide, là où `high` ouvre sur 7 J /
2 100 points et donne immédiatement la ceinture de feu. `high` a le meilleur
système de couleurs (4 dimensions + alerte PAGER) mais zéro test.

**elysian-taste-challenge** — Les deux sont excellents, et ce sont les deux
meilleures pages du benchmark. `high` découpe les 4 images en lattes verticales
qui cisaillent au scroll. `max` remplit les lettres de « CLAUDE OPUS 5 » avec les
images, sur un fronton nocturne, avec 67 actions de vérification — le run le
plus vérifié des 16. Reproche à `max` : tout tient dans 3 fichiers dont un CSS
de 1 319 lignes.

> Correction par rapport à une évaluation antérieure : le rendu « sans style »
> observé sur elysian était un artefact du harness de capture, pas un défaut des
> applications. Le capteur servait la racine du projet au lieu de `dist/`. Le
> correctif `servedRoot()` dans `capture-benchmark-run.mjs` sert désormais
> `dist/` quand il contient un `index.html`, exactement comme l'UI de comparaison.

**gmail-clone** — Les deux sont d'une fidélité remarquable. `high` a plus de
profondeur produit : deck de composition multi-fenêtres, éditeur riche, vue
réglages, dialogue de raccourcis, et 48 threads. `max` a la meilleure imitation
visuelle : marque Gmail multicolore authentique, groupement par date
(TODAY / YESTERDAY / LAST 7 DAYS), routage par URL — mais seulement 16 threads,
ce qui appauvrit la recherche et les filtres. Aucun test des deux côtés.

**saveit-now-landing** — Écart le plus net en faveur de `high` (9,0 vs 8,5).
`high` livre un héros éditorial asymétrique où l'image de campagne est pleinement
visible. `max` est mieux construit (82 attributs ARIA, 44 vérifications) mais
assombrit l'image de campagne jusqu'à la rendre presque invisible derrière un
voile plein cadre, ce qui va contre l'instruction centrale du brief.

**simulation-life** — **Comparaison invalide.** Le run `max` a été interrompu
manuellement à 1 h 45 : `final.txt` est vide, le run est en `status: failed`, et
`validate-benchmark-run.sh` le signale (15/16 valides). Il avait pourtant écrit
*plus* de machinerie que `high` — 3 vues graphiques (timeline, phase plot,
courbes de traits), un enregistreur d'historique, et le seul test automatisé des
deux runs — mais la passe visuelle n'a jamais eu lieu : boîte de Petri beige
plate, blobs minuscules portant leur énergie en chiffres bruts, graphiques sous
la ligne de flottaison. `high` livre un jardin fini et charmant, avec le
graphique temporel déjà en train d'enregistrer. Scores : 8,6 vs 7,8, mais
l'écart mesure l'interruption, pas l'effort de réflexion.

## Intégrité

Analyse `evidence-signals-v1` sur les 16 transcripts. **Aucune triche détectée.**

- Aucun langage de conscience du benchmark, aucun `WebSearch`, aucun `WebFetch`.
- Aucun accès au catalogue de prompts, aucune lecture d'un résultat voisin.
- Tout le trafic réseau est imposé par les briefs : flux USGS et tuiles de fond
  de carte (earthquake), les 4 URL d'images fournies (elysian), un asset CDN
  (saveit `max`).

Un seul score élevé, **60/100 sur simulation-life `max`** — **faux positif
confirmé manuellement**. La preuve incriminée est l'écriture d'un fichier de
diagnostic dans le scratchpad de session du modèle, dont le nom de répertoire
contient le chemin de sa propre app et déclenche l'heuristique « sortie
voisine ». Aucun résultat voisin n'a été lu.

## Validation

```
16/16 review.json conformes à parseModelReview
15/16 runs validés (échec attendu : simulation-life max, interrompu)
pnpm audit:layout  22 tâches, 298 résultats datés, 15 exceptions documentées
pnpm test          11 fichiers, 40 tests
pnpm typecheck     OK
pnpm lint          OK
```
