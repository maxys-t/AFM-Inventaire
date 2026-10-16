#!/usr/bin/env bash
# ============================================================
# Lance tous les harnais de test de l'application.
#
#   ./tests/run.sh            tous les harnais
#   ./tests/run.sh t124       un seul
#
# Chaque harnais est un fichier autonome : il charge les vrais
# fichiers de l'application dans un faux navigateur (jsdom), appelle
# leurs fonctions et regarde ce qu'elles rendent. Aucun ne touche à
# Supabase — ils n'ont besoin ni de réseau ni de compte.
# ============================================================
set -u

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RACINE/tests" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Node n'est pas installé. Installe-le depuis https://nodejs.org puis relance."
  exit 1
fi

# jsdom est la seule dépendance. On l'installe au premier lancement.
if [ ! -d "$RACINE/tests/node_modules/jsdom" ]; then
  echo "Première fois : installation de jsdom…"
  (cd "$RACINE/tests" && npm install --silent) || {
    echo "L'installation a échoué. Vérifie ta connexion, puis relance."
    exit 1
  }
  echo
fi

if [ $# -gt 0 ]; then
  HARNAIS=("$@")
else
  HARNAIS=()
  for f in t*.js; do HARNAIS+=("${f%.js}"); done
fi

echecs=()
for h in "${HARNAIS[@]}"; do
  h="${h%.js}"
  if [ ! -f "$h.js" ]; then
    echo "  ?  $h — ce harnais n'existe pas"
    echecs+=("$h")
    continue
  fi
  sortie="$(node "$h.js" "$RACINE" 2>&1)"
  if echo "$sortie" | grep -q "ALL_OK"; then
    printf '  ✓  %s\n' "$h"
  else
    printf '  ✗  %s\n' "$h"
    echo "$sortie" | grep -E "✗|Error|ÉCHEC" | sed 's/^/        /'
    echecs+=("$h")
  fi
done

echo
if [ ${#echecs[@]} -eq 0 ]; then
  echo "Les ${#HARNAIS[@]} harnais passent."
  exit 0
fi
echo "${#echecs[@]} harnais en échec : ${echecs[*]}"
echo "Pour voir le détail de l'un d'eux :  node tests/${echecs[0]}.js"
exit 1
