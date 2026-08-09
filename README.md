# STRUCTURALIA — Logiciel de gestion pour bureau d'études techniques

Application web moderne de gestion pour un **bureau d'études techniques (BET)**, couvrant la
**gestion interne** (clients, devis & factures, conventions, documentations) et la
**gestion externe** (chantiers et suivi des travaux).

Interface en **mode clair turquoise**, menu latéral rétractable (slide) et **onglets par
catégorie** dans les pages. Stack **React + Vite + TypeScript**, backend **AWS Amplify Gen 2**
(Cognito + Data/AppSync), prête pour **AWS Amplify Hosting**.

---

## 🎨 Fonctionnalités

### Gestion interne
- **Clients** — particuliers, entreprises, collectivités ; CRUD, recherche, filtres, statuts.
- **Devis & Factures** — onglets dédiés, calcul automatique HT/TVA/TTC, suivi des règlements et relances.
- **Conventions** — contrats clients, périodes, montants, statuts.
- **Documentations** — plans, notes de calcul, rapports, pièces administratives (onglets par catégorie).

### Gestion externe
- **Chantiers** — grille de cartes, avancement, budget, fiche détaillée à onglets (Infos / Tâches / Documents).
- **Suivi des travaux** — vue kanban par statut (À faire / En cours / Bloqué / Terminé), priorités, échéances.
- **Documents de contrôle** — génération PDF des PV de chantier depuis le suivi :
  réception de **coffrage** / **ferraillage** (check-list conforme / non conforme + décision de
  bétonnage), **PV de réserves**, **rapport de synthèse**, **attestation de conformité / stabilité**.
  Chaque document est exportable en PDF et **archivable** dans les documents du chantier.
  Voir [`src/lib/pv.ts`](src/lib/pv.ts) et [`src/components/PvGenerator.tsx`](src/components/PvGenerator.tsx).
- **Registre des PV** — tous les documents de contrôle émis sont consignés (sous le kanban) avec
  **ré-impression à l'identique** et **numérotation automatique par type et par chantier**
  (ex. `PV-COF-CH-2026-04-001`). Persisté comme entité dédiée (rejoue le PDF depuis les données).

### Vue par projet
- **Fiche projet 360°** ([`/projets/:id`](src/pages/ProjectDetail.tsx)) — depuis le tableau de bord,
  chaque projet est **cliquable** et ouvre une vue qui **filtre toutes les données du projet** :
  aperçu (avancement, budget, finances), tâches, documents, PV de contrôle, facturation et
  conventions — regroupés par onglets. Chaque **carte de la page Chantiers** est également
  cliquable (avec boutons Fiche projet / modifier / supprimer).

### Administration & transverse
- **Membres & rôles** — équipe du BET, affectation des rôles, matrice des permissions.
- **Tableau de bord** — KPI (CA, encours, chantiers actifs), **graphiques** (CA par client, factures
  par statut), factures à relancer, tâches prioritaires. Graphiques en SVG/CSS sans dépendance,
  palette de statut avec libellés (identité jamais portée par la couleur seule).
- **Recherche globale** — barre du haut : recherche instantanée sur clients, chantiers, devis,
  factures, conventions, documents et membres, avec navigation directe.
- Thème clair turquoise, responsive (desktop / tablette / mobile), notifications toast.

### Facturation avancée
- **Éditeur de lignes** — devis et factures détaillés (désignation, quantité, prix unitaire) avec
  calcul automatique HT / TVA / TTC. Voir [`src/components/ui/LignesEditor.tsx`](src/components/ui/LignesEditor.tsx).
- **Échéancier & relances** — onglet dédié : factures non soldées triées par échéance, alertes de
  retard, et génération d'un **courrier de relance** (PDF imprimable + e-mail pré-rempli).
  Voir [`src/lib/relance.ts`](src/lib/relance.ts).

### Stockage, rôles & export
- **Stockage S3** — les documents sont envoyés sur **Amazon S3** (Amplify Storage) une fois le
  backend déployé ; en mode démo, les fichiers ≤ 1,5 Mo restent téléchargeables localement.
  Voir [`src/lib/storage.ts`](src/lib/storage.ts) et [`amplify/storage/resource.ts`](amplify/storage/resource.ts).
- **Utilisateurs & rôles** — trois rôles (Direction, Ingénieur, Gestionnaire) via **groupes
  Cognito**, avec permissions appliquées à l'UI (création, suppression, gestion des membres).
  Voir [`src/lib/roles.tsx`](src/lib/roles.tsx). En mode démo, un sélecteur de rôle dans la barre
  du haut permet de tester chaque profil.
- **Export PDF** — devis et factures exportables en PDF imprimable (en-tête BET, lignes, totaux
  HT/TVA/TTC) sans dépendance externe. Voir [`src/lib/pdf.ts`](src/lib/pdf.ts).

### Modèles officiels STRUCTURALIA
- **Identité d'entreprise** centralisée ([`src/lib/company.ts`](src/lib/company.ts)) — reprise sur
  tous les documents (adresse, ICE, RC, IF, contacts).
- **Devis conforme au modèle réel** — lignes groupées par mission (Étude technique / Suivi des
  travaux / Rapports de synthèse) avec colonne Unité, en-tête et pied de page réglementaires.
  Bouton **« Charger le modèle BET »** qui préremplit le catalogue de prestations standard
  ([`src/lib/catalog.ts`](src/lib/catalog.ts)) — Total HT 63 500 € de référence.
- **Contrat / convention généré** — document par articles (1 à 10) avec **échéancier des
  honoraires** calculé sur le montant, calqué sur le contrat officiel. Bouton « Générer le
  contrat » sur chaque convention. Voir [`src/lib/convention-doc.ts`](src/lib/convention-doc.ts).

---

## 🚀 Démarrage rapide (mode démo, sans backend)

```bash
npm install
npm run dev
```

L'application démarre immédiatement sur `http://localhost:5173` en **mode démonstration** :
les données sont générées et persistées dans le `localStorage` du navigateur. Aucun compte
AWS n'est nécessaire pour explorer l'interface.

> Le fichier `amplify_outputs.json` livré est un **placeholder**. Tant qu'il ne contient pas
> de configuration réelle, l'app reste en mode démo.

---

## ☁️ Déploiement AWS Amplify (full-stack)

Le projet est compatible **AWS Amplify Hosting** avec backend **Amplify Gen 2**.

### 1. Backend local (bac à sable)

```bash
# Nécessite des identifiants AWS configurés (aws configure / SSO)
npm run amplify:sandbox
```

Cette commande déploie un environnement de test (Cognito + base de données) et **génère
automatiquement** un vrai `amplify_outputs.json`. L'application bascule alors sur le backend
réel : authentification par e-mail et données persistées côté AWS.

### 2. Déploiement continu via la console Amplify

1. Poussez ce dépôt sur GitHub / GitLab / CodeCommit.
2. Dans la **console AWS Amplify** → *New app* → *Host web app* → connectez le dépôt.
3. Amplify détecte le fichier [`amplify.yml`](amplify.yml) fourni :
   - la phase **backend** exécute `npx ampx pipeline-deploy` (déploie Cognito + Data) ;
   - la phase **frontend** exécute `npm run build` et publie le dossier `dist/`.
4. À chaque `git push`, Amplify redéploie backend + frontend.

Aucune configuration supplémentaire n'est requise : l'`amplify_outputs.json` est régénéré
pendant le build et injecté au frontend.

---

## 🏗️ Architecture

```
amplify/                  Backend Amplify Gen 2
  auth/resource.ts        Authentification Cognito (e-mail)
  data/resource.ts        Modèle de données (7 entités + relations)
  backend.ts              Point d'entrée du backend
amplify.yml               Spéc. de build Amplify Hosting (backend + frontend)
src/
  components/
    layout/               Sidebar (slide), Topbar, AppLayout
    ui/                   Primitives : Icon, Modal, Tabs, Badge, Toast…
    AuthGate.tsx          Portail Cognito (chargé si backend présent)
  lib/
    amplify.ts            Configuration / détection du backend
    types.ts              Types métier (miroir du schéma Data)
    store.ts              Store réactif (localStorage en mode démo)
    seed.ts               Jeu de données de démonstration
    format.ts             Formatage (devise, dates…)
  pages/                  Dashboard, Clients, Facturation, Conventions,
                          Documents, Chantiers, Suivi
  styles/theme.css        Thème clair turquoise
```

### Persistance : démo ou Amplify Data (automatique)

`src/lib/store.ts` bascule **automatiquement** selon la présence d'un backend :

- **Mode démo** (aucun `amplify_outputs.json` réel) : lecture/écriture dans `localStorage`.
- **Mode backend** (Amplify déployé) : les données proviennent d'**Amplify Data / DynamoDB**
  via [`src/lib/amplifyData.ts`](src/lib/amplifyData.ts) (`generateClient<Schema>()`). Un
  chargement initial (`hydrate`) remplit l'état, et les mutations sont appliquées de façon
  optimiste en local puis propagées au backend.

L'API du store (`useData`, `store.create/update/remove`) et les composants sont **identiques**
dans les deux modes — aucune modification des pages n'est nécessaire pour passer en production.

---

## 📦 Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Démarre le serveur de développement Vite |
| `npm run build` | Build de production (`dist/`) |
| `npm run preview` | Prévisualise le build |
| `npm run amplify:sandbox` | Déploie un backend de test et génère `amplify_outputs.json` |
| `npm run amplify:generate` | Régénère `amplify_outputs.json` depuis le backend déployé |

---

## 🔧 Stack technique

- **React 18** + **TypeScript** + **Vite 5**
- **React Router 6**
- **AWS Amplify Gen 2** (`@aws-amplify/backend`) — Cognito + AppSync/DynamoDB
- **@aws-amplify/ui-react** — composant d'authentification
- Aucune librairie de composants lourde : UI et icônes sur-mesure (thème turquoise cohérent)
