# Conception — medy-site-backend

## Pourquoi ce backend existe

`medy.site` ("Profil Connecté") est un site Canva Sites 100% statique
(HTML/JS + Tailwind CDN, sans exécution de code côté serveur possible).
Deux besoins ne peuvent pas être satisfaits par du `localStorage` seul :

1. **La liste des projets affichés dans "Mes créations"** doit pouvoir être
   mise à jour (ajout d'un nouveau projet, passage en "Bientôt" → "En
   ligne", etc.) sans toucher au code du site — donc gérée par ailleurs
   et lue dynamiquement par le site.
2. **Les inscriptions du bouton "S'inscrire"** doivent être capturées
   quelque part de durable, consultable par Medy — `localStorage` est
   local au navigateur du visiteur, donc inutilisable ici.

## Architecture

Même schéma que `tp-opt`/`vendor-admin` : un service Express unique qui
sert à la fois l'API JSON et le build statique d'une petite interface
d'administration React (`web/`), déployé en un seul service Render.

- **`GET /api/projects`** — public, lu directement en JS depuis medy.site
  (`fetch` cross-origin, CORS ouvert) pour construire la grille "Mes
  créations" dynamiquement au chargement de la page.
- **`POST /api/signups`** — public, appelé par la modale "S'inscrire".
- Le reste (créer/modifier/supprimer un projet, lister/supprimer les
  inscriptions) est protégé par la même authentification par cookie de
  session signé que `vendor-admin` — un seul compte admin (Medy), pas de
  système de rôles multiples : ce n'est pas un produit multi-tenant.

## Persistance

Fichiers JSON sous `server/data/` (`db.ts`), même limite acceptée que sur
`tp-opt` : le plan gratuit Render n'a pas de disque persistant, les
données sont perdues à chaque mise en veille/réveil du service (~15 min
d'inactivité). Acceptable pour un portfolio personnel à faible volume ;
à revisiter (disque payant ou vraie base) si le volume d'inscriptions
devient significatif.

## Intégration côté medy.site (Canva)

Le site Canva doit :
- au chargement, appeler `GET https://<service-render>.onrender.com/api/projects`
  et générer les cartes de "Mes créations" à partir du JSON reçu (plutôt
  que des cartes codées en dur), pour que les projets ajoutés depuis
  l'admin apparaissent sans republier le site ;
- sur soumission du formulaire de la modale "S'inscrire", appeler
  `POST /api/signups` avec `{ email }` au lieu du lien `mailto:`
  temporaire utilisé dans la première version du canvas de design.

Cette intégration (JS à coller dans l'éditeur Canva Code) reste à écrire
une fois ce service déployé et son URL Render connue.
