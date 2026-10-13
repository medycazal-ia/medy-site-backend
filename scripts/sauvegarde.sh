#!/usr/bin/env bash
# Crée une sauvegarde complète et versionnée de medy-site-backend, en
# deux fichiers :
#   - medy-site-backend-vX.Y-AAAA-MM-JJ.zip : le code complet et
#     fonctionnel, la notice de restauration et le journal des versions ;
#   - medy-site-backend-vX.Y-AAAA-MM-JJ-historique-git.bundle : tout
#     l'historique Git (toutes les branches), en un seul fichier (le
#     dépôt est petit, pas besoin de le découper comme pour whaoo).
#
# Usage : scripts/sauvegarde.sh [dossier-de-sortie]
#   dossier-de-sortie  où écrire les fichiers (défaut : ../sauvegardes-medy-site-backend)
#
# La version est celle de l'entrée la plus récente (la première) de
# sauvegardes/SAUVEGARDES.md. Avant de lancer : ajouter cette entrée,
# committer avec le message « Sauvegarde vX.Y — AAAA-MM-JJ » et pousser.
# Ce commit est le point de restauration de la version sur GitHub (les
# tags ne peuvent pas être poussés depuis les sessions Claude) ; le
# script refuse un arbre de travail modifié pour que le zip lui
# corresponde.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

if [ -n "$(git status --porcelain)" ]; then
  echo "Arbre de travail modifié : committe et pousse d'abord." >&2
  exit 1
fi

entree=$(grep -m1 -E '^## v[0-9]+\.[0-9]+ — [0-9]{4}-[0-9]{2}-[0-9]{2}' sauvegardes/SAUVEGARDES.md || true)
if [ -z "$entree" ]; then
  echo "Aucune entrée « ## vX.Y — AAAA-MM-JJ » dans sauvegardes/SAUVEGARDES.md." >&2
  exit 1
fi
tag=$(echo "$entree" | cut -d' ' -f2)
date_jour=$(echo "$entree" | cut -d' ' -f4)
nom="medy-site-backend-$tag-$date_jour"
sortie="${1:-../sauvegardes-medy-site-backend}"
branche=$(git rev-parse --abbrev-ref HEAD)

# Tag local, pour retrouver la version dans l'historique une fois restauré.
git tag -f -a "$tag" -m "medy-site-backend $tag — sauvegarde du $date_jour" >/dev/null

travail=$(mktemp -d)
trap 'rm -rf "$travail"' EXIT
racine="$travail/$nom"
mkdir -p "$racine/application"

# Code complet tel qu'il est au tag (fichiers suivis uniquement : jamais
# node_modules ni server/data/*.json).
git archive "$tag" | tar -x -C "$racine/application"

cp sauvegardes/RESTAURATION.md "$racine/RESTAURATION.md"
cp sauvegardes/SAUVEGARDES.md "$racine/JOURNAL-DES-VERSIONS.md"
{
  echo "Application : medy-site-backend"
  echo "Version     : $tag"
  echo "Date        : $date_jour"
  echo "Branche     : $branche"
  echo "Commit      : $(git rev-parse "$tag^{commit}")"
} > "$racine/VERSION.txt"

mkdir -p "$sortie"
sortie=$(cd "$sortie" && pwd)
rm -f "$sortie/$nom.zip" "$sortie/$nom-historique-git.bundle"
(cd "$travail" && zip -qr -9 "$sortie/$nom.zip" "$nom")
unzip -tq "$sortie/$nom.zip" >/dev/null || { echo "Archive $nom.zip invalide." >&2; exit 1; }

git bundle create "$sortie/$nom-historique-git.bundle" --all >/dev/null
git bundle verify "$sortie/$nom-historique-git.bundle" >/dev/null || { echo "Bundle $nom-historique-git.bundle invalide." >&2; exit 1; }

echo "Sauvegarde :"
ls -1sh "$sortie/$nom.zip" "$sortie/$nom-historique-git.bundle"
