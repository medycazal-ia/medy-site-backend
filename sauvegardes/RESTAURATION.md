# Restaurer medy-site-backend à partir de cette sauvegarde

La sauvegarde tient en deux fichiers :

- `medy-site-backend-vX.Y-AAAA-MM-JJ.zip` : **le code complet et
  fonctionnel** à cette version. Il suffit à tout réinstaller.
- `medy-site-backend-vX.Y-AAAA-MM-JJ-historique-git.bundle` : tout
  l'historique Git (chaque modification depuis le début, la branche
  `main` avec ses tags de version). Conservé aussi sur GitHub
  (`medycazal-ia/medy-site-backend`) : ce fichier n'est qu'une seconde
  copie, pour le jour où GitHub ne serait plus accessible.

Contenu du zip :

| Dossier / fichier | Contenu |
|---|---|
| `application/` | Le code complet à cette version (prêt à installer). |
| `VERSION.txt` | Numéro de version, date et commit exact. |
| `JOURNAL-DES-VERSIONS.md` | Ce qui a été fait dans chaque version (copie de `sauvegardes/SAUVEGARDES.md`). |

Les **clés secrètes ne sont jamais dans la sauvegarde** (`ADMIN_USERNAME`,
`ADMIN_PASSWORD`, `SESSION_SECRET`, `AIRTABLE_API_KEY`, `TWILIO_*`,
`RESEND_API_KEY`...) : elles restent dans les réglages d'environnement de
Render. Il faudra les renseigner à nouveau sur un nouveau service si
jamais il faut en recréer un (voir étape 3).

## 1. Récupérer le code avec tout son historique (recommandé)

```bash
git clone medy-site-backend-vX.Y-AAAA-MM-JJ-historique-git.bundle medy-site-backend
cd medy-site-backend
```

Pour republier sur un nouveau dépôt GitHub :

```bash
git remote set-url origin https://github.com/<compte>/<depot>.git
git push -u origin --all
```

Sinon, le dossier `application/` du zip suffit pour relancer le site sans
historique.

## 2. Installer et lancer en local

Il faut Node.js 20 ou plus récent. Le projet a deux parties : `server/`
(API + site public) et `web/` (admin React).

```bash
cd server && npm install
cd ../web && npm install
```

Démarrage local du serveur (un compte admin est créé automatiquement au
premier démarrage à partir de ces trois variables) :

```bash
cd server
ADMIN_USERNAME=admin ADMIN_PASSWORD=<mot-de-passe> SESSION_SECRET=<secret> npm run dev
```

`npm run dev` dans `web/` pour l'interface d'admin React en local.

## 3. Variables d'environnement

Aucune n'est obligatoire pour démarrer (sauf les trois du bootstrap admin
ci-dessus, uniquement lues tant que `server/data/admins.json` n'existe
pas). Les autres activent chacune une fonctionnalité précise et le site
fonctionne sans elles : `AIRTABLE_API_KEY` (CRM), `TWILIO_*` (appels/SMS),
`RESEND_API_KEY` + `EMAIL_FROM` (emails), `BOITE_SECRETE_PATH` /
`DATA_DIR` / `ADMINS_PATH` / `PROJECTS_PATH` / `SIGNUPS_PATH` (chemins de
stockage, voir `server/src/config.ts`). Détail de chaque intégration dans
`CLAUDE.md`.

## 4. Données

Il n'y a **pas de base de données à restaurer** : tout est stocké dans de
simples fichiers JSON sous `server/data/` (profil, inscriptions, projets,
hash du code de la boîte secrète), régénérés avec des valeurs par défaut
au premier démarrage s'ils n'existent pas. Ces fichiers sont d'ailleurs
déjà effacés à chaque cycle de veille/réveil sur le plan gratuit Render
(voir `CLAUDE.md`, section Architecture) : il n'y a donc jamais eu de
données « réelles » à sauvegarder de ce côté, seulement du code.

## 5. Remettre en ligne

medy-site-backend tourne sur Render (`render.yaml` à la racine du dépôt
est le blueprint). Créer un nouveau service Web à partir de ce dépôt
GitHub dans le tableau de bord Render, renseigner les variables
d'environnement (étape 3), puis rattacher le domaine personnalisé
`medy.site` (Render → Custom Domains) si besoin — voir `CLAUDE.md`,
section « Not yet done » pour l'état de cette étape au moment de cette
sauvegarde.
