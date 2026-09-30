# Rapport d'import des fiches

Généré par `npm run import`. Ne pas éditer : les décisions manuelles vont dans `data/overrides.json`.

## 1. Résumé

| Fichier | Cartes | stable | a_relire | obsolete | à condenser |
|---|---|---|---|---|---|
| F1 (F1_generalites_champ_restrictions.md) | 54 | 20 | 23 | 11 | 3 |
| F2 (F2_classification_identification.md) | 108 | 35 | 73 | 0 | 2 |
| F3 (F3_emballages_specifications_marquage.md) | 49 | 20 | 29 | 0 | 0 |
| F4 (F4_documents_traitement_recap_expeditions.md) | 64 | 16 | 45 | 3 | 8 |
| F5 (F5_classe7_radioactifs.md) | 52 | 17 | 35 | 0 | 3 |
| T (T_test_serieA_correction.md) | 46 | 3 | 41 | 2 | 6 |
| F6 (F6_cours_2026_marquage_documents.md) | 49 | 20 | 29 | 0 | 4 |
| P1 (phase1_socle_themes_1-4.md) | 27 | 0 | 27 | 0 | 0 |
| P2 (phase2_application_themes_5-9.md) | 30 | 0 | 30 | 0 | 0 |
| P3 (phase3_cas_speciaux_themes_10-12.md) | 24 | 0 | 24 | 0 | 0 |
| P4 (phase4_examen_blanc_1.md) | 20 | 0 | 20 | 0 | 0 |
| QCM (iata_dgr_questions.md) | 20 | 0 | 20 | 0 | 0 |
| **Total** | **543** | 131 | 396 | 16 | 26 |

Par module : Généralités 32 · Restrictions 57 · Classification 66 · Identification 88 · Emballages 82 · Marquage 42 · Documents 62 · Traitement 13 · Expéditions 33 · Classe 7 68

Par type : question_ouverte 229 · vrai_faux 82 · calcul 62 · classement 80 · a_trous 6 · relecture_document 57 · qcm 27

## 2. Cartes 🔴 : nature détectée (à confirmer)

Règle : 🔴 « erreur corrigée » → `a_relire` + tag `piege-corrige` (reste en révision). 🔴 « périmé » seul → `obsolete` (exclu). 🔴 périmé mêlé à 🟢/🟠 → `a_relire` + `partie-perimee`. Nature ambiguë → `a_relire` + `rouge-a-trier`.

Pour corriger une décision : `data/overrides.json` → `{ "<id>": { "statut": "obsolete", "nature_rouge": "perime" } }`.

| Id | Nature | Statut retenu | Statut source |
|---|---|---|---|
| `F1.A.Q1` | perime | a_relire | 🟢 réponse · 🔴 code de variation |
| `F1.A.Q11` | perime | obsolete | 🔴 à relire en Appendice D |
| `F1.A.Q12` | perime | obsolete | 🔴 |
| `F1.C-Q1` | perime | obsolete | 🔴 Ce tableau a disparu avec la CBTA. Garde la logique : la formation est proportionnée à la fonction exercée, |
| `F1.D1.Q1` | erreur_corrigee | a_relire | 🟢 méthode · 🔴 la marque d'exemple du corrigé porte « 4.1 (6.1) » alors que la réponse est **4.3** |
| `F1.D2.Q9` | perime | obsolete | 🔴 |
| `F1.D2.Q30` | erreur_corrigee | a_relire | 🔴 pour l'énoncé · 🟢 pour la formule |
| `F1.D4.Q19` | perime | obsolete | 🔴 |
| `F1.D4.Q20` | perime | obsolete | 🔴 |
| `F1.D4.Q21` | perime | obsolete | 🔴 |
| `F1.D4.Q22` | perime | obsolete | 🔴 |
| `F1.D4.Q23` | perime | obsolete | 🔴 |
| `F1.D4.Q25` | perime | obsolete | 🔴 |
| `F1.D4.Q32` | perime | obsolete | 🔴 |
| `F2.A.Q10` | erreur_corrigee | a_relire | 🔴 incohérence livret/diapo |
| `F2.A.Q11` | erreur_corrigee | a_relire | 🔴 le corrigé écrit GE II |
| `F2.B3-Q13.5-29-diapo-ou-40-livret` | erreur_corrigee | a_relire | 🔴 le livret donne 40 °C, la diapo 29 °C ; avec 40 °C : GE II (incohérence livret / diapo) |
| `F2.B3-Q18.un-2529` | erreur_corrigee | a_relire | 🔴 UN 2529 : le livret dit 10 L, la diapo 1 L (incohérence) ; pour 10 L, relire les colonnes I et K |
| `F2.B3-Q20.tetrachlorure-de-carbone` | erreur_corrigee | a_relire | 🔴 le livret écrit « tétrafluorure » ; le corrigé traite le tétrachlorure (UN 1846) : coquille du livret |
| `F2.B5-Q17.tripropylamine` | erreur_corrigee | a_relire | 🔴 le livret dit GE II, le corrigé écrit GE III avec des PI de GE II |
| `F2.B6.Q27` | erreur_corrigee | a_relire | 🔴 le corrigé associe UN 1114 au n.s.a. ; **n.s.a. liquide inflammable = UN 1993** |
| `F3.A.Q14` | erreur_corrigee | a_relire | 🔴 |
| `F3.A.Q20` | erreur_corrigee | a_relire | 🔴 |
| `F3.A.Q21` | erreur_corrigee | a_relire | 🔴 les numéros ONU du livret (1337, 1638) ne correspondent pas aux noms |
| `F3.C1.Q2` | erreur_corrigee | a_relire | 🔴 |
| `F4.C-Q1.Q19` | erreur_corrigee | a_relire | 🔴 |
| `F4.C-Q2` | erreur_corrigee | a_relire | 🔴 La méthode écrite sur la diapo (« 3 GE I, donc 3 I – 6.1 ») est un copier-coller de la Q4 de la classificat |
| `F4.C-Q3` | perime | obsolete | Corrigé : DE-04 : non accepté au transport. 🔴 (variation d'exploitant, à relire en 2.8) |
| `F4.D-cas4` | perime | a_relire | Méthode : lire la variation d'exploitant avant d'emballer. MH-08 : gallium interdit → changer de compagnie. 🔴 |
| `F4.D-cas5` | perime | a_relire | Méthode identique : SW-02 : quantités limitées interdites → changer de compagnie. 🔴 · Pour mémoire : DGD « UN |
| `F4.E-cas2.limited-quantity-en-colonne-authorizatio` | perime | obsolete | 🔴 règle de 2014 : revérifier DGD et marquage des colis Y sur la 67e édition |
| `F4.E-cas2.colis-inscription-limited-quantity` | perime | obsolete | 🔴 règle de 2014 : revérifier DGD et marquage des colis Y sur la 67e édition |
| `F5.A.bi-210` | erreur_corrigee | a_relire | 🟠 A1/A2 du corrigé 2014 : relire la table 10.3.A de la 67e édition · 🔴 1 000 TBq |
| `F5.A.cs-135` | erreur_corrigee | a_relire | 🟠 A1/A2 du corrigé 2014 : relire la table 10.3.A de la 67e édition · 🔴 12 000 TBq |
| `F5.A.ar-37` | erreur_corrigee | a_relire | 🟠 A1/A2 du corrigé 2014 : relire la table 10.3.A de la 67e édition · 🔴 12 000 TBq |
| `F5.A.kr-87` | erreur_corrigee | a_relire | 🟠 A1/A2 du corrigé 2014 : relire la table 10.3.A de la 67e édition · 🔴 1 500 TBq |
| `F5.A.np-235` | erreur_corrigee | a_relire | 🟠 A1/A2 du corrigé 2014 : relire la table 10.3.A de la 67e édition · 🔴 12 000 TBq |
| `F5.A.tritium-gaz` | erreur_corrigee | a_relire | 🟠 A1/A2 du corrigé 2014 : relire la table 10.3.A de la 67e édition · 🔴 12 000 TBq |
| `F5.B.ch-q8` | erreur_corrigee | a_relire | 🔴 le corrigé donne **II-JAUNE** |
| `F5.B.mq-q2` | erreur_corrigee | a_relire | 🔴 le corrigé donne UN 3332 (forme spéciale) |
| `F5.B.mq-q3` | erreur_corrigee | a_relire | 🔴 je ne reproduis pas « Type B » : si A1(W-185) ≥ 1 TBq, c'est **Type A / UN 3332**. Relis 10.3.A avant de re |
| `F5.C.Q13-1-5` | erreur_corrigee | a_relire | 🔴 le corrigé coche III |
| `F5.D.Q2` | erreur_corrigee | a_relire | 🔴 **UN 2917 = Type B(M)** ; un colis **B(U)** est **UN 2916**. Le corrigé corrige l'étiquette mais pas ce num |
| `F5.E-cas1` | perime | a_relire | - 🔴 Variations GB et Afrique du Sud de 2014 : à ignorer. |
| `F5.E-cas2` | erreur_corrigee | a_relire | - Corrigé : UN 2915, « Type A package ». 🔴 Forme spéciale → UN 3332, et non 2915. Le certificat de forme spéc |
| `F5.G.Q2` | erreur_corrigee | a_relire | 🔴 |
| `T.Q1-12.Q2-suite` | erreur_corrigee | a_relire | 🔴 |
| `T.Q1-12.Q3` | **à trier** | a_relire | 🔴 pour la formule écrite |
| `T.Q1-12.Q3-suite` | erreur_corrigee | a_relire | 🔴 |
| `T.Q1-12.Q6` | perime | a_relire | 🟢 pour A105 · 🔴 la référence à El-Al (variation d'exploitant de 2014) |
| `T.Q1-12.Q7` | perime | obsolete | 🔴 |
| `T.Q13` | perime | a_relire | - 🟢 La structure de la DGD (expéditeur, destinataire, aéroports, type d'expédition, ligne ONU / DOT / classe  |
| `T.Q14-colis.texte-de-l-etiquette` | perime | obsolete | 🔴 variation PKG-02 de 2014 : à ignorer |
| `T.Q14-anomalies` | erreur_corrigee | a_relire | - 🔴 « KHARACHI » est écrit dans la case de destination corrigée : la ville est Karachi. Coquille du corrigé.  |
| `T.Q15-19.Q16` | erreur_corrigee | a_relire | 🔴 |
| `T.Q15-19.Q16-suite` | **à trier** | a_relire | 🔴 |
| `T.Q15-19.Q19` | perime | a_relire | 🟢 pour le raisonnement · 🟠 pour les numéros de paragraphe (10.x) à relire en 67e · 🔴 pour toutes les référe |
| `F6.E.Q1` | erreur_corrigee | a_relire | 🔴 mes fiches 2014 (test Q13, Q14, F4 cas 3, F5 cas 1) écrivent **« attached »** : formule **refusée depuis le |
| `F6.F.Q3` | erreur_corrigee | a_relire | 🔴 contredit les pratiques 2014 : à confirmer en 2.8 de la 67e |

## 3. Réponses à condenser (26)

Réponse de plus de 240 caractères, ou cas complet. Le texte intégral est dans `developpement`. Pour ajouter une réponse courte : `{ "<id>": { "reponse_courte": "…" } }` dans `data/overrides.json`.

- `F1.C-Q1` (332 car.) — Formation des pilotes (ancien tableau 1.5.A) : quels contenus étaient exigés ?
- `F1.D1-marque-lq` (486 car.) — Quantités limitées : quelle marque aujourd'hui, et que dit la fiche sur la DGD et les étiq
- `F1.D4-reflexe` (260 car.) — Variations d'État et d'exploitant : quel réflexe avant de choisir le transporteur ?
- `F2.B2.Q9` (243 car.) — Lecture Liste 4.2 : Chlorocarbonate d'allyle
- `F2.B5-Q16` (523 car.) — UN 2616, 1723, 2901, 2534, 3108, 1700 : GE, classe, subsidiaire, étiquettes de danger et d
- `F4.A-Q2` (254 car.) — DGD de l'UN 3018 : quelles corrections ?
- `F4.C-Q2` (626 car.) — Pesticide cuivrique liquide : toxique GE II, PIE 45 °C, PE 35 °C, 1 colis de 10 L. Classem
- `F4.C-Q4` (453 car.) — 2 L de diallylamine sur cargo, gravage « 1H1 / Y / 1.3 / 300 / 05 / GB / 1234 » : étiquett
- `F4.D-cas2` (334 car.) — Cas 2 — 1 kg d'allumettes de sûreté en pochettes de 10 g, quantités exceptées
- `F4.D-cas3` (596 car.) — Cas 3 — 50 L de N,N-diéthylaniline, un colis (caisse en contreplaqué)
- `F4.D-cas4` (469 car.) — Cas 4 — 15 kg de gallium (UN 2803) sur le vol MH 384 (Toronto/Montréal → Kuala Lumpur)
- `F4.D-cas5` (324 car.) — Cas 5 — 5 L de méthylcyclohexanols (UN 2617, GE III) en quantités limitées sur un vol SW
- `F4.D-cas6` (818 car.) — Cas 6 — Londres → Paris, British Airways, passagers : quatre produits dans une caisse en c
- `F5.E-cas1` (806 car.) — Cas 1 — Londres → Johannesburg : Au-193 « autre forme », 5 TBq, TI 0,8, colis 40 × 30 × 30
- `F5.E-cas2` (286 car.) — Cas 2 — Sn-119m, forme spéciale, 5 TBq ; 0,04 mSv/h à 1 m, 400 µSv/h en surface ; 65 × 50 
- `F5.G-distances` (263 car.) — Distances minimales de séparation avec les passagers (TI 3,3 · 4 · 5,1 · 6,5) et règle d'i
- `T.Q1-12.Q11` (359 car.) — Marquage et étiquetage d'une caisse en bois regroupant les colis : dicyclohexylamine 3 L, 
- `T.Q13` (3372 car.) — Test série A, Q13 (25 pts) : 10 L de bronopol, Singapore Airlines Singapour → Londres. Ide
- `T.Q14-anomalies` (493 car.) — Test série A, Q14 : quelles anomalies le corrigé laisse-t-il passer (villes, n° de LTA, Q)
- `T.Q15-19.Q16-suite` (336 car.) — Sn-119(m), forme spéciale, 5 TBq, 0,04 mSv/h à 1 m, colis de type A → Ce qu'il faut rempli
- `T.Q15-19.Q18` (356 car.) — Rectifier la DGD d'UN 3329 (Pu-239, forme spéciale, colis B(M) fissile)
- `T.Q15-19.Q19` (957 car.) — Colis B(M) sur DHL Air Limited, Paris → Los Angeles : Cm-240, 35 TBq, TI 3,4, 70 kg
- `F6.D.Q10` (251 car.) — Deuxième séquence : comment décrire les colis ?
- `F6.D.Q15` (317 car.) — Envois dispensés de DGD ?
- `F6.F.Q2` (260 car.) — Carboglace pour un produit dangereux ?
- `F6.H.Q1` (339 car.) — Ordre de travail pour préparer une expédition aérienne ?

## 4. Lignes et blocs non convertis ou signalés (15)

### Ligne sans réponse (renvoi ou sous-tableau), ignorée (1)

- F3_emballages_specifications_marquage.md, ligne 47 : \| 26 \| Décodage de trois gravages (voir ci-dessous) \| \| \| 🟢 \|

### Paragraphe du corrigé non rattaché (1)

- phase4_examen_blanc_1.md, ligne 91 : Note : 3 examens blancs consécutifs à 20/20 sont l'objectif. Je peux en générer d'autres, 

### Raisonnement long (203 car.), non raccourci (1)

- T_test_serieA_correction.md, ligne 21 : T.Q1-12.Q3

### Raisonnement long (205 car.), non raccourci (1)

- T_test_serieA_correction.md, ligne 137 : T.Q15-19.Q17

### Raisonnement long (223 car.), non raccourci (1)

- T_test_serieA_correction.md, ligne 28 : T.Q1-12.Q7

### Raisonnement long (241 car.), non raccourci (1)

- F3_emballages_specifications_marquage.md, ligne 32 : F3.A.Q11

### Raisonnement long (251 car.), non raccourci (1)

- F2_classification_identification.md, ligne 221 : F2.B6.Q23

### Raisonnement long (253 car.), non raccourci (1)

- T_test_serieA_correction.md, ligne 20 : T.Q1-12.Q2-suite

### Raisonnement long (258 car.), non raccourci (1)

- F1_generalites_champ_restrictions.md, ligne 69 : F1.D1.Q1

### Raisonnement long (260 car.), non raccourci (1)

- T_test_serieA_correction.md, ligne 19 : T.Q1-12.Q2-suite

### Renvoi « voir ci-dessous », traité par un autre tableau (3)

- F2_classification_identification.md, ligne 39 : \| 7 \| Tableau de couples de dangers \| voir ci-dessous \| voir ci-dessous \| 🟠 ligne 3 \|
- F2_classification_identification.md, ligne 40 : \| 8 \| Tableau à 1er et 2e risque \| voir ci-dessous \| voir ci-dessous \| 🟢 \|
- F2_classification_identification.md, ligne 41 : \| 9 \| Dix couples (PIE, PE) \| règle de la classe 3 \| voir ci-dessous \| 🟢 \|

### 🔴 de nature inconnue (2)

- T_test_serieA_correction.md, ligne 21 : T.Q1-12.Q3
- T_test_serieA_correction.md, ligne 136 : T.Q15-19.Q16-suite

## 5. Overrides manuels

- Appliqués : `F4.D-cas3`, `F5.E-cas1`, `T.Q13`, `T.Q14-LTA.information-de-manutention-dangerous-goo`, `T.Q14-DGD.contact-d-urgence`, `F4.E-cas3.aeroports-cdg-et-sydney`, `T.Q14-DGD.aeroports-de-depart-destination`, `P2.Q8-3`, `F1.D1-marque-lq`, `F3.C1.Q2`, `QCM.Q6`, `T.Q14-DGD.signature-a-la-machine-a-ecrire`, `F4.E-cas3.signature-magasinier-le-22-fevrier-2013`, `F4.A-T.Q3`, `F3.A.Q16`, `QCM.Q16`
- Identifiants inconnus : aucun
- Peut-être périmés (la ligne source a changé) : aucun
