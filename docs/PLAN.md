# PLAN — App de révision IATA DGR (fiches Q/R imprimables)

> Jalon 1 : ce document seulement. Aucun code n'est écrit avant ta validation.
> Rédigé le 2026-09-30 après lecture de toutes les fiches Markdown de `Données exercice IATA IATA/`.

---

## 0. Constats sur l'existant (à lire en premier)

| # | Constat | Conséquence |
|---|---|---|
| C1 | Il n'y a ni `/data-source/` ni `/inspirations/`. Les fiches sont dans `Données exercice IATA IATA/`. | **Hypothèse H1** : l'import lit ce dossier en place, via un chemin configurable. Je ne copie ni ne déplace rien, pour garder une seule source de vérité. |
| C2 | Le dossier racine contient d'autres projets sans rapport (`qhse-app/`, `NEXUS_Notarial_v0.1.0/`, `Revision Notaire/`). | **Hypothèse H2** : l'app vit dans un sous-dossier dédié, `iata-dgr-app/`. `PLAN.md` reste à la racine. |
| C3 | Les placeholders `[APP 1]` et `[APP 2]` du prompt n'ont pas été remplis. Aucune capture n'est fournie. | Question bloquante Q1 (section 11). La section 2 propose des inspirations par défaut. |
| C4 | Les fiches ne suivent **pas** un format unique « question / réponse / raisonnement / statut ». J'ai relevé 6 formes de tableaux (voir 3.3). | L'import fonctionne par **gabarits déclarés par tableau**, pas par une regex unique. Chaque ligne non reconnue va dans le rapport. |
| C5 | Beaucoup de statuts sont **mixtes** : « 🟢 réponse · 🔴 code de variation », « 🟢 méthode · 🟠 PI ». | Il faut une règle de fusion (voir 3.4) et la possibilité de trancher à la main. |
| C6 | Le 🔴 des fiches recouvre **deux cas opposés** : (a) contenu périmé à ne pas apprendre (variations d'exploitant 2014) ; (b) **erreur du corrigé 2014, que la fiche corrige** (ex. 3 000 × 40 TBq = 120 000, et non 12 000). Le cas (b) est précisément un piège d'examen utile. | Question bloquante Q2. Proposition en 3.4. |
| C7 | De nombreuses réponses dépassent 3 lignes (ex. Test série A Q19, Correction d'expéditions). | Je ne les raccourcis pas moi-même (règle « ne jamais réécrire »). Voir 3.5. |
| C8 | D'autres fichiers exploitables existent hors de la liste du prompt : `phase1` à `phase4` (exercices + corrigé séparés) et `iata_dgr_questions.md` / `iata_dgr_reponses.md` (20 QCM A-D avec corrigé). Les `.docx` sont les sources brutes de 2014. | Question Q3. Les QCM A-D seraient la seule source auto-corrigeable pour l'examen blanc. |

---

## 1. Architecture

### 1.1 Vue d'ensemble

```
Données exercice IATA IATA/*.md      (source de vérité, éditée par toi)
          │
          ▼  npm run import          scripts/import_fiches.ts
data/cards/<fiche>.json              (cartes versionnées, générées)
data/overrides.json                  (tes décisions manuelles, jamais écrasées)
data/import-report.md                (lignes non reconnues, avertissements)
          │
          ▼  build Vite (JSON embarqué dans l'app)
Application web locale (PWA)  ──►  IndexedDB : progression, notes 🟠, sélections, réglages
          │
          └──► Impression : CSS @media print → navigateur → PDF
```

Deux types de données, strictement séparés :
- **Contenu** (cartes) : lecture seule dans l'app, régénéré par l'import, versionné dans git.
- **État personnel** (boîtes Leitner, historique, notes de relecture DGR, cartes cochées) : IndexedDB, exportable en JSON.

### 1.2 Arborescence cible (créée au fil des jalons)

```
iata-dgr-app/
├── package.json, vite.config.ts, tsconfig.json
├── import.config.json          chemin des sources, gabarits de tableaux par fiche
├── scripts/import_fiches.ts
├── data/
│   ├── cards/F1.json … T.json
│   ├── overrides.json
│   ├── app-config.json         durée examen, seuil, pondérations (pas de valeur DGR)
│   └── import-report.md
├── src/
│   ├── model/        types Card, Progress ; validation (zod)
│   ├── srs/          Leitner (fonctions pures)
│   ├── print/        pagination et miroir verso (fonctions pures) + CSS print
│   ├── storage/      IndexedDB (idb)
│   ├── i18n/         fr.ts, en.ts
│   └── ui/           écrans
└── tests/
```

---

## 2. Inspirations

**En attente de Q1.** Sans réponse de ta part, je retiens par défaut deux références connues, dont je reprends uniquement les principes d'interaction (ni logo, ni texte, ni asset) :

| Source | Je reprends | J'écarte | Pourquoi |
|---|---|---|---|
| **Anki** (documentation publique) | Espace = retourner ; touches 1/2/3 = noter ; file du jour ; filtres de session (« decks filtrés ») ; statistiques par paquet | SM-2 à 4 boutons ; éditeur de gabarits ; synchronisation | 3 boutons demandés ; l'édition se fait dans les Markdown ; l'usage est monoposte hors ligne |
| **Boîte de Leitner papier** | 5 boîtes visibles ; progression lisible d'un coup d'œil | Rien | Cohérent avec des fiches **imprimées** : la même carte peut vivre à l'écran et dans une vraie boîte |

Si tu me donnes d'autres apps (ou des captures dans `inspirations/`), je remplace ce tableau avant le jalon 2.

---

## 3. Modèle de données

### 3.1 Carte (`data/cards/*.json`)

```ts
type Card = {
  id: string;                  // stable, voir 3.2
  module: Module;
  source: { fiche: string; section: string; question: string; ligne?: string };
  type: 'qcm' | 'calcul' | 'classement' | 'relecture_document' | 'a_trous' | 'vrai_faux' | 'question_ouverte';
  question: string;
  reponse_courte: string | null;     // ≤ 3 lignes ; null si à condenser (voir 3.5)
  raisonnement: string | null;       // 1 ligne
  developpement: string | null;      // texte complet de la fiche si plus long
  reponse_corrige_2014?: string;     // quand la fiche signale une erreur du corrigé
  choix?: { lettre: string; texte: string }[];   // QCM seulement
  bonne_lettre?: string;
  statut: 'stable' | 'a_relire' | 'obsolete';
  statut_source: string;       // pastilles brutes, ex. "🟢 méthode · 🔴 code de variation"
  nature_rouge?: 'perime' | 'erreur_corrigee';   // voir 3.4
  ref_dgr: string[];           // ex. ["3.10.A"], sans recopier le texte
  edition_ref: '54-55';        // édition des références citées par la fiche
  edition_verifiee: string | null;   // "67" quand tu as relu ; null sinon
  tags: string[];
  difficulte: 1 | 2 | 3;       // par défaut 2, ajustable dans overrides
  hash_source: string;         // empreinte de la ligne Markdown, pour détecter une modification
};
```

**Modules** : Généralités · Restrictions · Classification · Identification · Emballages · Marquage · Documents · Traitement · Expéditions · Classe 7. J'ajoute **Traitement** (F4 B) et **Expéditions** (réalisation et correction) : ces sections existent dans les fiches et ne rentrent dans aucun module de ta liste. Les questions du Test série A reçoivent un module chacune (table de correspondance dans `import.config.json`).

### 3.2 Identifiant stable

`<fiche>.<section>.<question>[.<clé de ligne>]`, par exemple `F2.B5.Q17.tripropylamine` ou `F5.A.bi-210`.
La clé de ligne est tirée de la première cellule (normalisée), **pas** du numéro de ligne : insérer une ligne dans une fiche ne décale aucun identifiant. Un identifiant en double arrête l'import avec une erreur.

### 3.3 Formes de tableaux relevées et traitement

| Forme | Exemples | Carte produite |
|---|---|---|
| A. Question / Réponse / Raisonnement / Statut | F1 A, F1 D, F3 A, F4 B, T Q1-12 | 1 ligne = 1 carte, colonnes lues par leur en-tête (« Pourquoi », « Raisonnement », « Démarche » = raisonnement) |
| B. Matrice de valeurs | F2 Q7, Q8, Q9, Q13, Q18, Q24 ; F5 C (TI) | 1 ligne = 1 carte ; la question est **construite par gabarit** à partir des en-têtes (« PIE 45 °C / PE 21 °C : GE ? »). Le gabarit est déclaré dans `import.config.json` ; la réponse est copiée telle quelle |
| C. Tableaux doubles (2 couples par ligne) | F2 Q9, Q13 | Découpés en 2 cartes |
| D. Constat → Correction | F4 A Q1, F4 E, T Q14, F5 D, F5 F | 1 ligne = 1 carte de type `relecture_document` : « Erreur relevée : … Correction ? » ; le cas complet va en `developpement` |
| E. Prose structurée (cas d'expédition, DGD, LTA) | F4 D, T Q13, F5 E | 1 carte par cas ; réponse = contenu intégral en `developpement`, `reponse_courte` = null (voir 3.5) |
| F. Rappels de méthode, légendes, bilans, sources | En-têtes de fiches | Non convertis en cartes. Listés dans le rapport comme « ignoré volontairement » |

Toute ligne qui ne correspond à aucun gabarit est **listée dans le rapport** avec fichier, numéro de ligne et motif. Rien n'est inventé pour la combler.

### 3.4 Règle des statuts

1. Pastille unique : 🟢 → `stable`, 🟠 → `a_relire`, 🔴 → `obsolete`.
2. Pastilles mixtes : on retient **la plus prudente** (🔴 > 🟠 > 🟢) ; la chaîne brute reste dans `statut_source` et s'affiche sur la carte.
3. Pas de pastille ou pastille illisible : `a_relire`.
4. **Proposition pour C6** : l'import détecte les 🔴 « erreur corrigée » (mots-clés « le corrigé écrit/donne/coche », « Correct : », « Coquille ») et les marque `nature_rouge: 'erreur_corrigee'`, avec `statut: 'a_relire'` et le tag `piege-corrige`. La carte affiche la réponse de la fiche et, en dessous, barrée, `reponse_corrige_2014`. Les autres 🔴 (variations 2014, textes remplacés) restent `obsolete` et sortent de la révision par défaut. La détection n'est qu'une proposition : **chaque cas détecté est listé dans le rapport** pour que tu le confirmes dans `overrides.json`.
5. `overrides.json` a toujours le dernier mot et survit aux réimports. Si la ligne source change (`hash_source`), le rapport signale que l'override est peut-être périmé.

### 3.5 Réponses longues

L'import copie le texte en gras de la colonne « Réponse » dans `reponse_courte` s'il tient en 3 lignes (environ 240 caractères). Sinon, `reponse_courte = null`, le texte complet va dans `developpement`, et la carte figure dans le rapport, rubrique « à condenser ». Tu condenses dans `overrides.json`. À l'écran et à l'impression, une carte sans réponse courte affiche le développement en police réduite et le repère « ⋯ réponse longue ».
Si tu le souhaites plus tard, je peux **proposer** des condensés dans un fichier séparé, marqués `proposition`, jamais appliqués sans ton accord.

### 3.6 État personnel (IndexedDB)

```ts
type CardProgress = { id: string; boite: 1|2|3|4|5; prochaine: string /*ISO*/; historique: {date: string; note: 'su'|'hesite'|'rate'}[] };
type NoteDGR      = { id: string; valeur_relue: string; edition: string; date: string };
type Selection    = { nom: string; ids: string[] };   // cartes cochées pour l'impression
type Reglages     = { theme; langue; formatImpression; decalageVersoMm: {x: number; y: number}; dateExamen?: string };
```

Export/import : un seul fichier JSON versionné (`schema_version`), contenant ces quatre ensembles. L'import vérifie le schéma avant d'écrire.

---

## 4. Répétition espacée : Leitner à 5 boîtes

**Choix : Leitner, pas SM-2.**
- Les 3 boutons demandés (« je savais / hésité / raté ») correspondent exactement aux 3 mouvements de Leitner : boîte +1 ; même boîte ; retour en boîte 1. SM-2 attend 6 niveaux de note et un facteur de facilité qui dérive.
- Le corpus est fini (environ 300 à 400 cartes) et l'échéance est fixe (l'examen). Leitner reste prévisible : tu vois combien de cartes sont dans chaque boîte.
- La même logique marche sur papier avec les fiches imprimées.

Intervalles par défaut : boîte 1 = 1 j, 2 = 2 j, 3 = 4 j, 4 = 8 j, 5 = 16 j (dans `app-config.json`). Si une date d'examen est saisie, aucun intervalle ne dépasse cette date. Carte « maîtrisée » = en boîte 5. Toute la logique est faite de fonctions pures, testées.

---

## 5. Écrans

| Écran | Contenu | Clavier |
|---|---|---|
| **Accueil / tableau de bord** | Cartes dues aujourd'hui, série de jours, progression par module (barres), répartition par boîte, compteur 🟠 relues / à relire | Tab, Entrée |
| **Révision** | Carte recto → verso ; badge statut + édition ; bandeau d'alerte si `obsolete` ; champ « valeur relue dans mon DGR » si `a_relire` ; boutons Su / Hésité / Raté | Espace = retourner ; 1 / 2 / 3 = noter ; N = note DGR ; Échap = quitter |
| **Session** (configuration) | Filtres : module, statut, tag, ratées, à relire, `piege-corrige` ; mode « dues » ou « toutes » | — |
| **Catalogue / recherche** | Liste filtrable, recherche plein texte (sans accents ni casse), cases à cocher pour la sélection d'impression, accès aux cartes 🔴 avec bandeau | / = rechercher ; X = cocher |
| **Impression** | Choix de la sélection, du format et du mode ; aperçu à l'échelle ; réglage du décalage verso ; bouton « Imprimer / PDF » | — |
| **Examen blanc** | Tirage, chrono, correction finale (voir 7) | — |
| **Réglages** | Thème, langue, date d'examen, export/import JSON, mentions | — |

Mentions affichées en permanence (pied de page) et sur chaque planche imprimée : *« La responsabilité de la classification incombe à l'expéditeur. Vérifiez toujours dans l'édition officielle en vigueur du DGR IATA. »*

---

## 6. Impression (fonction prioritaire)

### 6.1 Formats (A4 portrait, marges non imprimables de 5 mm prises en compte)

| Format | Taille de carte | Cartes par feuille |
|---|---|---|
| 2 × 4 | 100 × 71 mm | 8 |
| 2 × 5 | 100 × 57 mm | 10 |
| 1 par page | 190 × 130 mm (moitié haute, verso dessous si « recto seul ») | 1 |

Dimensions en `mm` dans le CSS, `@page { size: A4; margin: 0 }`, grilles en valeurs absolues : l'aperçu et le PDF utilisent la même géométrie.

### 6.2 Recto-verso aligné (duplex bord long)
- Page impaire : les rectos dans l'ordre. Page paire : les versos, **chaque rangée inversée gauche/droite** (la carte en haut à gauche du recto a son verso en haut à droite).
- Le calcul de la position (page, rangée, colonne) de chaque verso est une fonction pure testée.
- **Réglage de décalage verso** (x, y en mm) : les imprimantes duplex décalent souvent de 1 à 3 mm. Une page de calibration (croix centrées) permet de mesurer l'écart une fois pour toutes.

### 6.3 Mode « recto seul avec pliage »
Chaque carte occupe une bande : question à gauche, réponse à droite, ligne de pliure pointillée au centre. Format dérivé : 1 × 4 bandes par page.

### 6.4 Contenu d'une carte imprimée
- **Recto** : question ; en coin : numéro court, module, pictogramme de statut ; en pied : « DGR 67e ».
- **Verso** : réponse courte, raisonnement, `ref_dgr` ; pour une carte 🟠, ta valeur relue si elle existe, sinon une ligne vide « Valeur 67e : ______ ».
- Pictogrammes lisibles en noir et blanc (forme, pas couleur) : **●** stable · **▲!** à relire · **✕** dans un carré : obsolète.
- Repères de découpe aux coins de chaque carte (traits hors zone de carte).

### 6.5 Sélection à imprimer
Par filtre de session, par cartes cochées (sélections nommées enregistrées), ou « points faibles » : cartes ratées ou hésitées lors des N dernières révisions, puis boîtes 1-2.

---

## 7. Examen blanc

- **Paramètres** (`app-config.json`, pas en dur) : durée 3 h, seuil 80 % (repris du test série A), nombre de questions.
- **Tirage pondéré** : par module, poids réglables ; par défaut proportionnels au nombre de cartes stables et à relire du module, avec bonus pour les cartes en boîtes 1-2. Les cartes `obsolete` sont exclues.
- **Correction** :
  - cartes QCM (si Q3 = oui) : correction automatique ;
  - autres cartes : tu écris ta réponse dans un champ pendant l'épreuve ; à la fin, l'app affiche ta réponse face à la réponse de la fiche et tu notes juste / faux. Le score est donc **auto-évalué** pour ces cartes, et l'écran le dit.
- Les erreurs alimentent le « journal d'erreurs » de ta fiche 00 (date, question, ta réponse, bonne réponse, cause à choisir : colonne / section / variation / vocabulaire / calcul), exportable en CSV.

---

## 8. Stack

| Choix | Motif |
|---|---|
| **Vite + TypeScript + React 18** | Écosystème de test le plus large (Vitest, Testing Library) ; tu pourras reprendre le code facilement |
| **idb** (IndexedDB) | 1 ko, API à promesses, pas de surcouche |
| **zod** | Valide les cartes à l'import et les fichiers de progression importés |
| **remark + remark-gfm** (import seulement) | Parse les tableaux Markdown de façon fiable, avec positions de ligne pour le rapport |
| **vite-plugin-pwa** | Service worker hors ligne (jalon 7) |
| **Vitest** | Tests de l'import, de Leitner, de la pagination d'impression |
| CSS pur (variables pour thème clair/sombre) | Pas de framework CSS ; le rendu d'impression doit être maîtrisé au millimètre |
| i18n maison (dictionnaires typés `fr.ts`, `en.ts`) | ~150 libellés : une bibliothèque serait disproportionnée |

Aucune dépendance réseau à l'exécution, aucune télémétrie, aucun compte. `npm install` demande Internet une seule fois.
Prérequis : Node.js ≥ 20 (je le vérifierai au jalon 2).

---

## 9. Conformité et qualité

- **Aucun contenu du manuel DGR** n'est ajouté par l'app : seules tes fiches sont importées. `ref_dgr` contient des numéros de section, jamais leur texte. Je n'ajoute aucune valeur chiffrée de mon cru.
- Les valeurs numériques restent **dans les cartes**, avec leur source (`source`), l'édition de référence (`edition_ref: '54-55'`) et `edition_verifiee`. Le code ne contient aucune limite DGR.
- Une carte `a_relire` n'est jamais présentée comme définitive : badge « à vérifier » à l'écran et à l'impression.
- Les références de section des fiches datent de la 54e/55e édition : l'app affiche « réf. éd. 54-55 » tant que tu n'as pas saisi l'édition vérifiée.

---

## 10. Jalons et critères d'acceptation

| # | Livrable | Critères vérifiables |
|---|---|---|
| **1** | `PLAN.md` (ce document) | Tu valides ou tu amendes ; réponses aux questions de la section 11 |
| **2** | Squelette `iata-dgr-app/`, modèle zod, `scripts/import_fiches.ts`, `data/cards/*.json`, `data/import-report.md` | `npm run import` s'exécute sans erreur ; chaque fiche produit un JSON valide (zod) ; le rapport liste les lignes non reconnues, les réponses à condenser, les 🔴 « erreur corrigée » détectés ; `npm test` : tests de l'import sur des extraits réels (statut mixte → pire, ID stable après insertion d'une ligne, tableau double découpé en 2, ligne inconnue → rapport). Un réimport sans modification de source produit un diff git vide |
| **3** | Mode carte, filtres, recherche, stockage IndexedDB | `npm run dev` ; révision complète au clavier seul (Espace, 1/2/3) ; filtre « Classe 7 + à relire » cohérent avec le JSON ; une carte 🔴 absente par défaut, visible avec bandeau dans le catalogue ; une note 🟠 survit au rechargement |
| **4** | Impression | Tests unitaires de la pagination et du miroir (2 × 4, 2 × 5, 1/page, nombre de cartes non multiple) ; PDF « Microsoft Print to PDF » de 16 cartes en 2 × 4 = 4 pages ; impression duplex réelle d'une feuille : écart recto/verso ≤ 2 mm après calibration (test manuel, protocole fourni) ; statut lisible en niveaux de gris |
| **5** | Leitner + tableau de bord | Tests unitaires des transitions et du plafonnement par date d'examen ; tableau de bord cohérent après une session scriptée |
| **6** | Examen blanc | Chrono qui persiste au rechargement ; tirage sans carte obsolète (test) ; score et seuil calculés depuis `app-config.json` ; journal d'erreurs exporté en CSV |
| **7** | PWA, export/import, accessibilité | L'app se lance réseau coupé après une première visite ; export puis import sur un profil vierge = même état ; audit axe-core sans erreur sérieuse ; contraste AA dans les deux thèmes |

À la fin de chaque jalon : ce qui marche, ce qui reste, commandes de test.

---

## 11. Décisions (validées le 2026-09-30 : « go pour tout »)
- Q1 : inspirations par défaut (Anki + boîte de Leitner papier).
- Q2 : 🔴 « erreur corrigée » gardés en révision (`a_relire` + `piege-corrige`) ; 🔴 « périmé » exclus.
- Q3 : import de (a) QCM `iata_dgr_questions/reponses` et (b) `phase1` à `phase4`.
- Hypothèses H1 à H6 acceptées.

## 11 bis. Questions bloquantes posées au jalon 1 (archivées)

**Q1 — Inspirations.** Quelles apps désignaient `[APP 1]` et `[APP 2]`, et qu'en reprendre ? Sans réponse : Anki + boîte de Leitner papier (section 2).

**Q2 — Cartes 🔴 « erreur du corrigé corrigée par la fiche ».** Il y en a une vingtaine environ, d'après le tableau d'erreurs du bilan 00 et les fiches (Bi-210, Cs-135, Kr-87, Ni-59, Pb-205, Sn-119m, Récapitulatif Q19, Classification Q11, Emballages Q14…). Proposition (3.4) : les garder **en révision** comme `a_relire` + tag `piege-corrige`, en affichant la réponse fausse de 2014 barrée. Les 🔴 « périmés » (variations d'exploitant 2014, annexe D) restent exclus. D'accord, ou préfères-tu exclure tout 🔴 comme le dit le prompt ?

**Q3 — Périmètre des sources.** J'importe F1 à F5 et T (le bilan 00 et la fiche méthode ne contiennent pas de questions : ils servent de contexte et de légende). Dois-je aussi importer :
(a) `iata_dgr_questions.md` + `iata_dgr_reponses.md` (20 QCM A-D, les seuls auto-corrigeables en examen blanc) ;
(b) `phase1` à `phase4` (environ 80 exercices, corrigé en fin de fichier) ?
Ces fichiers sont récents (ils citent l'addendum 2026) mais ont d'autres formats : prévoir un gabarit par fichier.

### Hypothèses en attendant (modifiables)
- **H1** : sources lues en place dans `Données exercice IATA IATA/`, chemin configurable.
- **H2** : app dans `iata-dgr-app/`.
- **H3** : ajout des modules « Traitement » et « Expéditions ».
- **H4** : les `.docx` ne sont pas importés (les Markdown en sont déjà la correction).
- **H5** : pas de dépôt git pour l'instant ; je propose `git init` dans `iata-dgr-app/` au jalon 2 pour versionner `data/cards/`.
- **H6** : difficulté 2 par défaut ; type déduit de la forme du tableau (matrice → `classement`, « Q = » → `calcul`, Vrai/Faux → `vrai_faux`, constat/correction → `relecture_document`).
