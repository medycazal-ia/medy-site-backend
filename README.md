# medy-site-backend

API + interface d'administration pour [medy.site](https://medy.site)
("Profil Connecté"), le site personnel de Medy Cazal. Le site lui-même
est statique (Canva Sites) ; ce service fournit ce qu'un site statique ne
peut pas faire seul :

- la liste des projets affichés dans la section publique **"Mes
  créations"**, modifiable sans toucher au code du site,
- la capture des inscriptions du bouton **"S'inscrire"**.

## CRM clients (Airtable)

En plus du portfolio public, ce backend expose `/api/crm/*` (entreprises,
contacts, projets clients, RDV, audits, propositions commerciales,
paiements, feuille de route, messages) — entièrement protégé par
connexion admin, données stockées dans Airtable plutôt qu'en JSON local.
Pour l'activer : créer un [Personal Access Token Airtable](https://airtable.com/create/tokens)
(scopes `data.records:read`, `data.records:write`, `schema.bases:read`,
restreint à la base "Medy CRM — Clients & Projets") et le renseigner en
variable d'env `AIRTABLE_API_KEY`. Sans cette clé, ces routes répondent
une erreur 500 — le reste du site (portfolio, inscriptions) fonctionne
normalement.

## Messagerie & téléphonie (Twilio)

`/api/twilio/messages` (SMS + WhatsApp) et `/api/twilio/call`
(clic-pour-appeler) — admin uniquement, chaque envoi est journalisé dans
la table Airtable `Messages`. Deux webhooks publics reçoivent les
messages entrants et le TwiML du clic-pour-appeler
(`/api/twilio/inbound`, `/api/twilio/voice/connect`), protégés par
vérification de la signature Twilio plutôt que par connexion.

Pour l'activer, dans la [console Twilio](https://console.twilio.com) :
1. Récupérer **Account SID** et **Auth Token** (page d'accueil de la console).
2. Acheter un numéro Twilio (SMS + appels) → `TWILIO_SMS_FROM`.
3. Pour WhatsApp : utiliser le numéro sandbox Twilio (`+14155238886`) pour
   tester tout de suite, ou demander l'approbation Meta Business Platform
   pour un numéro définitif → `TWILIO_WHATSAPP_FROM`.
4. Renseigner `TWILIO_MY_PHONE_NUMBER` (le téléphone de Medy, appelé en
   premier lors d'un clic-pour-appeler) et `PUBLIC_BASE_URL` (l'URL
   publique de ce service une fois déployé).
5. Dans la console Twilio, configurer le numéro/sandbox pour pointer ses
   webhooks "A message comes in" vers `<PUBLIC_BASE_URL>/api/twilio/inbound`.

Sans ces variables, `/api/twilio/*` répond une erreur explicite plutôt
que d'échouer silencieusement — le reste du site continue de fonctionner.

## Démarrage local

```bash
# Terminal 1 — API
cd server
cp .env.example .env   # renseigner ADMIN_PASSWORD, SESSION_SECRET, AIRTABLE_API_KEY
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
