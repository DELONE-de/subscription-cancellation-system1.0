#!/usr/bin/env bash
set -euo pipefail

# Required env vars (set as GitHub Actions secrets/vars):
# AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION
# CDK_DEFAULT_ACCOUNT, ENV

echo "==> Installing Node dependencies"
npm ci

echo "==> Building TypeScript"
npm run build

echo "==> Bootstrapping CDK environment (account: ${CDK_DEFAULT_ACCOUNT}, region: ${AWS_DEFAULT_REGION})"
npx cdk bootstrap "aws://${CDK_DEFAULT_ACCOUNT}/${AWS_DEFAULT_REGION}"

echo "==> Synthesizing CloudFormation templates"
npx cdk synth

echo "==> Bootstrap complete"
