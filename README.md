# Révision IATA DGR — fiches Q/R imprimables

Application web locale, hors ligne, pour réviser l'examen initial **IATA DGR** (67e édition, CBTA) à partir de fiches personnelles de correction :
révision par cartes (Leitner 5 boîtes), impression A4 recto-verso alignée, tableau de bord, examen blanc chronométré.

> **La responsabilité de la classification incombe à l'expéditeur. Vérifiez toujours dans l'édition officielle en vigueur du DGR IATA.**
> L'app n'embarque aucun texte ni tableau du manuel IATA : uniquement des fiches personnelles. Les références de section renvoient au DGR sans le recopier.

## Démarrage

Prérequis : Node.js ≥ 20.

```bash
npm install
npm run dev        # http://localhost:5173
```

Usage hors ligne : `npm run build` puis `npm run preview` (http://localhost:4173). Après une première visite, le service worker
met toute l'app en cache : elle se relance ensuite réseau coupé. Aucun compte, aucune télémétrie ; la progression reste dans le navigateur (IndexedDB).

| Commande | Rôle |
|---|---|
| `npm run import` | Convertit les fiches Markdown en `data/cards/*.json` et écrit `data/import-report.md` |
| `npm test` | Tests unitaires (import, Leitner, pagination d'impression, examen, sauvegarde, interface) |
| `npm run typecheck` | Vérification TypeScript |
| `npm run build` | Build de production + PWA |

## Données

- **Source de vérité** : les fiches Markdown, lues dans `sourceDir` (`import.config.json`, par défaut `../Données exercice IATA IATA`). Elles ne sont pas versionnées dans ce dépôt.
- **Cartes** : `data/cards/*.json`, générées (ne pas éditer à la main). Un réimport sans modification des sources ne change aucun fichier.
- **Décisions manuelles** : `data/overrides.json`, appliquées en dernier, jamais écrasées. Exemple :
  ```json
  { "schema_version": 1, "cards": { "F4.D-cas6": { "reponse_courte": "Q = 0,9 ; étiquettes 3, 8, 6.1 ; flèches" } } }
  ```
- **Rapport** : `data/import-report.md` liste les cartes 🔴 et leur nature détectée (à confirmer), les réponses à condenser, les lignes non converties.
- **Réglages** : `data/app-config.json` (intervalles Leitner, durée et seuil de l'examen blanc, poids des modules). Aucune valeur DGR dans le code.

### Statuts
| Fiche | Carte | Comportement |
|---|---|---|
| 🟢 | `stable` | Révisée normalement |
| 🟠, pas de pastille, ou mélange | `a_relire` | Badge « à vérifier », champ « valeur relue dans mon DGR » |
| 🔴 erreur du corrigé 2014, corrigée par la fiche | `a_relire` + `piege-corrige` | Reste en révision, réponse fausse de 2014 barrée |
| 🔴 périmé seul (variations 2014, annexe D…) | `obsolete` | Exclue de la révision, consultable avec bandeau |

## Impression

Écran **Imprimer** : sélection par filtre, par cartes cochées (catalogue) ou « points faibles » ; formats 2 × 4, 2 × 5, 1 par page, ou recto seul avec pliage.
Dans la boîte d'impression : A4, **échelle 100 %**, marges « aucune » ou « par défaut », recto-verso **bord long**. Pour un PDF : « Enregistrer au format PDF ».

**Protocole de calibration recto-verso (une fois par imprimante)**
1. Imprimer → cocher « Afficher la page de calibration » → imprimer les 2 pages en recto-verso bord long.
2. Regarder le recto par transparence : lire sur les échelles la graduation où tombent les lignes du verso (x : échelle horizontale, y : échelle verticale).
3. Saisir ces valeurs dans « Décalage du verso (mm) », réimprimer la calibration : les croix doivent coïncider (écart ≤ 2 mm).

## Architecture

```
scripts/import/core.ts     parsing Markdown (remark) → cartes, statuts, rapport
src/model/                 schémas zod (cartes, config), filtres, points faibles
src/srs/leitner.ts         Leitner 5 boîtes, file du jour, série
src/print/                 géométrie des planches (miroir bord long), cartes imprimées, calibration
src/exam/exam.ts           tirage pondéré, chrono, score, journal CSV
src/storage/               IndexedDB (idb), export/import JSON versionné
src/ui/                    écrans React (tableau de bord, révision, catalogue, impression, examen, réglages)
```

Choix et justifications : [`docs/PLAN.md`](docs/PLAN.md).

## Raccourcis clavier
- Révision : `Espace` retourner · `1` / `2` / `3` je savais / hésité / raté · `A`–`D` QCM · `N` note DGR · `Échap` quitter
- Catalogue : `/` rechercher · `↑` `↓` naviguer · `X` cocher · `Entrée` ouvrir
- Examen blanc : `←` `→` question précédente / suivante · `A`–`D` QCM
