"""
ZeroShare ML Risk Scoring Service
FastAPI microservice — Phase 1: rule-based scoring (works Day 1 with zero data)
Phase 2: real ML model kicks in after 50+ labelled decisions (auto-retrain nightly)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os, json, math, re, logging, hashlib
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

        # ── Signal 9: Cookie Detection ────────────────────────────────────────
        # Check Set-Cookie headers (actual cookies being set)
        set_cookie = resp_headers.get('set-cookie', '')
        cookie_names = re.findall(r'(?:^|,\s*)([a-zA-Z_][a-zA-Z0-9_\-]*)=', set_cookie)
        tracking_cookies = []
        TRACKING_COOKIE_PATTERNS = {
            '_ga': 'Google Analytics tracking cookie (tracks every page you visit)',
            '_gid': 'Google Analytics session cookie',
            '_fbp': 'Facebook Pixel cookie (tracks you across Facebook partner sites)',
            '_fbc': 'Facebook click tracking cookie',
            'fr': 'Facebook advertising cookie',
            'IDE': 'Google DoubleClick ad targeting cookie',
            'NID': 'Google personalisation cookie',
            '__utma': 'Google Analytics long-term tracking cookie',
            '_hjid': 'Hotjar user identification cookie (records your session)',
            'intercom': 'Intercom customer tracking cookie',
            'amplitude': 'Amplitude behaviour analytics cookie',
            'mp_': 'Mixpanel analytics cookie',
        }
        for cname in cookie_names:
            for pattern, desc in TRACKING_COOKIE_PATTERNS.items():
                if cname.startswith(pattern):
                    tracking_cookies.append(f"{cname} — {desc}")

        if tracking_cookies:
            score += 5 * len(tracking_cookies)
            factors.append(f"🍪 Tracking cookies set on your browser: {len(tracking_cookies)} found")
            for tc in tracking_cookies[:4]:  # show up to 4
                factors.append(f"   └ {tc}")
        else:
            factors.append("✅ No known tracking cookies detected in response headers")

        # Check for cookie consent UI in HTML
        if re.search(r'cookie\s*consent|accept\s*(all\s*)?cookie|gdpr|we use cookies|cookie\s*policy|cookiebanner|cookie-banner', html):
            factors.append("✅ Cookie consent banner found — site asks permission before tracking")
        else:
            score += 8
            factors.append("⚠️ No cookie consent banner — site may track you without asking permission (GDPR violation)")

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
# Feature 1 — Data Breach Checker (HIBP free API)
# ---------------------------------------------------------------------------

class BreachCheckRequest(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None

@app.post("/check-breach")
async def check_breach(req: BreachCheckRequest):
    """Check email/password against real breach databases. Password uses k-anonymity (never sent in full)."""
    results = {}

    # ── Password check (HIBP Range API — free, k-anonymity, password never sent) ──
    if req.password:
        try:
            sha1 = hashlib.sha1(req.password.encode('utf-8')).hexdigest().upper()
            prefix, suffix = sha1[:5], sha1[5:]
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(
                    f"https://api.pwnedpasswords.com/range/{prefix}",
                    headers={"Add-Padding": "true"}
                )
            count = 0
            for line in resp.text.splitlines():
                h, c = line.strip().split(':')
                if h == suffix:
                    count = int(c)
                    break
            if count > 0:
                results['password'] = {
                    'breached': True,
                    'count': count,
                    'severity': 'critical' if count > 10000 else 'high' if count > 100 else 'medium',
                    'message': f"⚠️ This password appeared in {count:,} real data breaches. Change it immediately on every site you use it!",
                    'recommendation': "Use a unique password with 12+ characters, numbers and symbols."
                }
            else:
                results['password'] = {
                    'breached': False,
                    'message': "✅ Password not found in any known breach database.",
                }
        except Exception as e:
            results['password'] = {'error': f'Could not check password: {str(e)}'}

    # ── Email check (HIBP v3 — needs API key, or guide user to check manually) ──
    if req.email:
        api_key = os.getenv('HIBP_API_KEY', '')
        if api_key:
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.get(
                        f"https://haveibeenpwned.com/api/v3/breachedaccount/{req.email}?truncateResponse=false",
                        headers={'hibp-api-key': api_key, 'user-agent': 'ZeroShare-RiskPlatform/1.0'}
                    )
                if resp.status_code == 200:
                    breaches = resp.json()
                    results['email'] = {
                        'breached': True,
                        'count': len(breaches),
                        'message': f"🔴 Email found in {len(breaches)} data breach(es)!",
                        'breaches': [
                            {
                                'name': b['Name'],
                                'date': b['BreachDate'],
                                'data_leaked': b.get('DataClasses', [])[:5],
                                'description': re.sub('<[^<]+?>', '', b.get('Description', ''))[:120]
                            } for b in breaches[:5]
                        ]
                    }
                elif resp.status_code == 404:
                    results['email'] = {'breached': False, 'message': "✅ Email not found in any known breach."}
                else:
                    results['email'] = {'error': f'HIBP API error: {resp.status_code}'}
            except Exception as e:
                results['email'] = {'error': str(e)}
        else:
            # No API key — still give useful result with direct link
            results['email'] = {
                'breached': None,
                'message': "ℹ️ Add HIBP_API_KEY to ml-service env for automated email breach check.",
                'check_url': f"https://haveibeenpwned.com/account/{req.email}",
                'action': f"Click to manually check {req.email} on HaveIBeenPwned →"
            }

    return results


# ---------------------------------------------------------------------------
# Feature 2 — Phishing URL Detector
# ---------------------------------------------------------------------------

MAJOR_BRANDS = {
    'google': 'google.com', 'facebook': 'facebook.com', 'amazon': 'amazon.com',
    'paypal': 'paypal.com', 'microsoft': 'microsoft.com', 'apple': 'apple.com',
    'netflix': 'netflix.com', 'instagram': 'instagram.com', 'twitter': 'twitter.com',
    'linkedin': 'linkedin.com', 'github': 'github.com', 'yahoo': 'yahoo.com',
    'dropbox': 'dropbox.com', 'spotify': 'spotify.com', 'uber': 'uber.com',
    'airbnb': 'airbnb.com', 'whatsapp': 'whatsapp.com', 'zoom': 'zoom.us',
}

HOMOGLYPHS = {'0': 'o', '1': 'l', '3': 'e', '4': 'a', '5': 's', '@': 'a', 'vv': 'w'}

class PhishingCheckRequest(BaseModel):
    url: str

@app.post("/check-phishing")
def check_phishing(req: PhishingCheckRequest):
    """Detect phishing / lookalike domains before user shares credentials."""
    url = req.url.strip()
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url

    parsed = urlparse(url)
    raw_domain = parsed.netloc.lower()
    domain = re.sub(r'^www\.', '', raw_domain)
    domain_root = domain.split('.')[0] if '.' in domain else domain

    score = 0
    warnings = []
    safe_signals = []

    # ── IP address as domain ──────────────────────────────────────────────────
    if re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', raw_domain):
        score += 60
        warnings.append("🔴 URL uses an IP address instead of a domain name — strong phishing indicator. Legitimate sites use domain names.")

    # ── Exact known safe domain ───────────────────────────────────────────────
    is_official = any(domain == legit or domain.endswith('.' + legit) for legit in MAJOR_BRANDS.values())
    if is_official:
        safe_signals.append("✅ Domain matches a verified official brand domain")

    if not is_official:
        # ── Brand name in domain but not official ─────────────────────────────
        for brand, official in MAJOR_BRANDS.items():
            if brand in domain and domain != official and not domain.endswith('.' + official):
                score += 35
                warnings.append(f"⚠️ Domain contains '{brand}' but is NOT {official} — possible impersonation of {brand.capitalize()}")
                break

        # ── Homoglyph / number substitution ──────────────────────────────────
        normalized = domain_root
        for digit, letter in HOMOGLYPHS.items():
            normalized = normalized.replace(digit, letter)
        for brand in MAJOR_BRANDS:
            if normalized == brand and domain_root != brand:
                score += 55
                warnings.append(f"🎭 HOMOGLYPH ATTACK: '{domain_root}' looks like '{brand}' using character substitution — classic phishing tactic")
                break

        # ── Extra hyphens around brand name ───────────────────────────────────
        for brand in MAJOR_BRANDS:
            if f"-{brand}" in domain or f"{brand}-" in domain:
                score += 30
                warnings.append(f"⚠️ Hyphenated brand name '{domain}' — official sites never use hyphens around their brand name")
                break

        # ── Too many subdomains ────────────────────────────────────────────────
        parts = domain.split('.')
        if len(parts) > 3:
            score += 20
            warnings.append(f"⚠️ Unusually deep subdomain ({'.'.join(parts[:-2])}.<brand>.com pattern) — phishing sites hide behind real-looking subdomains")

        # ── Suspicious keywords in URL ─────────────────────────────────────────
        phish_keywords = ['login', 'signin', 'verify', 'secure', 'account', 'update', 'confirm', 'banking', 'wallet']
        found_keywords = [k for k in phish_keywords if k in domain]
        if found_keywords:
            score += 10 * len(found_keywords)
            warnings.append(f"⚠️ Suspicious keywords in domain: {', '.join(found_keywords)} — phishing sites use urgency words to trick users")

        # ── HTTP (no SSL) ──────────────────────────────────────────────────────
        if parsed.scheme == 'http':
            score += 20
            warnings.append("🔓 No HTTPS — any data you enter (passwords, emails) is transmitted unencrypted")

        # ── Suspicious TLD ─────────────────────────────────────────────────────
        if any(domain.endswith(tld) for tld in SUSPICIOUS_TLDS):
            score += 15
            warnings.append("⚠️ Suspicious domain extension — frequently used in phishing campaigns")

    if not warnings:
        safe_signals.append("✅ No phishing patterns detected in URL structure")

    score = min(score, 100)
    if score >= 60:
        risk_level = "high"
        verdict = "🔴 HIGH PHISHING RISK — Do NOT enter passwords or personal data on this site"
    elif score >= 30:
        risk_level = "medium"
        verdict = "🟡 SUSPICIOUS URL — Verify this is the official site before entering any data"
    else:
        risk_level = "low"
        verdict = "🟢 URL appears legitimate — no major phishing patterns detected"

    return {
        "score": score,
        "risk_level": risk_level,
        "verdict": verdict,
        "domain": raw_domain,
        "warnings": warnings,
        "safe_signals": safe_signals,
    }


# ---------------------------------------------------------------------------
# Feature 5 — Smart Duration Recommender
# ---------------------------------------------------------------------------

@app.post("/suggest-duration")
def suggest_duration(req: ConsentScoreRequest):
    """Recommend the safest appropriate consent duration based on data type + purpose."""
    dt = req.data_type.lower()
    purpose = req.purpose.lower()
    is_suspicious = any(k in purpose for k in SUSPICIOUS_PURPOSES)
    is_high_risk = any(k in dt for k in HIGH_RISK_DATA)
    is_medium_risk = any(k in dt for k in MEDIUM_RISK_DATA)

    if is_high_risk and is_suspicious:
        return {"suggested_duration": "7 Days", "reason": "High-risk data + suspicious purpose — minimum duration strongly recommended", "confidence": "high"}
    elif is_high_risk:
        return {"suggested_duration": "30 Days", "reason": "Sensitive data type (identity/health/financial) — keep access short", "confidence": "high"}
    elif is_suspicious:
        return {"suggested_duration": "14 Days", "reason": "Purpose involves marketing or data sharing — minimal duration advised", "confidence": "high"}
    elif is_medium_risk:
        days = days_from_duration(req.duration)
        if days > 180:
            return {"suggested_duration": "3 Months", "reason": "Moderate-risk data — 3 months balances usability and privacy", "confidence": "medium"}
        return {"suggested_duration": req.duration, "reason": "Duration looks appropriate for this data type", "confidence": "medium"}
    else:
        return {"suggested_duration": "6 Months", "reason": "Low-risk data — 6 months is a reasonable standard duration", "confidence": "low"}


# ---------------------------------------------------------------------------
# Feature 9 — Data Minimization Checker
# ---------------------------------------------------------------------------

# Maps purpose keywords → what data types are actually needed for that purpose
PURPOSE_DATA_MAP = {
    "weather":        ["location", "gps", "zip", "city"],
    "navigation":     ["location", "gps", "address"],
    "music":          ["email"],
    "streaming":      ["email", "payment", "billing"],
    "food delivery":  ["location", "address", "phone", "email", "payment"],
    "ride sharing":   ["location", "phone", "email", "payment"],
    "social":         ["email", "phone", "name", "photo", "contacts"],
    "fitness":        ["location", "health", "activity", "email"],
    "finance":        ["bank", "financial", "tax", "income", "identity", "ssn"],
    "healthcare":     ["medical", "health", "insurance", "identity"],
    "education":      ["email", "name", "age"],
    "shopping":       ["email", "address", "payment", "phone"],
    "advertising":    ["email", "browsing"],
    "analytics":      ["browsing", "activity"],
    "authentication": ["email", "phone"],
    "verification":   ["identity", "passport", "aadhaar", "ssn", "national id"],
}

# Data types that are almost never justified
RARELY_JUSTIFIED = ["genetic", "biometric", "fingerprint", "retina", "dna"]

class MinimizationRequest(BaseModel):
    app_name: str
    data_type: str
    purpose: str

@app.post("/check-minimization")
def check_minimization(req: MinimizationRequest):
    """Detect if an app is asking for more data than its stated purpose requires."""
    dt = req.data_type.lower()
    purpose = req.purpose.lower()
    app = req.app_name.lower()

    flags = []
    safe_signals = []
    excessive = False
    severity = "low"

    # ── Check: data type is rarely justified ──────────────────────────────────
    if any(k in dt for k in RARELY_JUSTIFIED):
        flags.append(f"🔴 '{req.data_type}' is rarely justified for any consumer app — extremely sensitive biometric/genetic data")
        excessive = True
        severity = "high"

    # ── Check: purpose vs expected data types ─────────────────────────────────
    matched_purpose = None
    for key, allowed_types in PURPOSE_DATA_MAP.items():
        if key in purpose or key in app:
            matched_purpose = key
            # Check if current data type is relevant
            is_relevant = any(allowed in dt or dt in allowed for allowed in allowed_types)
            if not is_relevant:
                flags.append(
                    f"⚠️ A '{key}' app typically needs: {', '.join(allowed_types)} — "
                    f"but is requesting '{req.data_type}' which seems excessive"
                )
                excessive = True
                severity = "high" if any(k in dt for k in HIGH_RISK_DATA) else "medium"
            else:
                safe_signals.append(f"✅ '{req.data_type}' is expected for a {key} purpose")
            break

    # ── Check: high-risk data for advertising/analytics ───────────────────────
    if any(k in purpose for k in ["advertising", "marketing", "analytics", "profiling"]):
        if any(k in dt for k in HIGH_RISK_DATA):
            flags.append(
                f"🔴 Highly sensitive data ('{req.data_type}') requested for '{req.purpose}' — "
                f"advertising/analytics never requires identity or medical data"
            )
            excessive = True
            severity = "high"

    # ── Check: no recognizable purpose match ──────────────────────────────────
    if matched_purpose is None and not any(k in dt for k in RARELY_JUSTIFIED):
        safe_signals.append("ℹ️ Could not map purpose to a known category — manual review recommended")

    if not flags:
        safe_signals.append(f"✅ '{req.data_type}' appears proportionate to the stated purpose")

    verdict = (
        "🔴 EXCESSIVE DATA REQUEST — This app is collecting more data than its purpose requires"
        if severity == "high" else
        "🟡 POSSIBLY EXCESSIVE — Some data may be unnecessary for this purpose"
        if severity == "medium" else
        "🟢 Data request appears proportionate to the stated purpose"
    )

    return {
        "excessive": excessive,
        "severity": severity,
        "verdict": verdict,
        "flags": flags,
        "safe_signals": safe_signals,
        "app_name": req.app_name,
        "data_type": req.data_type,
        "purpose": req.purpose,
    }


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

@app.on_event("startup")
def startup():
    load_ml_model()
    logger.info("🚀 ZeroShare ML Risk Scorer started")
