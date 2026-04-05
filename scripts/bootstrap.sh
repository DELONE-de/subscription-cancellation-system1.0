#!/usr/bin/env bash
set -euo pipefail

# Required env vars (set as GitHub Actions secrets/vars):
# AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION
# CDK_DEFAULT_ACCOUNT, ENV

echo "==> Installing Node dependencies"
npm ci

echo "==> Building TypeScript"
npm run build

# Resolve account ID — fall back to STS if CDK_DEFAULT_ACCOUNT not set
ACCOUNT_ID="${CDK_DEFAULT_ACCOUNT:-$(aws sts get-caller-identity --query Account --output text)}"

echo "==> Bootstrapping CDK environment (account: ${ACCOUNT_ID}, region: ${AWS_DEFAULT_REGION})"
npx cdk bootstrap "aws://${ACCOUNT_ID}/${AWS_DEFAULT_REGION}"

echo "==> Synthesizing CloudFormation templates"
npx cdk synth

echo "==> Bootstrap complete"
