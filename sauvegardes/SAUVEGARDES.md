# Journal des sauvegardes medy-site-backend

Chaque version correspond à un commit « Sauvegarde vX.Y — date » sur
`main` et à un zip daté `medy-site-backend-vX.Y-AAAA-MM-JJ.zip` remis à
Medy. Une nouvelle version est créée à la fin de chaque session de
travail, ou quand Medy le demande (procédure : `CLAUDE.md`, section
« Sauvegardes versionnées »). La plus récente est toujours en haut.

Pour rouvrir une version : `git checkout $(git log --format=%H -1
--grep='^Sauvegarde vX.Y ')`, ou dézipper le zip correspondant et suivre
`RESTAURATION.md`.

---

## v1.1 — 2026-10-13

- **`GET /api/projects` devient la source publique des cartes "Mes
  créations"** : les 12 cartes (hors "accès privé") ont maintenant une
  entrée dans `DEFAULT_PROJECTS` (`server/src/db.ts`) avec `image`
  (URL absolue), `badgeColor`/`badgeTextColor`, en plus d'être codées en
  dur sur `public-site/index.html`. CORS déjà ouvert (`cors()` sans
  restriction), donc l'API est utilisable depuis n'importe quel autre
  site. Détail et limite connue (deux endroits à tenir à jour tant que
  `public-site/index.html` ne lit pas lui-même cette API) dans
  `CLAUDE.md`, section « API publique des projets ».
- Cette API alimente directement la nouvelle page "agents sur mesure" de
  `reine-cloud.fr` (dépôt séparé) — voir son propre journal de version.

**Point d'attention pour une restauration** : identique à la v1.0,
rien à restaurer côté `server/data/*.json`.

## v1.0 — 2026-10-13

- Mise en place de ce système de sauvegardes versionnées lui-même
  (`sauvegardes/`, `scripts/sauvegarde.sh`), à la demande de Medy.
- **Carrousel automatique** pour les cartes « Mes créations »
  (`public-site/index.html`) : la carte « accès privé » reste fixe à
  part, les autres défilent automatiquement (scroll-snap natif), avec
  pause au survol/glissement, bouton pause/lecture, pastilles numérotées
  (verte = active), compteur, et un bouton « Faites glisser pour voir
  plus » qui fait réellement avancer le carrousel au clic.
- **7 nouvelles cartes** ajoutées au carrousel, chacune avec un
  personnage illustré et un accessoire propre au projet : Automedy
  (tablette, schéma à 3 nœuds), Club Culture Pétanque (boule de
  pétanque), MontagePourTous (bobine de film), whaoo (mini chariot de
  courses), Coloriage des outre-mers (crayons de couleur), et l'outil de
  scan de documents d'identité sur `scan.reine-cloud.fr` (smartphone +
  passeport). Le carrousel compte maintenant 12 cartes au total.
- **Code acces de « Ma boîte secrète »** rendu réinitialisable : hash
  stocké côté serveur (`BoiteSecreteStore`), reset depuis l'admin
  (`web/src/pages/BoiteSecrete.tsx`), plus un bouton « Déconnexion » sur
  la page publique.
- Détail complet de chaque carte et de chaque choix (couleurs, recadrage
  d'image, URL) dans `CLAUDE.md`.

**Point d'attention pour une restauration** : `server/data/*.json`
(profils, inscriptions, projets, code de la boîte secrète) n'est **pas**
dans cette sauvegarde — ces fichiers sont `.gitignore`d et de toute façon
effacés à chaque cycle de veille/réveil du plan gratuit Render (voir
`CLAUDE.md`, section Architecture). Rien à restaurer de ce côté : un
nouveau déploiement régénère les valeurs par défaut.
