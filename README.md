# medy-site-backend

API + interface d'administration pour [medy.site](https://medy.site)
("Profil Connecté"), le site personnel de Medy Cazal. Le site lui-même
est statique (Canva Sites) ; ce service fournit ce qu'un site statique ne
peut pas faire seul :

- la liste des projets affichés dans la section publique **"Mes
  créations"**, modifiable sans toucher au code du site,
- la capture des inscriptions du bouton **"S'inscrire"**.

## Démarrage local

```bash
# Terminal 1 — API
cd server
cp .env.example .env   # renseigner ADMIN_PASSWORD et SESSION_SECRET
npm install
npm run dev             # http://localhost:4200

# Terminal 2 — interface d'administration
cd web
npm install
npm run dev              # http://localhost:5373 (proxy /api -> :4200)
```

Au premier démarrage de l'API, un compte admin est créé automatiquement
à partir de `ADMIN_USERNAME`/`ADMIN_PASSWORD` (`.env`).

## Déploiement (Render)

Ce dépôt contient un `render.yaml` à la racine (blueprint "Infrastructure
as Code" de Render) :

1. Sur [render.com](https://render.com), **New +** → **Blueprint**, sélectionner ce dépôt GitHub.
2. Render détecte `render.yaml` et propose de créer le service
   `medy-site-backend` (plan gratuit). `ADMIN_PASSWORD` et
   `SESSION_SECRET` sont générés automatiquement — à récupérer dans
   l'onglet **Environment** du service une fois créé pour se connecter
   la première fois.
3. Une fois déployé, l'URL du service (`https://medy-site-backend.onrender.com`
   ou équivalent) sert à la fois l'API (`/api/...`) et l'interface
   d'administration (`/`).

**Limite acceptée pour l'instant** : le plan gratuit Render n'a pas de
disque persistant — les données (projets, inscriptions, compte admin)
sont perdues à chaque mise en veille du service (~15 min d'inactivité).
Le projet "tierspayant.site" par défaut sera donc recréé automatiquement
au redémarrage (valeur par défaut codée), mais **les inscriptions et
tout projet ajouté depuis l'admin seront perdus** tant que ce n'est pas
passé sur un plan payant avec disque, ou une vraie base de données.

## Intégration dans medy.site (Canva Code)

Voir `docs/DESIGN.md` — le site Canva doit être mis à jour pour :
- charger dynamiquement `GET /api/projects` au lieu des cartes codées
  en dur dans la première version du canvas de design,
- envoyer le formulaire "S'inscrire" en `POST /api/signups` au lieu du
  lien `mailto:` temporaire.

## Tests

```bash
cd server
npm test
```
