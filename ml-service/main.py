"""
ZeroShare ML Risk Scoring Service
FastAPI microservice — Phase 1: rule-based scoring (works Day 1 with zero data)
Phase 2: real ML model kicks in after 50+ labelled decisions (auto-retrain nightly)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os, json, math, re, logging
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse
import httpx

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ml-service")

app = FastAPI(title="ZeroShare ML Risk Scorer", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

class ConsentScoreRequest(BaseModel):
    app_name: str
    data_type: str
    purpose: str
    duration: str
    requester_type: Optional[str] = "app"
    requester_url: Optional[str] = None

class ConsentScoreResponse(BaseModel):
    score: int           # 0-100  (higher = riskier)
    risk_level: str      # "low" | "medium" | "high"
    confidence: str      # "rule-based" | "ml-model"
    factors: list[str]   # human-readable explanation bullets


# ---------------------------------------------------------------------------
# Phase 1 — Rule-based scoring (always available)
# ---------------------------------------------------------------------------

HIGH_RISK_DATA = [
    "passport", "aadhaar", "ssn", "social security", "national id",
    "medical", "health", "diagnosis", "biometric", "fingerprint",
    "genetic", "tax", "bank account", "credit card", "debit card",
]

MEDIUM_RISK_DATA = [
    "financial", "salary", "income", "resume", "cv", "email",
    "phone", "address", "location", "gps", "browsing", "chat",
    "messages", "contacts", "calendar",
]

SUSPICIOUS_PURPOSES = [
    "advertising", "marketing", "sale", "sell", "share with third",
    "partner", "analytics", "profiling", "tracking",
]

LONG_DURATIONS = ["permanent", "lifetime", "unlimited", "forever"]

def days_from_duration(duration: str) -> int:
    """Convert duration string to approximate days."""
    d = duration.lower()
    if any(w in d for w in LONG_DURATIONS):
        return 99999
    nums = re.findall(r'\d+', d)
    n = int(nums[0]) if nums else 30
    if "year" in d:  return n * 365
    if "month" in d: return n * 30
    return n  # default: days

def rule_based_score(req: ConsentScoreRequest) -> ConsentScoreResponse:
    score = 0
    factors = []
    dt = req.data_type.lower()
    purpose = req.purpose.lower()

    # --- Data type risk ---
    if any(k in dt for k in HIGH_RISK_DATA):
        score += 40
        factors.append("⚠️ Sensitive data type (identity / health / financial)")
    elif any(k in dt for k in MEDIUM_RISK_DATA):
        score += 20
        factors.append("📊 Moderate-sensitivity data type (personal/contact info)")
    else:
        factors.append("✅ Low-sensitivity data type")

    # --- Purpose risk ---
    if any(k in purpose for k in SUSPICIOUS_PURPOSES):
        score += 25
        factors.append("🚩 Purpose involves marketing, profiling, or data sharing")
    elif len(purpose) < 20:
        score += 10
        factors.append("⚠️ Vague or very short purpose statement")
    else:
        factors.append("✅ Purpose appears specific and legitimate")

    # --- Duration risk ---
    days = days_from_duration(req.duration)
    if days >= 365:
        score += 20
        factors.append("⏳ Long access duration (1 year or more / permanent)")
    elif days >= 90:
        score += 10
        factors.append("📅 Moderate access duration (3–12 months)")
    else:
        factors.append("✅ Short access duration (< 3 months)")

    # --- Requester type bonus risk ---
    if req.requester_type == "website":
        score += 5
        factors.append("🌐 External website requester (higher exposure surface)")

    # --- URL check ---
    if req.requester_url:
        url = req.requester_url.lower()
        if not url.startswith("https://"):
            score += 10
            factors.append("🔓 Website uses HTTP (not HTTPS) — insecure channel")
        else:
            factors.append("🔒 Website uses HTTPS")

    score = min(score, 100)

    if score >= 60:
        risk_level = "high"
    elif score >= 30:
        risk_level = "medium"
    else:
        risk_level = "low"

    return ConsentScoreResponse(
        score=score,
        risk_level=risk_level,
        confidence="rule-based",
        factors=factors,
    )


# ---------------------------------------------------------------------------
# Phase 2 — ML model (loads if model file exists)
# ---------------------------------------------------------------------------

MODEL_PATH = Path(os.getenv("MODEL_PATH", "/ml-service/model/risk_model.json"))
_ml_model = None

def load_ml_model():
    global _ml_model
    if MODEL_PATH.exists():
        try:
            with open(MODEL_PATH) as f:
                _ml_model = json.load(f)
            logger.info(f"✅ ML model loaded from {MODEL_PATH} ({_ml_model.get('samples',0)} training samples)")
        except Exception as e:
            logger.warning(f"Could not load ML model: {e}")
            _ml_model = None

def ml_predict(req: ConsentScoreRequest):
    """
    Simple logistic-regression-style model stored as JSON weights.
    Falls back to rule-based if model is absent or has < 50 samples.
    """
    if _ml_model is None or _ml_model.get("samples", 0) < 50:
        return None

    weights = _ml_model.get("weights", {})
    bias = _ml_model.get("bias", 0)

    # Feature vector (same as training)
    dt = req.data_type.lower()
    purpose = req.purpose.lower()
    days = days_from_duration(req.duration)

    features = {
        "high_risk_data":   1 if any(k in dt for k in HIGH_RISK_DATA) else 0,
        "medium_risk_data": 1 if any(k in dt for k in MEDIUM_RISK_DATA) else 0,
        "suspicious_purpose": 1 if any(k in purpose for k in SUSPICIOUS_PURPOSES) else 0,
        "vague_purpose":    1 if len(purpose) < 20 else 0,
        "long_duration":    1 if days >= 365 else 0,
        "medium_duration":  1 if 90 <= days < 365 else 0,
        "is_website":       1 if req.requester_type == "website" else 0,
        "no_https":         1 if (req.requester_url and not req.requester_url.lower().startswith("https://")) else 0,
    }

    logit = bias + sum(weights.get(k, 0) * v for k, v in features.items())
    prob = 1 / (1 + math.exp(-logit))  # sigmoid → 0..1
    score = round(prob * 100)

    if score >= 60:
        risk_level = "high"
    elif score >= 30:
        risk_level = "medium"
    else:
        risk_level = "low"

    return ConsentScoreResponse(
        score=score,
        risk_level=risk_level,
        confidence="ml-model",
        factors=[f"ML model prediction (trained on {_ml_model['samples']} decisions, accuracy {_ml_model.get('accuracy','?')})"],
    )


# ---------------------------------------------------------------------------
# Training endpoint — called nightly from backend cron
# ---------------------------------------------------------------------------

class TrainRequest(BaseModel):
    samples: list[dict]  # [{data_type, purpose, duration, requester_type, label}]

@app.post("/train")
def train(req: TrainRequest):
    """
    Simple logistic regression via gradient descent.
    Stores weights to disk so they survive container restarts.
    """
    if len(req.samples) < 10:
        return {"status": "skipped", "reason": "Need at least 10 samples"}

    # Build feature matrix
    X, y = [], []
    for s in req.samples:
        dt = s.get("data_type","").lower()
        purpose = s.get("purpose","").lower()
        days = days_from_duration(s.get("duration","30 Days"))
        X.append([
            1 if any(k in dt for k in HIGH_RISK_DATA) else 0,
            1 if any(k in dt for k in MEDIUM_RISK_DATA) else 0,
            1 if any(k in purpose for k in SUSPICIOUS_PURPOSES) else 0,
            1 if len(purpose) < 20 else 0,
            1 if days >= 365 else 0,
            1 if 90 <= days < 365 else 0,
            1 if s.get("requester_type") == "website" else 0,
            1 if (s.get("requester_url") and not s["requester_url"].lower().startswith("https://")) else 0,
        ])
        # label: 1=high-risk (DENIED/REVOKED), 0=low-risk (GRANTED)
        label = s.get("label", 0)
        y.append(1 if label in [1, "DENIED", "REVOKED"] else 0)

    # Gradient descent
    n, d = len(X), len(X[0])
    w = [0.0] * d
    b = 0.0
    lr = 0.1
    FEATURE_NAMES = [
        "high_risk_data","medium_risk_data","suspicious_purpose",
        "vague_purpose","long_duration","medium_duration","is_website","no_https"
    ]

    for _ in range(1000):
        dw = [0.0]*d; db = 0.0
        for xi, yi in zip(X, y):
            z = b + sum(w[j]*xi[j] for j in range(d))
            p = 1/(1+math.exp(-z))
            err = p - yi
            for j in range(d):
                dw[j] += err * xi[j]
            db += err
        for j in range(d):
            w[j] -= lr * dw[j] / n
        b -= lr * db / n

    # Accuracy
    correct = 0
    for xi, yi in zip(X, y):
        z = b + sum(w[j]*xi[j] for j in range(d))
        p = 1/(1+math.exp(-z))
        correct += 1 if (round(p) == yi) else 0
    accuracy = round(correct / n * 100, 1)

    model_data = {
        "weights": dict(zip(FEATURE_NAMES, w)),
        "bias": b,
        "samples": n,
        "accuracy": f"{accuracy}%",
        "trained_at": datetime.utcnow().isoformat(),
    }

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(MODEL_PATH, "w") as f:
        json.dump(model_data, f, indent=2)

    load_ml_model()
    logger.info(f"✅ Model retrained on {n} samples, accuracy {accuracy}%")
    return {"status": "ok", "samples": n, "accuracy": f"{accuracy}%"}


# ---------------------------------------------------------------------------
# API endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "ok",
        "ml_model_loaded": _ml_model is not None,
        "ml_samples": _ml_model.get("samples", 0) if _ml_model else 0,
        "confidence_mode": "ml-model" if (_ml_model and _ml_model.get("samples",0) >= 50) else "rule-based",
    }


@app.post("/score", response_model=ConsentScoreResponse)
def score_consent(req: ConsentScoreRequest):
    """Score a consent request and return risk level + explanation."""
    # Try ML first
    ml_result = ml_predict(req)
    if ml_result:
        return ml_result
    # Fall back to rule-based
    return rule_based_score(req)


# ---------------------------------------------------------------------------
# Website Risk Analyzer — real HTTP fetch + signal detection
# ---------------------------------------------------------------------------

SUSPICIOUS_TLDS = ['.tk', '.ml', '.ga', '.cf', '.xyz', '.top', '.click', '.download', '.zip', '.review', '.country']
SUSPICIOUS_SCRIPTS = ['coinhive', 'cryptonight', 'eval(atob', 'document.write(unescape', 'cryptoloot', 'minero.cc']

class WebsiteAnalysisRequest(BaseModel):
    url: str

@app.post("/analyze-website")
async def analyze_website(req: WebsiteAnalysisRequest):
    """Fetch and analyze a real website for data-sharing risk signals."""
    url = req.url.strip()
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url

    parsed = urlparse(url)
    domain = parsed.netloc.lower()
    score = 0
    factors = []

    # ── Signal 1: HTTPS ──────────────────────────────────────────────────────
    if parsed.scheme != 'https':
        score += 30
        factors.append("🔓 Site uses HTTP — data transmitted unencrypted")
    else:
        factors.append("✅ Site uses HTTPS — encrypted connection")

    # ── Signal 2: Suspicious TLD ─────────────────────────────────────────────
    if any(domain.endswith(tld) for tld in SUSPICIOUS_TLDS):
        score += 20
        factors.append("⚠️ Suspicious domain extension — commonly used for phishing/spam")

    # ── Fetch the website ────────────────────────────────────────────────────
    html = ''
    resp_headers = {}
    fetch_failed = False

    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True, verify=False) as client:
            resp = await client.get(url, headers={
                'User-Agent': 'Mozilla/5.0 (compatible; ZeroShare-RiskBot/1.0)'
            })
        html = resp.text.lower()
        resp_headers = {k.lower(): v for k, v in resp.headers.items()}
        logger.info(f"✅ Fetched {url} — {len(html)} chars, status {resp.status_code}")
    except httpx.TimeoutException:
        score += 20
        factors.append("⚠️ Website timed out — server not responding reliably")
        fetch_failed = True
    except Exception as e:
        score += 10
        factors.append(f"⚠️ Could not connect to website: unreachable or invalid URL")
        fetch_failed = True

    # ── Known clone/mirror/unofficial sites ─────────────────────────────────
    KNOWN_CLONES = [
        ('nitmirror', 'Netflix'), ('netflixmirror', 'Netflix'),
        ('instagrammirror', 'Instagram'), ('fbmirror', 'Facebook'),
        ('youtubemirror', 'YouTube'), ('gmailmirror', 'Gmail'),
    ]
    for pattern, brand in KNOWN_CLONES:
        if pattern in domain:
            score += 40
            factors.append(f"🔴 CLONE SITE DETECTED — Unofficial mirror of {brand}. Logging in here will expose your {brand} credentials to unknown operators.")
            break

    if not fetch_failed:
        # ── Signal 3: OAuth / Social Login Detection ─────────────────────────
        oauth_providers = []
        if re.search(r'accounts\.google\.com|gsi/client|google.*sign.?in|sign.?in.*google|btn-google', html):
            oauth_providers.append('Google')
        if re.search(r'connect\.facebook\.net|fb-login|facebook.*login|login.*facebook|fb_login', html):
            oauth_providers.append('Facebook')
        if re.search(r'appleid\.apple\.com|sign.?in.*apple|apple.*sign.?in', html):
            oauth_providers.append('Apple')
        if re.search(r'login\.microsoftonline\.com|microsoft.*login|azure.*login|sign.?in.*microsoft', html):
            oauth_providers.append('Microsoft')
        if re.search(r'api\.twitter\.com|sign.?in.*twitter|twitter.*login', html):
            oauth_providers.append('Twitter/X')
        if re.search(r'github\.com/login|sign.?in.*github|github.*oauth', html):
            oauth_providers.append('GitHub')

        if oauth_providers:
            score += 15 * len(oauth_providers)
            providers_str = ', '.join(oauth_providers)
            factors.append(f"⚠️ OAUTH LOGIN DETECTED — Site offers '{providers_str}' sign-in. If you log in, {providers_str} will share your profile data (name, email, photo) with this site. Only proceed if you trust this site.")
        else:
            factors.append("✅ No social OAuth login detected")

        # ── Signal 4: Third-party Trackers ───────────────────────────────────
        trackers = []
        if re.search(r'google-analytics\.com|gtag\(|ga\(\'send|googletagmanager', html):
            trackers.append('Google Analytics')
        if re.search(r'connect\.facebook\.net.*fbevents|fbq\(|facebook pixel', html):
            trackers.append('Facebook Pixel')
        if re.search(r'hotjar\.com|hotjar', html):
            trackers.append('Hotjar (session recording)')
        if re.search(r'mixpanel\.com|mixpanel\.track', html):
            trackers.append('Mixpanel')
        if re.search(r'segment\.com|analytics\.js', html):
            trackers.append('Segment')
        if re.search(r'clarity\.ms|microsoft.*clarity', html):
            trackers.append('Microsoft Clarity (session recording)')
        if re.search(r'tiktok.*pixel|analytics\.tiktok', html):
            trackers.append('TikTok Pixel')

        if trackers:
            score += 5 * len(trackers)
            factors.append(f"📡 Third-party trackers found: {', '.join(trackers)} — your browsing behaviour on this site is shared with these companies")
        else:
            factors.append("✅ No known third-party behaviour trackers detected")

        # ── Signal 5: Third-party Form Submission ────────────────────────────
        form_actions = re.findall(r'<form[^>]+action=["\']([^"\']+)["\']', html)
        external_forms = [a for a in form_actions if a.startswith('http') and domain not in a]
        if external_forms:
            score += 20
            factors.append(f"🔴 Form submits data to external server — your input (email, password) may go to a third party")

        # ── Signal 6: Privacy Policy ─────────────────────────────────────────
        if re.search(r'privacy[\s\-_]?policy|privacy[\s\-_]?notice|datenschutz', html):
            factors.append("✅ Privacy policy detected — required by GDPR/DPDPA")
        else:
            score += 25
            factors.append("🔴 No privacy policy found — legally required; HIGH risk for data sharing")

        # ── Signal 7: Terms of Service ───────────────────────────────────────
        if re.search(r'terms\s+of\s+(service|use)|terms\s+and\s+conditions', html):
            factors.append("✅ Terms of service found")
        else:
            score += 10
            factors.append("⚠️ No terms of service found — unclear legal obligations")

        # ── Signal 8: Contact Information ────────────────────────────────────
        if re.search(r'contact[\s\-]?us|support@|info@|help@|mailto:', html):
            factors.append("✅ Contact information found")
        else:
            score += 5
            factors.append("⚠️ No contact information found")

        # ── Signal 9: Cookie Consent / GDPR ──────────────────────────────────
        if re.search(r'cookie\s*consent|accept\s*cookie|gdpr|we use cookies|cookie\s*policy', html):
            factors.append("✅ Cookie consent / GDPR mechanism detected")
        else:
            score += 5
            factors.append("⚠️ No cookie consent detected")

        # ── Signal 10: Suspicious Scripts ────────────────────────────────────
        if any(p in html for p in SUSPICIOUS_SCRIPTS):
            score += 30
            factors.append("🔴 Suspicious scripts detected — possible cryptominer or malware")
        else:
            factors.append("✅ No known malicious scripts detected")

        # ── Signal 11: Security Headers ──────────────────────────────────────
        missing_headers = []
        if 'x-frame-options' not in resp_headers:
            missing_headers.append('X-Frame-Options')
            score += 3
        if 'content-security-policy' not in resp_headers:
            missing_headers.append('CSP')
            score += 3
        if 'x-content-type-options' not in resp_headers:
            missing_headers.append('X-Content-Type-Options')
            score += 2

        if missing_headers:
            factors.append(f"⚠️ Missing security headers: {', '.join(missing_headers)}")
        else:
            factors.append("✅ All key security headers present")

        # ── Signal 12: Password field (credential collection) ────────────────
        if re.search(r'type=["\']password["\']', html):
            factors.append("ℹ️ Site collects passwords — only enter credentials if you fully trust this site")

    score = min(score, 100)

    if score >= 60:
        risk_level = "high"
    elif score >= 30:
        risk_level = "medium"
    else:
        risk_level = "low"

    return {
        "score": score,
        "risk_level": risk_level,
        "url": url,
        "domain": domain,
        "factors": factors,
        "fetch_success": not fetch_failed,
    }


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

@app.on_event("startup")
def startup():
    load_ml_model()
    logger.info("🚀 ZeroShare ML Risk Scorer started")
