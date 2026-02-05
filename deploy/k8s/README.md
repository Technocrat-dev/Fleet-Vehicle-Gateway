# Kubernetes Deployment Guide

This directory contains Kubernetes manifests for deploying the Fleet Vehicle Gateway to production.

## Prerequisites

- Kubernetes cluster (1.25+)
- `kubectl` configured
- NGINX Ingress Controller
- cert-manager (for TLS)

## Quick Start

```bash
# 1. Update secrets.yaml with your actual credentials
#    - Generate SECRET_KEY: openssl rand -hex 32
#    - Set DATABASE password
#    - Add OAuth credentials (optional)

# 2. Update configmap.yaml
#    - Set your domain in OAUTH_REDIRECT_URL
#    - Set your frontend domain in CORS_ORIGINS

# 3. Update ingress.yaml
#    - Replace "your-domain.com" with your actual domain
#    - Replace "api.your-domain.com" with your API subdomain

# 4. Deploy with kustomize
kubectl apply -k .

# Or apply individually
kubectl apply -f namespace.yaml
kubectl apply -f secrets.yaml
kubectl apply -f configmap.yaml
kubectl apply -f postgres.yaml
kubectl apply -f backend.yaml
kubectl apply -f frontend.yaml
kubectl apply -f ingress.yaml
```

## Components

| Component | Type | Replicas | Description |
|-----------|------|----------|-------------|
| postgres | StatefulSet | 1 | PostgreSQL database with 10Gi PVC |
| backend | Deployment | 2 | FastAPI backend with HPA (2-10 replicas) |
| frontend | Deployment | 2 | Next.js frontend |
| ingress | Ingress | - | NGINX with TLS termination |

## Configuration

### Secrets (secrets.yaml)

| Key | Description |
|-----|-------------|
| `SECRET_KEY` | JWT signing key (openssl rand -hex 32) |
| `POSTGRES_PASSWORD` | Database password |
| `DATABASE_URL` | Full connection string |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth secret |

### ConfigMap (configmap.yaml)

Non-sensitive configuration like:
- `APP_ENV`, `DEBUG`
- `CORS_ORIGINS`
- `RATE_LIMIT_PER_MINUTE`
- Kafka settings
- Simulator settings

## Monitoring

```bash
# Check pod status
kubectl get pods -n fleet-gateway

# View backend logs
kubectl logs -n fleet-gateway -l app=backend -f

# Check HPA status
kubectl get hpa -n fleet-gateway
```

## Scaling

The backend Deployment has an HPA configured:
- Min replicas: 2
- Max replicas: 10
- Target CPU: 70%
- Target Memory: 80%

Manual scaling:
```bash
kubectl scale deployment backend -n fleet-gateway --replicas=5
```

## Troubleshooting

```bash
# Describe a failing pod
kubectl describe pod <pod-name> -n fleet-gateway

# Check postgres connectivity
kubectl exec -it postgres-0 -n fleet-gateway -- pg_isready

# Access backend shell
kubectl exec -it <backend-pod> -n fleet-gateway -- /bin/sh
```
