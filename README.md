# ZeroShare – Privacy-First Data Consent Platform

ZeroShare is a modern, professional SaaS platform designed to put users back in control of their personal data. It allows users to store sensitive information in a private vault and manage granular consent requests from third-party applications.

## 🚀 Overview

In an era of data exploitation, ZeroShare provides a secure, transparent bridge between users and applications. Built with a "Privacy-by-Design" philosophy, it features a premium dashboard for real-time monitoring and a robust backend for managing data governance.

## ✨ Features

- **Personal Data Vault**: Securely store and manage your sensitive identity, health, and financial data.
- **Granular Consent Management**: Review, approve, or reject access requests from third-party apps with full transparency.
- **Real-time Audit Logs**: A chronological, immutable record of every data access event and consent decision.
- **Risk Assessment**: Clear visualization of request risk levels (Low, Medium, High).
- **Intuitive SaaS Dashboard**: A premium, high-contrast dark mode interface built with React.

## 🛠 Technology Stack

- **Frontend**: React (Vite), Lucide Icons, Custom Design System
- **Backend**: Node.js, Express
- **Database**: PostgreSQL
- **Infrastructure**: Docker

## 🏗 Project Architecture

```text
zeroshare/
├── frontend/    # React SPA dashboard
├── backend/     # Express REST API
├── database/    # SQL schema and seeding scripts
└── docker/      # Infrastructure configuration
```

## ⚙️ Installation Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+)
- [Docker & Docker Desktop](https://www.docker.com/products/docker-desktop/) (for PostgreSQL)

### 1. Database Setup
We use Docker to run a portable PostgreSQL instance:
```bash
docker run --name zeroshare-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=zeroshare -p 5432:5432 -d postgres:15-alpine
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Ensure .env values match your database credentials
node database/seed.js # Initial data seed
node server.js
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## 📡 API Endpoints

### Consents
- `GET /api/consents/list` - Fetch all consent requests
- `POST /api/consents/approve` - Approve a request
- `POST /api/consents/reject` - Reject a request

### Audit Logs
- `GET /api/audit/list` - Fetch system event history

## 🔮 Future Enhancements
- [ ] End-to-end encryption for vault data.
- [ ] OAuth2 integration for 3rd party authentication.
- [ ] Automated compliance reporting (GDPR/CCPA).
- [ ] Mobile application for on-the-go consent management.

---
Built with ❤️ for Privacy.
