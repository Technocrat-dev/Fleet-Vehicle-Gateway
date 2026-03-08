#!/bin/bash
# Fleet Vehicle Gateway — GCP Cloud Run Deployment Script
#
# Usage:
#   chmod +x deploy-gcp.sh
#   ./deploy-gcp.sh
#
# Prerequisites:
#   - gcloud CLI installed and authenticated (gcloud auth login)
#   - Billing enabled on your GCP account
#   - Neon PostgreSQL database created (connection string ready)

set -euo pipefail

# ============================================
# Configuration — EDIT THESE
# ============================================
PROJECT_ID="fleet-vehicle-gateway-prod"
REGION="us-central1"
REPO="fleet-gateway-repo"

# Backend environment variables
DATABASE_URL="${DATABASE_URL:?Set DATABASE_URL (Neon asyncpg connection string)}"
SECRET_KEY="${SECRET_KEY:-$(openssl rand -hex 32)}"

# OAuth (optional — set these env vars before running, or leave empty)
GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}"
GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-}"
GITHUB_CLIENT_ID="${GITHUB_CLIENT_ID:-}"
GITHUB_CLIENT_SECRET="${GITHUB_CLIENT_SECRET:-}"

# ============================================
# Step 1: Create GCP project + enable APIs
# ============================================
echo "=========================================="
echo "Step 1: Setting up GCP project"
echo "=========================================="

# Create project (may fail if it already exists — that's OK)
gcloud projects create "$PROJECT_ID" --name="Fleet Vehicle Gateway" 2>/dev/null || true
gcloud config set project "$PROJECT_ID"

# Link billing (interactive — lists billing accounts for you to pick)
echo ""
echo "If billing is not linked, run:"
echo "  gcloud billing accounts list"
echo "  gcloud billing projects link $PROJECT_ID --billing-account=ACCOUNT_ID"
echo ""

# Enable required APIs
echo "Enabling APIs..."
gcloud services enable \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    cloudbuild.googleapis.com \
    cloudscheduler.googleapis.com \
    --quiet

echo "✅ APIs enabled"

# ============================================
# Step 2: Create Artifact Registry repo
# ============================================
echo ""
echo "=========================================="
echo "Step 2: Creating Artifact Registry repo"
echo "=========================================="

gcloud artifacts repositories create "$REPO" \
    --repository-format=docker \
    --location="$REGION" \
    --description="Fleet Vehicle Gateway Docker images" \
    2>/dev/null || echo "Repository already exists"

echo "✅ Artifact Registry: ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}"

# ============================================
# Step 3: Fix IAM permissions
# ============================================
echo ""
echo "=========================================="
echo "Step 3: Fixing IAM permissions"
echo "=========================================="

PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
CLOUDBUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Grant Cloud Build service account permissions
for SA in "$COMPUTE_SA" "$CLOUDBUILD_SA"; do
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:${SA}" \
        --role="roles/storage.admin" --quiet 2>/dev/null || true
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:${SA}" \
        --role="roles/artifactregistry.writer" --quiet 2>/dev/null || true
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:${SA}" \
        --role="roles/logging.logWriter" --quiet 2>/dev/null || true
done

echo "✅ IAM permissions configured"

# ============================================
# Step 4: Build & deploy backend
# ============================================
echo ""
echo "=========================================="
echo "Step 4: Building backend image"
echo "=========================================="

cd backend
gcloud builds submit \
    --config=cloudbuild.yaml \
    --substitutions=SHORT_SHA="latest" \
    --region="$REGION"
cd ..

echo "✅ Backend image built and pushed"

echo ""
echo "=========================================="
echo "Step 5: Deploying backend to Cloud Run"
echo "=========================================="

# Build env var flags
ENV_VARS="DATABASE_URL=${DATABASE_URL}"
ENV_VARS="${ENV_VARS},SECRET_KEY=${SECRET_KEY}"
ENV_VARS="${ENV_VARS},APP_ENV=production"
ENV_VARS="${ENV_VARS},DEBUG=false"
ENV_VARS="${ENV_VARS},SIMULATOR_VEHICLE_COUNT=50"
ENV_VARS="${ENV_VARS},SIMULATOR_UPDATE_INTERVAL_MS=1000"
ENV_VARS="${ENV_VARS},SIMULATOR_DEMO_MODE=true"
ENV_VARS="${ENV_VARS},KAFKA_ENABLED=false"

# Add OAuth if provided
if [ -n "$GOOGLE_CLIENT_ID" ]; then
    ENV_VARS="${ENV_VARS},GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}"
    ENV_VARS="${ENV_VARS},GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}"
fi
if [ -n "$GITHUB_CLIENT_ID" ]; then
    ENV_VARS="${ENV_VARS},GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}"
    ENV_VARS="${ENV_VARS},GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}"
fi

gcloud run deploy fleet-api \
    --image "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/fleet-api:latest" \
    --region "$REGION" \
    --port 8000 \
    --memory 1Gi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 2 \
    --cpu-boost \
    --set-env-vars "$ENV_VARS" \
    --allow-unauthenticated \
    --quiet

# Get the backend URL
API_URL=$(gcloud run services describe fleet-api --region "$REGION" --format="value(status.url)")
echo "✅ Backend deployed: ${API_URL}"

# Update CORS and OAuth redirect URL
echo ""
echo "Updating backend with CORS and OAuth settings..."
CORS_ORIGINS="[\"http://localhost:3000\",\"${API_URL}\"]"
OAUTH_REDIRECT_URL="${API_URL}/auth/callback"

gcloud run services update fleet-api \
    --region "$REGION" \
    --update-env-vars "OAUTH_REDIRECT_URL=${OAUTH_REDIRECT_URL}" \
    --quiet

# ============================================
# Step 6: Build & deploy frontend
# ============================================
echo ""
echo "=========================================="
echo "Step 6: Building frontend image"
echo "=========================================="

# WebSocket URL (replace https:// with wss://)
WS_URL=$(echo "$API_URL" | sed 's|https://|wss://|')/ws/telemetry

cd frontend
gcloud builds submit \
    --config=cloudbuild.yaml \
    --substitutions=SHORT_SHA="latest",_API_URL="$API_URL",_WS_URL="$WS_URL" \
    --region="$REGION"
cd ..

echo "✅ Frontend image built and pushed"

echo ""
echo "=========================================="
echo "Step 7: Deploying frontend to Cloud Run"
echo "=========================================="

gcloud run deploy fleet-frontend \
    --image "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/fleet-frontend:latest" \
    --region "$REGION" \
    --port 3000 \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 2 \
    --allow-unauthenticated \
    --quiet

FRONTEND_URL=$(gcloud run services describe fleet-frontend --region "$REGION" --format="value(status.url)")
echo "✅ Frontend deployed: ${FRONTEND_URL}"

# Update backend CORS with frontend URL
echo ""
echo "Updating backend CORS with frontend URL..."
CORS_ORIGINS="[\"http://localhost:3000\",\"${FRONTEND_URL}\"]"

gcloud run services update fleet-api \
    --region "$REGION" \
    --update-env-vars "CORS_ORIGINS=${CORS_ORIGINS},FRONTEND_URL=${FRONTEND_URL}" \
    --quiet

echo "✅ CORS updated with frontend URL"

# ============================================
# Step 8: Cloud Scheduler warmup
# ============================================
echo ""
echo "=========================================="
echo "Step 8: Setting up Cloud Scheduler warmup"
echo "=========================================="

gcloud scheduler jobs create http fleet-warmup \
    --schedule="*/10 * * * *" \
    --uri="${API_URL}/health" \
    --http-method=GET \
    --location="$REGION" \
    --quiet 2>/dev/null || echo "Scheduler job already exists"

echo "✅ Cloud Scheduler: pings /health every 10 min"

# ============================================
# Done!
# ============================================
echo ""
echo "=========================================="
echo "🚀 Deployment Complete!"
echo "=========================================="
echo ""
echo "  Frontend:  ${FRONTEND_URL}"
echo "  API:       ${API_URL}"
echo "  API Docs:  ${API_URL}/docs"
echo "  Health:    ${API_URL}/health"
echo ""
echo "Next steps:"
echo "  1. Open ${FRONTEND_URL} to verify the landing page"
echo "  2. Register a new account (first user becomes admin)"
echo "  3. Update OAuth redirect URIs in Google/GitHub console:"
echo "     - Google: ${API_URL}/auth/callback"
echo "     - GitHub: ${API_URL}/auth/callback"
echo ""
