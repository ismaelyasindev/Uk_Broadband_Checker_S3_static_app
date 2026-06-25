# UK Broadband Checker

A lightweight, secure, production-grade UK broadband availability checker that
mimics the official [Ofcom checker](https://checker.ofcom.org.uk/en-gb/broadband-coverage).

Monorepo with two independent workspaces:

```
broadband-checker/
├── frontend/                 # React + Vite + TypeScript + Tailwind CSS
│   ├── public/
│   │   ├── data/
│   │   │   └── postcodes.json    # Demo-mode fixture DB (5 scenarios + fallback)
│   │   └── favicon.svg
│   ├── src/
│   │   ├── components/           # Header, Footer, SearchBar, ResultCard, Banners, icons
│   │   ├── lib/
│   │   │   ├── postcode.ts       # normalize / format / structural validation
│   │   │   ├── postcodesIo.ts    # postcodes.io autocomplete + lookup
│   │   │   ├── broadband.ts      # demo vs live routing, fetch logic
│   │   │   └── format.ts         # speed + category formatting
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── types.ts
│   │   └── index.css
│   ├── .env / .env.example       # VITE_API_URL, VITE_ORIGIN_VERIFY_SECRET
│   ├── vite.config.ts            # content-hashed, CloudFront-safe build
│   ├── tailwind.config.js
│   └── package.json
└── lambda/                   # AWS Lambda (Node.js 20+, ES Modules)
    ├── src/
    │   └── handler.mjs           # Zero-Trust + GDPR + cache-aside + SSM memoization
    ├── handler.test.mjs          # Vitest suite, fully mocked AWS SDK (100% coverage)
    ├── vitest.config.mjs
    └── package.json
```

## Frontend

```bash
cd frontend
npm install
npm run dev      # local dev (defaults to demo mode)
npm run build    # production build -> dist/ with main.[hash].js assets
npm run preview  # serve the production build
```

### Modes (`VITE_API_URL`)

- `VITE_API_URL=/demo` — **Demo mode**. No backend calls. Broadband data is read
  from `public/data/postcodes.json`. Postcode entry is still validated against
  the live `postcodes.io` API (autocomplete while typing + lookup on submit).
- `VITE_API_URL=/api` — **Live mode** (production). Sends an authenticated
  request to `${VITE_API_URL}/check?pc=...` (i.e. `/api/check?pc=...` behind
  CloudFront) with the `X-Origin-Verify` header set from
  `VITE_ORIGIN_VERIFY_SECRET`.

All user input is normalised (whitespace stripped, UPPERCASED) before the demo
JSON key lookup, so `"sw1a 1aa"`, `"Sw1a1Aa"`, and `"SW1A 1AA"` all match.

### Demo fixtures

| Postcode  | Scenario                         | Behaviour                              |
| --------- | -------------------------------- | -------------------------------------- |
| SW1A 1AA  | Gigabit FTTP                     | 1 Gbps / 220 Mbps, 100%                |
| EH1 1YZ   | Superfast FTTC                   | 80 / 20 Mbps, 98%                      |
| LL57 4TH  | Legacy ADSL                      | 11 / 1 Mbps, 85%                       |
| PO30 1UD  | No coverage                      | 0 / 0 Mbps — "No Infrastructure" alert |
| BT71 7BA  | Simulated 502 gateway error      | Triggers error banner                  |
| *(other)* | Generic fallback                 | 67 / 18 Mbps FTTC, 95%                 |

## Backend (AWS Lambda)

```bash
cd lambda
npm install
npm test         # runs Vitest with coverage (100% enforced, no AWS/network needed)
```

Required environment variables at runtime:

- `ORIGIN_VERIFY_SECRET` — shared secret matched against the `X-Origin-Verify` header.
- `DYNAMODB_TABLE` — cache table (PK `postcode`, TTL attribute `ttl`).
- `SSM_PARAM_PATH` — name/path of the SecureString holding the Ofcom API key.

Lifecycle: Zero-Trust header check → clean postcode → SHA-256 `pc_hash` (only
the 8-char hash is ever logged) → DynamoDB cache-aside (`X-Cache: HIT`) → SSM
key fetch (memoized across warm invocations) → external fetch → write-back with
a 24h TTL (`X-Cache: MISS`).
```
