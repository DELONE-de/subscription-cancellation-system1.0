#!/usr/bin/env bash
set -euo pipefail

echo "==> Deploying all stacks to ${ENV}"
npx cdk deploy --all --require-approval never

echo "==> Deploy complete"
