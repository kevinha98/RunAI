# Strava API – Komplett utviklerguide

> Kilde: [developers.strava.com](https://developers.strava.com/docs/getting-started/)  
> Sist oppdatert: 2026-05-08

---

## Innholdsfortegnelse

- [A. Grunnleggende info](#a-grunnleggende-info)
- [B. Opprett konto og app](#b-opprett-konto-og-app)
- [C. Autentisering med OAuth 2.0](#c-autentisering-med-oauth-20)
- [D. Token-håndtering og refresh](#d-token-håndtering-og-refresh)
- [E. Gjøre API-kall](#e-gjøre-api-kall)
- [F. Rate limits](#f-rate-limits)
- [G. Feilkoder og error handling](#g-feilkoder-og-error-handling)
- [H. Webhooks](#h-webhooks)
- [I. Viktige endepunkter](#i-viktige-endepunkter)
- [J. Swagger Playground](#j-swagger-playground)
- [K. Best practices – oppsummering](#k-best-practices--oppsummering)
- [L. Ressurser og support](#l-ressurser-og-support)

---

## A. Grunnleggende info

Strava REST API (v3) gir tilgang til data om:

| Kategori | Eksempel på data |
|----------|-----------------|
| Utøvere (athletes) | Profil, statistikk, utstyr |
| Aktiviteter | Løp, sykling, svømming m.m. |
| Segmenter | Ruter, leaderboards |
| Klubber | Medlemmer, aktiviteter |
| Ruter | Egendefinerte ruter |

**Base URL:** `https://www.strava.com/api/v3`  
**Format:** JSON  
**Auth:** OAuth 2.0 Bearer Token

### Rate limits (standardgrenser)

| Grense | Totalt | "Non-upload" endepunkter |
|--------|--------|--------------------------|
| Per 15 min | 200 forespørsler | 100 forespørsler |
| Per dag | 2 000 forespørsler | 1 000 forespørsler |

> "Non-upload"-grensen gjelder alle endepunkter **unntatt** `POST /activities`, `POST /uploads` og `activities#upload_media`.

Grensene tilbakestilles ved naturlige 15-minutters-intervaller (xx:00, xx:15, xx:30, xx:45) og daglig ved midnatt UTC.

---

## B. Opprett konto og app

1. Registrer deg på [strava.com/register](https://www.strava.com/register)
2. Gå til [strava.com/settings/api](https://www.strava.com/settings/api) og opprett en app
3. Sett **Authorization Callback Domain** til `localhost` under utvikling

### Forklaring av felter i API-innstillingene

| Felt | Beskrivelse | Hemmelig? |
|------|-------------|-----------|
| **Client ID** | Din app-ID (kan deles) | Nei |
| **Client Secret** | Hemmelig nøkkel for autentisering | **JA** |
| **Access Token** | Kortlivet token – utløper hvert 6. time | **JA** |
| **Refresh Token** | Brukes til å hente nytt Access Token | **JA** |
| **Rate Limits** | Nåværende grenser for appen din | — |

> **Nye apper** starter med athlete capacity = 1 ("Single Player Mode"). Du kan bare autentisere deg selv til appen er godkjent via [Developer Program-skjema](https://share.hsforms.com/1VXSwPUYqSH6IxK0y51FjHwcnkd8).

---

## C. Autentisering med OAuth 2.0

Strava bruker **OAuth 2.0 (three-legged flow)**. Flyten ser slik ut:

```
Bruker → Din app → Stravas autorisasjonsside → Godkjenner
         ↑                                          ↓
    Access Token  ←  Token Exchange  ←  Authorization Code
```

### Tilgjengelige scopes

| Scope | Hva den gir tilgang til |
|-------|------------------------|
| `read` | Offentlig profil, segmenter, ruter, klubbfeed, leaderboards |
| `read_all` | Private ruter, segmenter og hendelser |
| `profile:read_all` | Full profilinfo (selv om profil er satt til privat) |
| `profile:write` | Oppdater vekt, FTP, stjer/fjerne segmenter |
| `activity:read` | Aktiviteter synlig for Everyone/Followers (ingen privacy zone-data) |
| `activity:read_all` | Alle aktiviteter inkl. Only You og privacy zone-data |
| `activity:write` | Opprett, last opp og rediger aktiviteter |

> **Merk:** `activity:read` er **påkrevd** for å bruke webhooks for aktiviteter.

### Steg-for-steg (web-flow)

**Steg 1 – Redirect bruker til autorisasjonssiden:**

```
GET https://www.strava.com/oauth/authorize
  ?client_id=DIN_CLIENT_ID
  &response_type=code
  &redirect_uri=https://dinapp.no/callback
  &approval_prompt=auto
  &scope=activity:read_all,activity:write
```

| Parameter | Påkrevd | Beskrivelse |
|-----------|---------|-------------|
| `client_id` | Ja | Din app-ID |
| `response_type` | Ja | Alltid `code` |
| `redirect_uri` | Ja | Må matche registrert callback-domene |
| `approval_prompt` | Nei | `force` = vis alltid, `auto` = bare ved første gang |
| `scope` | Ja | Kommaseparert liste med scopes |
| `state` | Nei | Valgfri streng returnert i redirect (CSRF-beskyttelse) |

**Steg 2 – Bruker godkjenner → motta authorization code:**

```
https://dinapp.no/callback?code=AUTORISASJONSKODE&scope=activity:read_all&state=xyz
```

> Sjekk alltid at `scope` i responsen inneholder det du ba om – brukeren kan fjerne hake på scopes.

**Steg 3 – Bytt code mot tokens:**

```bash
curl -X POST https://www.strava.com/oauth/token \
  -d client_id=DIN_CLIENT_ID \
  -d client_secret=DIN_CLIENT_SECRET \
  -d code=AUTORISASJONSKODE \
  -d grant_type=authorization_code
```

**Eksempel på vellykket respons:**

```json
{
  "token_type": "Bearer",
  "expires_at": 1568775134,
  "expires_in": 21600,
  "refresh_token": "e5n567567...",
  "access_token": "a4b945687g...",
  "athlete": { "id": 123456, "firstname": "Ola", "lastname": "Nordmann" },
  "scope": "activity:read_all activity:write"
}
```

**Ved avslag** (bruker trykker "Reject"):

```
https://dinapp.no/callback?error=access_denied
```

### Deautorisering

Trekk tilbake en brukers tilgang til appen din:

```bash
curl -X POST https://www.strava.com/oauth/deauthorize \
  -d access_token=BRUKERENS_ACCESS_TOKEN
```

Dette ugyldiggjør **alle** tokens appen har for atleten.

---

## D. Token-håndtering og refresh

Access tokens utløper **etter 6 timer** (`expires_in: 21600` sekunder). Bruk alltid Refresh Token for å hente et nytt.

### Flyt for token-refresh

```
Er access token utløpt (expires_at < now)?
    JA  → POST /oauth/token med refresh_token
    NEI → Bruk eksisterende access token
```

> **Tips:** Sjekk om `expires_at` er innen **1 time** fra nå og forny da – ikke vent til den faktisk utløper.

### Kall for å refreshe token

```bash
curl -X POST https://www.strava.com/oauth/token \
  -d client_id=DIN_CLIENT_ID \
  -d client_secret=DIN_CLIENT_SECRET \
  -d grant_type=refresh_token \
  -d refresh_token=GJELDENDE_REFRESH_TOKEN
```

**Respons:**

```json
{
  "token_type": "Bearer",
  "access_token": "nytt_access_token",
  "expires_at": 1568795134,
  "expires_in": 21600,
  "refresh_token": "nytt_refresh_token"
}
```

> **Kritisk:** Refresh token kan endre seg for hvert kall. **Lagre alltid det nyeste refresh_token** fra responsen – det gamle invalideres umiddelbart.

### Lagringsanbefaling

```
Tabell: athlete_tokens
├── athlete_id
├── access_token
├── expires_at          ← Unix timestamp
├── refresh_token
└── scopes              ← Lagre hvilke scopes atleten godkjente
```

### Python – token-refresh med auto-fornying

```python
import requests
import time

def get_valid_access_token(stored_token: dict, client_id: str, client_secret: str) -> str:
    """Returnerer gyldig access token. Refresher automatisk om utløpt."""
    
    # Forny hvis tokenet utløper innen 1 time
    if stored_token["expires_at"] - time.time() < 3600:
        response = requests.post(
            "https://www.strava.com/oauth/token",
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "grant_type": "refresh_token",
                "refresh_token": stored_token["refresh_token"],
            },
            timeout=10,
        )
        response.raise_for_status()
        new_token = response.json()

        # VIKTIG: Lagre det nye refresh_token i database her
        store_token(new_token)  # din egen funksjon
        return new_token["access_token"]

    return stored_token["access_token"]
```

---

## E. Gjøre API-kall

Alle forespørsler krever `Authorization: Bearer <access_token>` i headeren.

### Grunnleggende eksempel – hent innlogget atlet

```bash
curl -X GET https://www.strava.com/api/v3/athlete \
  -H "Authorization: Bearer DITT_ACCESS_TOKEN"
```

### Python – ferdig klientklasse med error handling

```python
import requests
import time

class StravaClient:
    BASE_URL = "https://www.strava.com/api/v3"

    def __init__(self, access_token: str):
        self.session = requests.Session()
        self.session.headers.update({"Authorization": f"Bearer {access_token}"})

    def get(self, endpoint: str, **params) -> dict:
        return self._request("GET", endpoint, params=params)

    def post(self, endpoint: str, data: dict) -> dict:
        return self._request("POST", endpoint, json=data)

    def _request(self, method: str, endpoint: str, **kwargs) -> dict:
        url = f"{self.BASE_URL}{endpoint}"
        response = self.session.request(method, url, timeout=15, **kwargs)
        self._handle_errors(response)
        return response.json()

    def _handle_errors(self, response: requests.Response):
        if response.status_code == 200:
            return
        if response.status_code == 201:
            return

        # Les rate limit headers for bedre feilmeldinger
        rate_limit = response.headers.get("X-RateLimit-Limit", "?")
        rate_usage = response.headers.get("X-RateLimit-Usage", "?")

        try:
            error_body = response.json()
            errors = error_body.get("errors", [])
            message = error_body.get("message", "Ukjent feil")
        except Exception:
            message = response.text
            errors = []

        if response.status_code == 400:
            raise StravaError(400, f"Ugyldig forespørsel: {message}", errors)
        elif response.status_code == 401:
            raise StravaAuthError(f"Ikke autorisert. Token kan være utløpt. {message}")
        elif response.status_code == 403:
            raise StravaError(403, f"Ingen tilgang (sjekk scopes): {message}", errors)
        elif response.status_code == 404:
            raise StravaError(404, f"Ressurs ikke funnet: {message}", errors)
        elif response.status_code == 422:
            raise StravaError(422, f"Valideringsfeil: {message}", errors)
        elif response.status_code == 429:
            raise StravaRateLimitError(
                f"Rate limit nådd. Grense: {rate_limit}, Bruk: {rate_usage}"
            )
        elif response.status_code >= 500:
            raise StravaServerError(response.status_code, f"Strava-serverfeil: {message}")
        else:
            response.raise_for_status()


class StravaError(Exception):
    def __init__(self, status_code: int, message: str, errors: list = None):
        self.status_code = status_code
        self.errors = errors or []
        super().__init__(message)

class StravaAuthError(StravaError):
    def __init__(self, message: str):
        super().__init__(401, message)

class StravaRateLimitError(StravaError):
    def __init__(self, message: str):
        super().__init__(429, message)

class StravaServerError(StravaError):
    pass
```

### JavaScript / TypeScript – fetch med error handling

```typescript
const STRAVA_BASE = "https://www.strava.com/api/v3";

interface StravaFault {
  message: string;
  errors: Array<{ resource: string; field: string; code: string }>;
}

class StravaApiError extends Error {
  constructor(public statusCode: number, message: string, public errors: StravaFault["errors"] = []) {
    super(message);
    this.name = "StravaApiError";
  }
}

async function stravaFetch(endpoint: string, accessToken: string, options: RequestInit = {}) {
  const response = await fetch(`${STRAVA_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // Les rate limit headers
  const limitHeader = response.headers.get("X-RateLimit-Limit") ?? "?";
  const usageHeader = response.headers.get("X-RateLimit-Usage") ?? "?";

  if (response.ok) return response.json();

  let fault: Partial<StravaFault> = {};
  try { fault = await response.json(); } catch {}

  switch (response.status) {
    case 400: throw new StravaApiError(400, `Ugyldig forespørsel: ${fault.message}`, fault.errors);
    case 401: throw new StravaApiError(401, `Ikke autorisert – token utløpt? ${fault.message}`);
    case 403: throw new StravaApiError(403, `Ingen tilgang (sjekk scopes): ${fault.message}`);
    case 404: throw new StravaApiError(404, `Ressurs ikke funnet: ${fault.message}`);
    case 422: throw new StravaApiError(422, `Valideringsfeil: ${fault.message}`, fault.errors);
    case 429: throw new StravaApiError(429, `Rate limit nådd. Grense: ${limitHeader}, Bruk: ${usageHeader}`);
    default:  throw new StravaApiError(response.status, `Serverfeil: ${fault.message}`);
  }
}
```

---

## F. Rate limits

### Lese rate limit-status fra response headers

Alle API-responser inkluderer disse headerne:

```
X-RateLimit-Limit:    200,2000       ← 15-min grense, daglig grense
X-RateLimit-Usage:    45,312         ← 15-min bruk, daglig bruk
X-ReadRateLimit-Limit:  100,1000     ← non-upload grenser
X-ReadRateLimit-Usage:  23,156       ← non-upload bruk
```

### Eksempel på vellykket vs. rate-limited respons

```http
# Vellykket
HTTP/1.1 200 OK
X-Ratelimit-Limit: 200,2000
X-Ratelimit-Usage: 45,312

# Rate limited
HTTP/1.1 429 Too Many Requests
X-Ratelimit-Limit: 200,2000
X-Ratelimit-Usage: 201,400
```

### Strategi for å håndtere rate limits

```python
import time

def strava_request_with_backoff(client, endpoint, max_retries=3):
    """Automatisk backoff ved rate limiting."""
    for attempt in range(max_retries):
        try:
            return client.get(endpoint)

        except StravaRateLimitError:
            if attempt == max_retries - 1:
                raise  # Gi opp etter maks forsøk

            # Vent til neste 15-minutters-vindu
            now = time.time()
            seconds_into_interval = now % 900  # 15 min = 900 sek
            wait_time = 900 - seconds_into_interval + 5  # +5 sek buffer
            print(f"Rate limit nådd. Venter {wait_time:.0f} sek...")
            time.sleep(wait_time)

        except StravaServerError as e:
            if attempt == max_retries - 1:
                raise
            # Eksponentiell backoff for 5xx-feil
            wait = 2 ** attempt
            print(f"Serverfeil, prøver igjen om {wait}s...")
            time.sleep(wait)
```

### Proaktiv overvåking av rate limit

```python
def check_rate_limit_headers(response_headers: dict) -> None:
    """Logg advarsel om vi nærmer oss grensen."""
    limit_raw = response_headers.get("X-RateLimit-Limit", "")
    usage_raw = response_headers.get("X-RateLimit-Usage", "")

    if not limit_raw or not usage_raw:
        return

    limits = [int(x) for x in limit_raw.split(",")]
    usage  = [int(x) for x in usage_raw.split(",")]

    pct_15min = usage[0] / limits[0] * 100
    pct_daily = usage[1] / limits[1] * 100

    if pct_15min > 80:
        print(f"[ADVARSEL] 15-min rate limit: {pct_15min:.1f}% brukt ({usage[0]}/{limits[0]})")
    if pct_daily > 80:
        print(f"[ADVARSEL] Daglig rate limit: {pct_daily:.1f}% brukt ({usage[1]}/{limits[1]})")
```

---

## G. Feilkoder og error handling

### HTTP-statuskoder

| Kode | Navn | Årsak | Håndtering |
|------|------|-------|------------|
| `200` | OK | Vellykket | Bruk data |
| `201` | Created | Ressurs opprettet | Bruk data |
| `400` | Bad Request | Ugyldig parameter eller format | Valider input, les `errors`-feltet |
| `401` | Unauthorized | Token utløpt eller ugyldig | Refresh token, ved feil → re-autentiser |
| `403` | Forbidden | Manglende scope eller privat data | Sjekk scopes, vis feilmelding til bruker |
| `404` | Not Found | Ressurs finnes ikke | Håndter gracefully, ikke retry |
| `409` | Conflict | Duplikat (f.eks. allerede lastet opp) | Ignorer eller varsle bruker |
| `422` | Unprocessable | Valideringsfeil (f.eks. manglende felt) | Les `errors`-feltet og fiks input |
| `429` | Too Many Requests | Rate limit nådd | Backoff og vent til neste vindu |
| `500` | Internal Server Error | Strava-sidefeil | Retry med eksponentiell backoff |
| `503` | Service Unavailable | Planlagt vedlikehold | Retry etter kort pause |

### Fault-objektet (Stravas feilformat)

Alle `4xx` og `5xx`-responser returnerer et `Fault`-objekt:

```json
{
  "message": "Authorization Error",
  "errors": [
    {
      "resource": "Athlete",
      "field": "access_token",
      "code": "invalid"
    }
  ]
}
```

| Felt | Type | Beskrivelse |
|------|------|-------------|
| `message` | string | Overordnet feilmelding |
| `errors` | array | Liste med detaljer om hvert problem |
| `errors[].resource` | string | Hvilken ressurs som er berørt (f.eks. `Athlete`, `Activity`) |
| `errors[].field` | string | Feltet som forårsaket feilen |
| `errors[].code` | string | Feilkode: `invalid`, `missing`, `already present`, `not found` o.l. |

### Vanlige feilkoder og løsninger

| `code` | Forklaring | Løsning |
|--------|------------|---------|
| `invalid` | Ugyldig verdi | Sjekk parametertype og verdi |
| `missing` | Påkrevd felt mangler | Legg til feltet |
| `already present` | Duplikat | Ignorer eller informer bruker |
| `not found` | Ressurs finnes ikke | Håndter gracefully |
| `access_token expired` | Token utløpt | Kall refresh-endepunktet |

### Komplett eksempel: robust API-kall med full error handling

```python
import requests
import time
import logging

log = logging.getLogger(__name__)

def get_athlete_activities(
    access_token: str,
    after: int = None,
    per_page: int = 30,
    max_retries: int = 3,
) -> list:
    """
    Hent aktiviteter med full error handling.
    
    Args:
        access_token: Gyldig Strava access token
        after: Unix timestamp – hent kun aktiviteter etter dette tidspunktet
        per_page: Antall per side (maks 200)
        max_retries: Antall forsøk ved serverfeil
    
    Returns:
        Liste med aktiviteter
    
    Raises:
        StravaAuthError: Token ugyldig – trenger re-autentisering
        StravaRateLimitError: Rate limit nådd etter alle forsøk
        StravaError: Andre API-feil
    """
    params = {"per_page": min(per_page, 200)}
    if after:
        params["after"] = after

    for attempt in range(max_retries):
        try:
            response = requests.get(
                "https://www.strava.com/api/v3/athlete/activities",
                headers={"Authorization": f"Bearer {access_token}"},
                params=params,
                timeout=15,
            )

            # Logg rate limit status
            check_rate_limit_headers(dict(response.headers))

            if response.status_code == 200:
                return response.json()

            fault = {}
            try:
                fault = response.json()
            except Exception:
                pass

            if response.status_code == 401:
                # Token ugyldig – ikke retry, krev re-autentisering
                raise StravaAuthError("Token ugyldig eller utløpt. Re-autentiser brukeren.")

            if response.status_code == 403:
                raise StravaError(403, f"Manglende tillatelse: {fault.get('message')}")

            if response.status_code == 429:
                if attempt < max_retries - 1:
                    wait = 900 - (time.time() % 900) + 5
                    log.warning(f"Rate limit. Venter {wait:.0f}s (forsøk {attempt + 1})")
                    time.sleep(wait)
                    continue
                raise StravaRateLimitError("Rate limit nådd etter alle forsøk.")

            if response.status_code >= 500:
                if attempt < max_retries - 1:
                    wait = 2 ** (attempt + 1)
                    log.warning(f"Serverfeil {response.status_code}. Retry om {wait}s")
                    time.sleep(wait)
                    continue
                raise StravaServerError(response.status_code, "Strava-server utilgjengelig.")

            # Andre 4xx-feil
            raise StravaError(
                response.status_code,
                fault.get("message", "Ukjent feil"),
                fault.get("errors", []),
            )

        except requests.Timeout:
            if attempt < max_retries - 1:
                log.warning(f"Timeout (forsøk {attempt + 1}). Prøver igjen...")
                time.sleep(2 ** attempt)
            else:
                raise StravaError(0, "API-forespørsel timet ut etter alle forsøk.")

        except requests.ConnectionError as e:
            raise StravaError(0, f"Nettverksfeil: {e}")
```

### Paginering – hent alle sider

```python
def get_all_activities(access_token: str, after: int = None) -> list:
    """Hent alle aktiviteter med automatisk paginering."""
    all_activities = []
    page = 1

    while True:
        params = {"per_page": 200, "page": page}
        if after:
            params["after"] = after

        response = requests.get(
            "https://www.strava.com/api/v3/athlete/activities",
            headers={"Authorization": f"Bearer {access_token}"},
            params=params,
            timeout=15,
        )
        response.raise_for_status()
        batch = response.json()

        if not batch:
            break  # Tom side = ingen flere aktiviteter

        all_activities.extend(batch)
        page += 1

        # Forsiktig: sjekk rate limit mellom sider
        check_rate_limit_headers(dict(response.headers))
        time.sleep(0.1)  # Liten pause for å beskytte rate limit

    return all_activities
```

---

## H. Webhooks

Webhooks lar deg **motta hendelser i sanntid** i stedet for å polle API-et.

### Støttede hendelser

| object_type | aspect_type | Beskrivelse |
|-------------|-------------|-------------|
| `activity` | `create` | Ny aktivitet lastet opp |
| `activity` | `update` | Tittel, type eller synlighet endret |
| `activity` | `delete` | Aktivitet slettet |
| `athlete` | `update` | Atlet deautoriserte appen (`"authorized": "false"`) |

### Eksempel på webhook-payload

```json
{
  "object_type": "activity",
  "aspect_type": "create",
  "object_id": 1360128428,
  "owner_id": 134815,
  "subscription_id": 120475,
  "event_time": 1516126040,
  "updates": {}
}
```

### Opprett webhook-abonnement

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=DIN_CLIENT_ID \
  -F client_secret=DIN_CLIENT_SECRET \
  -F callback_url=https://dinapp.no/strava/webhook \
  -F verify_token=DITT_VERIFY_TOKEN
```

Strava sender en **GET-validering** til din `callback_url`. Du **må svare innen 2 sekunder**:

```python
# Eksempel: Flask-server som validerer webhook
from flask import Flask, request, jsonify

app = Flask(__name__)
VERIFY_TOKEN = "DITT_VERIFY_TOKEN"

@app.route("/strava/webhook", methods=["GET"])
def validate_webhook():
    """Validering fra Strava ved oppsett av abonnement."""
    mode      = request.args.get("hub.mode")
    token     = request.args.get("hub.verify_token")
    challenge = request.args.get("hub.challenge")

    if mode == "subscribe" and token == VERIFY_TOKEN:
        return jsonify({"hub.challenge": challenge}), 200
    return jsonify({"error": "Forbidden"}), 403
```

### Ta imot og verifisere webhook-hendelser

```python
import hmac
import hashlib
import time

WEBHOOK_SIGNING_SECRET = "din_signing_secret"

@app.route("/strava/webhook", methods=["POST"])
def receive_webhook():
    """Motta hendelse fra Strava og verifiser signaturen."""
    
    # 1. Verifiser X-Strava-Signature
    signature_header = request.headers.get("X-Strava-Signature", "")
    if not verify_webhook_signature(signature_header, request.get_data()):
        return jsonify({"error": "Invalid signature"}), 401

    # 2. Svar 200 OK umiddelbart (Strava krever svar innen 2 sek)
    payload = request.get_json()
    process_webhook_async(payload)  # behandle asynkront
    return "", 200


def verify_webhook_signature(header: str, body: bytes, tolerance_s: int = 300) -> bool:
    """
    Verifiser at webhook-hendelsen faktisk kom fra Strava.
    
    Format: X-Strava-Signature: t=<timestamp>,v1=<hmac-sha256>
    """
    if not header:
        return False

    try:
        parts = dict(p.split("=", 1) for p in header.split(","))
        timestamp = parts["t"]
        received_sig = parts["v1"]
    except (KeyError, ValueError):
        return False

    # Avvis hendelser eldre enn toleransen (replay-angrep)
    if abs(time.time() - int(timestamp)) > tolerance_s:
        return False

    signed_payload = f"{timestamp}.{body.decode('utf-8')}"
    expected_sig = hmac.new(
        WEBHOOK_SIGNING_SECRET.encode("utf-8"),
        signed_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    # Bruk constant-time sammenligning (hindrer timing attacks)
    return hmac.compare_digest(received_sig, expected_sig)
```

### Administrer abonnement

```bash
# Vis aktivt abonnement
curl -G https://www.strava.com/api/v3/push_subscriptions \
  -d client_id=DIN_CLIENT_ID \
  -d client_secret=DIN_CLIENT_SECRET

# Slett abonnement
curl -X DELETE "https://www.strava.com/api/v3/push_subscriptions/12345" \
  -d client_id=DIN_CLIENT_ID \
  -d client_secret=DIN_CLIENT_SECRET
```

---

## I. Viktige endepunkter

### Atlet

| Metode | Endepunkt | Scope | Beskrivelse |
|--------|-----------|-------|-------------|
| `GET` | `/athlete` | `read` | Innlogget atlets profil |
| `GET` | `/athletes/{id}/stats` | `read` | Statistikk for atlet |
| `PUT` | `/athlete` | `profile:write` | Oppdater profil (vekt, FTP) |

### Aktiviteter

| Metode | Endepunkt | Scope | Beskrivelse |
|--------|-----------|-------|-------------|
| `GET` | `/athlete/activities` | `activity:read` | Liste over egne aktiviteter |
| `GET` | `/activities/{id}` | `activity:read` | Detaljer for én aktivitet |
| `POST` | `/activities` | `activity:write` | Opprett manuell aktivitet |
| `PUT` | `/activities/{id}` | `activity:write` | Oppdater aktivitet |
| `GET` | `/activities/{id}/laps` | `activity:read` | Runder (laps) |
| `GET` | `/activities/{id}/streams` | `activity:read` | Strøm-data (GPS, puls, etc.) |
| `GET` | `/activities/{id}/zones` | `activity:read` | Pulssoner |

### Segmenter

| Metode | Endepunkt | Scope | Beskrivelse |
|--------|-----------|-------|-------------|
| `GET` | `/segments/{id}` | `read` | Segmentdetaljer |
| `GET` | `/segments/{id}/leaderboard` | `read` | Toppliste |
| `GET` | `/segments/starred` | `read` | Stjernemerket segmenter |

### Ruter

| Metode | Endepunkt | Scope | Beskrivelse |
|--------|-----------|-------|-------------|
| `GET` | `/athletes/{id}/routes` | `read` | Atletens ruter |
| `GET` | `/routes/{id}` | `read` | Rutedetaljer |

### Opplasting av aktiviteter

```bash
# Last opp .gpx / .fit / .tcx fil
curl -X POST https://www.strava.com/api/v3/uploads \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -F data_type=gpx \
  -F file=@din_aktivitet.gpx \
  -F name="Morgenøkt" \
  -F description="Langtur i skogen"
```

```bash
# Sjekk opplastingsstatus (kan ta noen sekunder)
curl https://www.strava.com/api/v3/uploads/{upload_id} \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

---

## J. Swagger Playground

Interaktivt testverktøy – prøv endepunkter uten å skrive kode.

1. Gå til [strava.com/settings/api](https://www.strava.com/settings/api) og sett Authorization Callback Domain til `developers.strava.com`
2. Åpne [developers.strava.com/playground](https://developers.strava.com/playground)
3. Klikk "Authorize" og logg inn med Client ID og Client Secret
4. Test alle endepunkter og se reelle responser

> Merk: Du kan bare velge ett scope om gangen i Playground (kjent begrensning).

---

## K. Best practices – oppsummering

### Tokens og sikkerhet

- Lagre aldri tokens i kildekode – bruk miljøvariabler eller en secrets manager
- Lagre `access_token`, `refresh_token`, `expires_at` og `scopes` per atlet i databasen
- Bruk alltid siste `refresh_token` fra respons – det gamle invalideres umiddelbart
- Forny access token proaktivt (når `expires_at` er < 1 time unna), ikke reaktivt
- Verifiser alltid `scope` i OAuth-callback – brukeren kan fjerne tilganger

### Rate limits

- Implementer webhooks i stedet for polling – sparer rate limit drastisk
- Les `X-RateLimit-Usage`-headeren og logg advarsel over 80%
- Vent til neste 15-minuttersvindu ved `429`-feil (ikke bare noen sekunder)
- Bruk paginering med `per_page=200` for å minimere antall kall

### Feilhåndtering

- Aldri retry på `401` – trenger re-autentisering
- Aldri retry på `404` – ressursen finnes ikke
- Retry med eksponentiell backoff på `429` og `5xx`
- Logg `errors`-arrayen fra Fault-objektet – inneholder verdifull debuginfo
- Sett alltid `timeout` på HTTP-kall (anbefalt: 10–15 sekunder)

### Webhook-sikkerhet

- Verifiser alltid `X-Strava-Signature` før du behandler en hendelse
- Bruk `hmac.compare_digest` (constant-time) for å unngå timing attacks
- Avvis hendelser med `timestamp` eldre enn 5 minutter
- Svar `200 OK` umiddelbart og behandle payload asynkront

### Generelt

- Be kun om scopes du faktisk trenger
- Implementer `deauthorize`-webhook for å slette brukerdata når nødvendig
- Nye apper er begrenset til 1 atlet (Single Player Mode) inntil godkjenning
- Søk om økt rate limit kun når du nærmer deg kapasiteten – ikke i forkant

---

## L. Ressurser og support

| Ressurs | Lenke |
|---------|-------|
| Kom i gang | [developers.strava.com/docs/getting-started](https://developers.strava.com/docs/getting-started) |
| Autentisering | [developers.strava.com/docs/authentication](https://developers.strava.com/docs/authentication) |
| API-referanse | [developers.strava.com/docs/reference](https://developers.strava.com/docs/reference) |
| Rate limits | [developers.strava.com/docs/rate-limits](https://developers.strava.com/docs/rate-limits) |
| Webhooks | [developers.strava.com/docs/webhooks](https://developers.strava.com/docs/webhooks) |
| Opplasting | [developers.strava.com/docs/uploads](https://developers.strava.com/docs/uploads) |
| Swagger Playground | [developers.strava.com/playground](https://developers.strava.com/playground) |
| Bruksvilkår | [strava.com/legal/api](https://www.strava.com/legal/api) |
| Brand Guidelines | [developers.strava.com/guidelines](https://developers.strava.com/guidelines) |
| Developer Program | [Søknadsskjema](https://share.hsforms.com/1VXSwPUYqSH6IxK0y51FjHwcnkd8) |
| Community-forum | [communityhub.strava.com](https://communityhub.strava.com/t5/developer-discussions/bd-p/developer-discussions) |

> **Sikkerhetspåminnelse:** Del aldri access tokens, refresh tokens, autorisasjonskoder eller client secret i offentlige forum, GitHub-repos eller loggfiler.
