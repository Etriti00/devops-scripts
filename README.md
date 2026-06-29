# DevOps Automation Scripts 🚀

Docker Compose templates, GitHub Actions CI/CD workflows, Kubernetes manifests, and Terraform configs.

## Quick Start

```bash
# Docker Compose Templates
cd docker-templates
docker compose -f web-stack.yml up -d     # Next.js + Postgres + Redis
docker compose -f full-stack.yml up -d    # Full stack with monitoring

# GitHub Actions Workflows
cp github-actions/*.yml .github/workflows/

# Kubernetes Manifests
kubectl apply -f k8s/namespace.yml
kubectl apply -f k8s/

# Terraform
cd terraform/aws
terraform init && terraform plan && terraform apply
```

## What's Included

### Docker Compose Templates 🐳
- **web-stack.yml** — Next.js + PostgreSQL + Redis + Mailpit
- **full-stack.yml** — API + Web + DB + Cache + Monitoring (Prometheus + Grafana)
- **microservices.yml** — Multi-service with API gateway
- **development.yml** — Hot-reload development environment

### GitHub Actions Workflows ⚙️
- **ci.yml** — Lint, typecheck, test, build
- **deploy-staging.yml** — Auto-deploy to staging on main push
- **deploy-production.yml** — Manual production deploy with approval
- **docker-publish.yml** — Build & push Docker image to ECR/GHCR
- **database-migrate.yml** — Run Alembic/Prisma migrations
- **slack-notify.yml** — Notify Slack on deploy/failure

### Kubernetes Manifests ☸️
- **namespace.yml** — Production namespace
- **deployment.yml** — App deployment with HPA
- **service.yml** — ClusterIP service
- **ingress.yml** — NGINX ingress with TLS
- **configmap.yml** — Environment configuration
- **secrets.yml** — Secret management template
- **hpa.yml** — Horizontal Pod Autoscaler (2-10 pods)
- **pdb.yml** — Pod Disruption Budget

### Terraform Configs 🏗️
- **AWS ECS** — Fargate cluster with ALB + RDS + ElastiCache
- **AWS EKS** — Kubernetes cluster with node groups
- **AWS S3 + CloudFront** — Static site hosting
- **AWS Lambda** — Serverless API with API Gateway

## License

MIT — use for any personal or commercial project.
