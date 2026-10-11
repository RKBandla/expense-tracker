# Expense Tracker – Full-Stack AWS

**Student:** Rohan Krishna Bandla · **Project:** Expense Tracker (Tiers 1–4)

A React expense tracker with a Python AWS Lambda API and MongoDB Atlas. Served over **HTTPS by CloudFront** from a private S3 bucket and **deployed automatically by GitHub Actions**, with **CloudWatch** monitoring.

**Live app:** https://YOUR_DOMAIN.cloudfront.net
**API:** https://bgs8bumanb.execute-api.us-east-1.amazonaws.com/expenses

| Tier | Status |
|---|---|
| 1 – Lambda, API Gateway (6 explicit routes), S3, MongoDB Atlas | ✅ |
| 2 – GitHub Actions: auto-deploy on push to `main` | ✅ |
| 3 – CloudFront HTTPS + private S3 (OAC) + cache invalidation | ✅ |
| 4 – CloudWatch: log retention, access logs, alarms, custom metric, dashboard, saved queries | ✅ |

## Architecture

```
Browser ──HTTPS──► CloudFront ──OAC──► S3 (private, React build)
   │
   └─ fetch /expenses ──► API Gateway (HTTP API) ──► Lambda (Python 3.12) ──► MongoDB Atlas
                                │                        │
                                └── access logs ─────────┴── logs, metrics ──► CloudWatch
GitHub push to main ──► GitHub Actions ──► update Lambda, sync S3, invalidate CloudFront
```

## API

| Method | Route | Description |
|---|---|---|
| GET | `/expenses` | List, newest first; optional `?category=Food` |
| POST | `/expenses` | Create `{ "title", "amount", "category", "date" }` → 201 |
| GET | `/expenses/summary` | Total per category + grand total (MongoDB `$group`) |
| GET | `/expenses/{id}` | One expense |
| PUT | `/expenses/{id}` | Update any field |
| DELETE | `/expenses/{id}` | Delete → 204 |

**Validation (400):** title required · amount must be a number > 0 · category one of Food, Travel, Bills, Shopping, Other · date `YYYY-MM-DD` · invalid id. Unknown id → 404.

## Project layout

```
backend/lambda_function.py     Lambda handler: routing by routeKey, validation, CRUD, summary
backend/requirements.txt       pymongo[srv]
build.py                       Builds backend/lambda.zip with Linux wheels (works from Windows)
frontend/                      React + Vite (SummaryBox, ExpenseForm, ExpenseList, api.js)
.github/workflows/deploy.yml   CI/CD pipeline
```

## Tier 1 – Deployment (AWS Console)

1. `python build.py` → upload `backend/lambda.zip` to Lambda (Python 3.12, existing class `lambda-exec` role, env var `MONGO_URI`, timeout 15 s, 256 MB).
2. API Gateway HTTP API with 6 **explicit** routes (no `{proxy+}`, because the handler routes on `event["routeKey"]`), `$default` stage, CORS for `content-type`.
3. `npm run build` with `VITE_API_URL` → `aws s3 sync dist/ s3://<bucket>/ --delete`.

All resources are prefixed `student-rohan-krishna-bandla-expense-tracker-` and tagged `workshop`, `autodelete`, `date`.

## Tier 2 – GitHub Actions

On every push to `main` (or a manual run): `build.py` → `aws lambda update-function-code` → `npm ci && npm run build` → `aws s3 sync` → CloudFront invalidation.

Secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `LAMBDA_FUNCTION_NAME`, `S3_BUCKET`, `VITE_API_URL`, `CF_DISTRIBUTION_ID`.

## Tier 3 – CloudFront

- CloudFront distribution with the S3 **bucket** endpoint as origin and an **Origin Access Control**
- `Redirect HTTP to HTTPS`, default root object `index.html`
- Bucket policy allows only this distribution; Block Public Access **on**; static website hosting **off**
- The old S3 website URL no longer works; the app is only reachable over HTTPS

## Tier 4 – CloudWatch

| Item | Detail |
|---|---|
| Log retention | 14 days for the Lambda and API access log groups |
| API access logs | JSON: method, route, status, latency, integration error |
| Alarms | `…-lambda-errors` (Errors > 0) and `…-apigw-5xx` (5xx > 0), 5-minute windows |
| Custom metric | Metric filter `{ $.event = "expense_created" }` → `ExpenseTracker/AmountSpent` (value `$.amount`) |
| Dashboard | Lambda, API Gateway, CloudFront, money spent |
| Saved queries | `…/lambda-errors`, `…/requests-by-status` |

Alarm test: invoking the Lambda with a malformed event (Lambda error) and setting reserved concurrency to 0 (API 5xx) moved both alarms OK → In alarm.

## Troubleshooting notes

- **500 from API Gateway, but the Lambda Test worked:** the routes were integrated with another student's Lambda in the shared account. Found with `aws apigatewayv2 get-integrations`, re-pointed to my function, and added the invoke permission.
- **Browser CORS error while curl worked:** CORS wasn't configured on the recreated API.
- **CI build failed but local dev worked:** `App.jsx` was incomplete in the repo; CI builds only what's committed.
- **OAC origin:** must be the bucket endpoint (`.s3.us-east-1.amazonaws.com`), not the `s3-website` endpoint.

## Run locally

```bash
python build.py                      # backend zip
cd frontend
echo "VITE_API_URL=<api url>" > .env.local
npm install
npm run dev                          # http://localhost:5173
```

## Clean up

Delete the CloudFront distribution (disable first), S3 bucket, API Gateway API, Lambda function, log groups, alarms and dashboard.