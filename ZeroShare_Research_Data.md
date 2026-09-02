# ZeroShare — Full Research Paper Data

## 1. Abstract

ZeroShare is a privacy-first personal data consent management platform that enables individuals to store sensitive personal data in a secure vault and govern third-party access through a structured consent workflow. Built on a zero-trust architecture, ZeroShare addresses the growing concern of unauthorized personal data exploitation by providing granular, auditable, and revocable consent mechanisms. The platform integrates a machine learning risk scoring microservice that evaluates consent requests in real time and learns from administrator decisions over time.

---

## 2. Problem Statement

In the modern digital landscape, personal data is routinely collected, shared, and monetized by third-party applications without meaningful user awareness or control. Existing solutions are fragmented — privacy policies are lengthy and opaque, consent banners are manipulative, and users have no centralized mechanism to track or revoke data access. Regulations such as GDPR (EU) and DPDPA (India) mandate user consent but lack practical tooling for individuals to exercise those rights.

**ZeroShare solves:**
- Lack of user visibility into who has access to their data
- Absence of a centralized consent ledger
- No risk signal before granting data access
- No mechanism to revoke access once granted
- No audit trail of data governance decisions

---

## 3. Objectives

1. Design a secure personal data vault for structured storage of sensitive information
2. Implement a consent request lifecycle (Pending → Granted / Denied → Revoked)
3. Provide real-time ML-based risk scoring of incoming consent requests
4. Maintain an immutable audit log of all data governance events
5. Support multi-role access (User, Admin) with appropriate access controls
6. Enable email notifications and OTP-based two-factor authentication
7. Deploy via Docker for reproducibility and ease of sharing

---

## 4. System Architecture

### 4.1 Architecture Overview

ZeroShare follows a **4-layer microservices-inspired architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                           │
│         React (Vite) SPA — served via Nginx (Port 80)      │
│   Dashboard | Data Vault | Consent Hub | Audit | Settings  │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP/WebSocket (proxied by Nginx)
┌─────────────────────▼───────────────────────────────────────┐
│                  BACKEND API LAYER                          │
│           Node.js / Express REST API (Port 5001)           │
│  Auth | Consents | Data | Analytics | Notifications | ML   │
└──────┬──────────────────────────────┬───────────────────────┘
       │ SQL (pg driver)              │ HTTP (internal)
┌──────▼──────────┐         ┌─────────▼──────────────────────┐
│  DATABASE LAYER │         │       ML SERVICE LAYER         │
│  PostgreSQL 16  │         │   Python FastAPI (Port 8000)   │
│  (Port 5432)    │         │   Risk Scoring + Auto-Retrain  │
└─────────────────┘         └────────────────────────────────┘
```

### 4.2 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + Vite | SPA dashboard |
| UI Components | shadcn/ui + Tailwind CSS | Design system |
| Animations | Framer Motion | UI transitions |
| Icons | Lucide React | Icon library |
| HTTP Client | Axios | API communication |
| Real-time | WebSocket (ws) | Live notifications |
| Backend | Node.js + Express | REST API server |
| Authentication | JWT (jsonwebtoken) | Stateless auth |
| Password Hashing | bcrypt | Secure password storage |
| Encryption | AES-256 (crypto) | Data vault encryption |
| OTP / 2FA | Custom TOTP | Two-factor authentication |
| Email | Nodemailer + Gmail SMTP | Transactional emails |
| Database | PostgreSQL 16 | Relational data store |
| DB Driver | node-postgres (pg) | PostgreSQL client |
| ML Service | Python 3.11 + FastAPI | Risk scoring microservice |
| ML Algorithm | Logistic Regression | Consent risk classification |
| Security | Helmet.js | HTTP security headers |
| Infrastructure | Docker + Docker Compose | Containerized deployment |
| Reverse Proxy | Nginx | Frontend serving + API proxy |

---

## 5. Database Design

### 5.1 Entity Relationship Overview

**5 Core Tables:**

#### `users`
```sql
id              SERIAL PRIMARY KEY
name            VARCHAR(100)
email           VARCHAR(100) UNIQUE
password_hash   TEXT
role            VARCHAR(20) DEFAULT 'user'   -- 'user' | 'admin'
avatar_url      VARCHAR(500)
two_fa_enabled  BOOLEAN DEFAULT FALSE
otp             VARCHAR(6)
otp_expires     TIMESTAMP WITH TIME ZONE
is_suspended    BOOLEAN DEFAULT FALSE
reset_token     VARCHAR(255)
created_at      TIMESTAMP WITH TIME ZONE
```

#### `user_data` (Data Vault)
```sql
id           SERIAL PRIMARY KEY
user_id      INTEGER REFERENCES users(id)
data_type    VARCHAR(100)        -- e.g., "Medical Record"
value        TEXT                -- encrypted sensitive value
record_type  VARCHAR(10)         -- 'text' | 'file'
file_name    VARCHAR(255)
file_size    INTEGER
file_url     VARCHAR(500)
created_at   TIMESTAMP WITH TIME ZONE
```

#### `consents`
```sql
id              SERIAL PRIMARY KEY
user_id         INTEGER REFERENCES users(id)
app_name        VARCHAR(200)        -- requester display name
data_type       VARCHAR(200)        -- what data is requested
purpose         TEXT                -- stated reason
duration        VARCHAR(100)        -- e.g., "30 Days", "Permanent"
risk_level      VARCHAR(10)         -- 'low' | 'medium' | 'high'
risk_score      INTEGER             -- 0-100 ML score
status          VARCHAR(20)         -- PENDING | GRANTED | DENIED | REVOKED
requester_type  VARCHAR(10)         -- 'app' | 'website'
requester_url   VARCHAR(500)        -- URL for website requesters
expires_at      TIMESTAMP WITH TIME ZONE
reminder_sent   BOOLEAN DEFAULT FALSE
created_at      TIMESTAMP WITH TIME ZONE
updated_at      TIMESTAMP WITH TIME ZONE
```

#### `audit_logs`
```sql
id           SERIAL PRIMARY KEY
user_id      INTEGER REFERENCES users(id)
event_type   VARCHAR(100)    -- e.g., "Consent Granted"
app_name     VARCHAR(200)
data_accessed TEXT
status       VARCHAR(50)
created_at   TIMESTAMP WITH TIME ZONE
```

#### `notifications`
```sql
id          SERIAL PRIMARY KEY
user_id     INTEGER REFERENCES users(id)
title       VARCHAR(200)
message     TEXT
type        VARCHAR(50)
is_read     BOOLEAN DEFAULT FALSE
created_at  TIMESTAMP WITH TIME ZONE
```

#### `sessions`
```sql
id           UUID PRIMARY KEY
user_id      INTEGER REFERENCES users(id)
ip_address   VARCHAR(45)
user_agent   TEXT
created_at   TIMESTAMP WITH TIME ZONE
last_used_at TIMESTAMP WITH TIME ZONE
is_revoked   BOOLEAN DEFAULT FALSE
```

#### `consent_history`
```sql
id          SERIAL PRIMARY KEY
consent_id  INTEGER REFERENCES consents(id)
status      VARCHAR(20)
changed_by  INTEGER REFERENCES users(id)
note        TEXT
changed_at  TIMESTAMP WITH TIME ZONE
```

---

## 6. Backend API Design

### 6.1 API Endpoints

#### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new user + send welcome email |
| POST | `/login` | Login + return JWT + handle 2FA |
| POST | `/verify-otp` | Verify OTP for 2FA |
| POST | `/forgot-password` | Send password reset email |
| POST | `/reset-password` | Reset password via token |
| GET | `/me` | Get current user profile |

#### Consents (`/api/consents`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List consents (paginated, sorted) |
| POST | `/` | Create new consent request (with ML scoring) |
| PATCH | `/:id/status` | Update status (Grant/Deny/Revoke) |
| GET | `/bulk` | Bulk status update |

#### Data Vault (`/api/data`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all user data records |
| POST | `/` | Add text data entry |
| POST | `/upload` | Upload file (PDF, DOC, images) |
| GET | `/:id/view` | View file in browser (inline) |
| GET | `/:id/download` | Download file |
| GET | `/export` | Export all data as JSON |
| DELETE | `/:id` | Delete data record + file |

#### ML Service (`/api/ml`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/score` | Score a consent request (0-100) |
| GET | `/health` | ML service status + model info |

#### Other Routes
| Route | Description |
|-------|-------------|
| `/api/analytics` | Dashboard metrics (counts, charts) |
| `/api/audit` | Audit log (paginated) |
| `/api/notifications` | User notifications (read/unread) |
| `/api/activity` | Recent activity feed |
| `/api/search` | Global search across records |
| `/api/user` | Profile update, avatar upload, 2FA toggle, session management |

### 6.2 Security Implementation

- **JWT Authentication**: All routes (except auth) require Bearer token
- **Role-Based Access Control**: Admin routes protected with role check middleware
- **bcrypt**: Password hashing with salt rounds = 10
- **AES-256 Encryption**: Sensitive vault data encrypted at rest
- **Helmet.js**: HTTP security headers (CSP, HSTS, X-Frame-Options, etc.)
- **CORS**: Strict origin allowlist
- **Rate Limiting**: Applied on auth endpoints
- **Session Tracking**: IP + User-Agent logged per login
- **Auto-Expiry**: Consents auto-revoked on expiry (every 5 min cron)

---

## 7. Frontend Architecture

### 7.1 Pages / Views

| Page | Route | Description |
|------|-------|-------------|
| Login | `/login` | JWT-based login with 2FA support |
| Signup | `/signup` | Registration with email verification |
| Verify OTP | `/verify-otp` | 2FA OTP entry |
| Forgot Password | `/forgot-password` | Password reset request |
| Reset Password | `/reset-password` | Token-based password reset |
| Dashboard | `/dashboard` | Analytics overview, activity feed, charts |
| Data Vault | `/data-vault` | Personal data storage + file uploads |
| Consent Hub | `/consents` | Consent lifecycle management |
| Audit Logs | `/audit` | Immutable event ledger |
| Settings | `/settings` | Profile, 2FA, sessions, export, delete account |
| Admin Users | `/admin/users` | User management (admin only) |

### 7.2 Key Frontend Features

- **Real-time Notifications**: WebSocket connection for live push notifications
- **Notification Bell**: Badge count, read/unread management
- **Dark Mode**: Full dark UI with premium design system
- **Data Table**: Sortable, paginated, searchable tables
- **File Upload**: Drag-and-drop file upload to Data Vault
- **File Viewer**: Files open in browser with correct MIME type
- **Live ML Preview**: Risk score preview as user fills consent form
- **Export Data**: Download all personal data as JSON
- **Delete Account**: Confirmation dialog requiring email re-entry
- **Avatar Upload**: Profile photo with preview
- **Session Management**: View and revoke active sessions

---

## 8. ML Risk Scoring System

### 8.1 Overview

ZeroShare includes a dedicated **Python FastAPI microservice** for consent risk scoring. It operates in two phases:

**Phase 1 — Rule-Based (Day 1, zero training data required)**
**Phase 2 — Logistic Regression ML (after 50+ admin decisions)**

### 8.2 Risk Features

| Feature | Weight Signal |
|---------|--------------|
| High-risk data type (passport, medical, SSN, biometric) | +40 points |
| Medium-risk data type (financial, email, location, contacts) | +20 points |
| Suspicious purpose (advertising, tracking, selling, profiling) | +25 points |
| Vague purpose (< 20 characters) | +10 points |
| Long duration (≥ 1 year or permanent) | +20 points |
| Medium duration (3–12 months) | +10 points |
| Website requester (vs app) | +5 points |
| Non-HTTPS website URL | +10 points |

### 8.3 ML Model

- **Algorithm**: Logistic Regression (gradient descent, 1000 iterations)
- **Training Data**: Real admin decisions (GRANTED=safe, DENIED/REVOKED=risky)
- **Model Storage**: JSON weights file (persisted via Docker volume)
- **Auto-Retrain**: Every 24 hours via backend cron job
- **Minimum Samples**: 50 decisions before ML activates (rule-based until then)
- **Accuracy Tracking**: Stored with each model version

### 8.4 API Response Example

```json
{
  "score": 72,
  "risk_level": "high",
  "confidence": "rule-based",
  "factors": [
    "⚠️ Sensitive data type (identity / health / financial)",
    "🚩 Purpose involves marketing, profiling, or data sharing",
    "⏳ Long access duration (1 year or more / permanent)",
    "🔒 Website uses HTTPS"
  ]
}
```

---

## 9. Email Notification System

ZeroShare sends the following transactional emails via Gmail SMTP:

| Trigger | Email Subject |
|---------|--------------|
| Registration | 🎉 Welcome to ZeroShare |
| 2FA Login | 🔐 Your ZeroShare verification code |
| Password Reset | Reset your ZeroShare password |
| Consent Granted | ✅ Your consent has been approved |
| Consent Denied | ❌ Your consent request was denied |
| Consent Revoked | 🔒 Access has been revoked |
| Consent Expiring | ⚠️ Your consent expires soon |
| Consent Expired | Consent auto-revoked |

---

## 10. Docker Deployment

### 10.1 Services

```yaml
Services:
  postgres      # PostgreSQL 16 database
  backend       # Node.js Express API
  frontend      # React app served by Nginx
  ml-service    # Python FastAPI ML risk scorer

Volumes:
  pgdata        # Persistent database storage
  mlmodel       # Persistent ML model weights
```

### 10.2 Startup Flow

1. PostgreSQL starts and passes health check
2. Backend starts → runs auto-migrations → starts API + WebSocket
3. Frontend (Nginx) starts → proxies `/api/*` to backend
4. ML service starts → loads existing model (if any) → ready for scoring

### 10.3 Auto-Migration

On every backend startup, the system automatically runs all `ALTER TABLE IF NOT EXISTS` migrations — no manual migration commands needed by friends/collaborators.

---

## 11. Key Design Decisions

| Decision | Rationale |
|---------|-----------|
| JWT over sessions | Stateless, scalable, works with WebSocket |
| PostgreSQL over NoSQL | Structured relational data with referential integrity |
| AES-256 encryption | Industry standard for sensitive data at rest |
| FastAPI for ML | Python's ML ecosystem, async, auto-docs |
| Rule-based → ML | Cold start problem: works day 1, improves with data |
| Docker compose | Zero-setup for friends/collaborators |
| Nginx reverse proxy | Single port (80), no CORS issues in production |
| WebSocket for notifications | Real-time UX without polling |
| Consent auto-expiry | Enforces time-limited access commitments |

---

## 12. Privacy & Compliance Features

- **Data Minimization**: Users store only what they choose
- **Purpose Limitation**: Every consent requires a stated purpose
- **Consent Withdrawal**: Users can revoke any consent at any time
- **Access Transparency**: Full audit log of every data event
- **Data Portability**: Export all personal data as JSON (GDPR Article 20)
- **Right to Erasure**: Delete account removes all data (GDPR Article 17)
- **Time-Limited Access**: Consent expiry enforces duration limits
- **Risk Transparency**: ML score shown before granting consent

---

## 13. Future Enhancements

1. End-to-end encryption for vault data (client-side encryption)
2. OAuth2 / OpenID Connect integration
3. Automated GDPR/DPDPA compliance reports
4. Mobile application (React Native)
5. Blockchain-based immutable consent ledger
6. Third-party API integration for real app verification
7. Anomaly detection for unusual data access patterns
8. Multi-language support

---

## 14. Project Statistics

| Metric | Value |
|--------|-------|
| Frontend Pages | 11 |
| Backend API Routes | 10 modules |
| Database Tables | 7 |
| Docker Services | 4 |
| Email Templates | 8 |
| ML Risk Features | 8 |
| Lines of Code (approx.) | 8,000+ |
| Languages Used | JavaScript, Python, SQL |

---

*ZeroShare — Built with Privacy-by-Design principles.*
