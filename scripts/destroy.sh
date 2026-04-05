#!/usr/bin/env bash
set -euo pipefail

echo "==> Destroying all stacks in ${ENV}"
npx cdk destroy --all --force

echo "==> Destroy complete"
