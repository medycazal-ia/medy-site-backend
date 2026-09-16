# medy-site-backend

Le site public [medy.site](https://medy.site) ("Profil Connecté", Medy
Cazal) **et** son API/CRM d'administration, servis par le même service
Express, différencié par nom de domaine (voir "Site public medy.site"
ci-dessous). Anciennement hébergé sur Canva Sites — migré ici pour ne
plus dépendre de l'éditeur Canva Code.

- le **profil public** (nom, fonction, présentation, coordonnées, photo)
  affiché sur medy.site, modifiable depuis l'onglet "Mon profil",
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

L'interface d'administration (`web/`) inclut un onglet **Clients** avec
un sous-onglet par ressource (Entreprises, Contacts, Projets, RDV,
Audits, Propositions, Paiements, Feuille de route, Messages) : formulaire
d'ajout/modification, tableau, suppression, et sélection des liens
(entreprise d'un contact, projet d'un RDV, etc.) par simple clic.

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

## Email (Resend)

`/api/email/send` — admin uniquement, envoie un email et journalise
l'envoi dans la table Airtable `Messages` (canal "Email"), au même
endroit que les SMS/WhatsApp/appels. Depuis l'admin : onglet **Clients →
Messages**, sous-onglet **Email** du composeur.

Pour l'activer :
1. Créer un compte sur [resend.com](https://resend.com) et générer une
   clé API (Dashboard → API Keys) → `RESEND_API_KEY`.
2. `EMAIL_FROM` : `onboarding@resend.dev` fonctionne immédiatement sans
   rien configurer de plus (pratique pour tester) ; pour une adresse sur
   ton propre domaine (ex. `contact@medy.site`), vérifie ce domaine dans
   Resend (Domains → Add Domain, puis les enregistrements DNS qu'il
   indique) avant de l'utiliser ici.

Sans `RESEND_API_KEY`, `/api/email/send` répond une erreur explicite
plutôt que d'échouer silencieusement.

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
   ou équivalent) sert l'API (`/api/...`) et l'interface d'administration
   (`/`). Le site public medy.site n'apparaît qu'une fois le domaine
   personnalisé branché — voir "Site public medy.site" ci-dessous.

**Limite acceptée pour l'instant** : le plan gratuit Render n'a pas de
disque persistant — les données (profil, projets, inscriptions, compte
admin) sont perdues à chaque mise en veille du service (~15 min
d'inactivité). Le profil et le projet "tierspayant.site" par défaut
seront donc recréés automatiquement au redémarrage (valeurs par défaut
codées), mais **toute modification du profil, les inscriptions, et tout
projet ajouté depuis l'admin seront perdus** tant que ce n'est pas passé
sur un plan payant avec disque, ou une vraie base de données.

## Site public medy.site

`public-site/index.html` est le site public complet (profil, "Mes
liens", "Mes créations", espace "Administration" local en
`localStorage` — indépendant du CRM/API de ce dépôt). `app.ts` choisit
quoi servir selon l'en-tête `Host` de la requête :

- `medy.site` / `www.medy.site` → `public-site/` (statique)
- tout autre domaine (`medy-site-backend.onrender.com` compris — c'est
  l'URL que le clic caché sur le logo ouvre) → l'admin React (`web/dist`)

### Brancher le domaine medy.site sur Render

1. Dans le dashboard Render, sur le service `medy-site-backend` :
   **Settings → Custom Domains → Add Custom Domain**, saisir `medy.site`
   (et `www.medy.site` si souhaité).
2. Render affiche les enregistrements DNS exacts à poser chez le
   registrar du domaine (généralement un `A` sur `@` vers l'IP de Render,
   et/ou un `CNAME` sur `www`) — suivre ces valeurs precises plutôt
   qu'une IP mémorisée ailleurs, elles peuvent changer.
3. Une fois la propagation DNS faite, Render détecte le domaine et
   provisionne automatiquement un certificat HTTPS (Let's Encrypt).

Pour tester le routage en local avant de toucher au DNS :
```bash
curl -H "Host: medy.site" http://localhost:4200/        # site public
curl http://localhost:4200/                                # admin
```

## Tests

```bash
cd server
npm test
```
