# TestPilot AI

**AI-Assisted GitHub Pull Request Review and Code Quality Analysis Platform**

A full-stack web application. A developer connects a GitHub account, picks a repository and a Pull Request, and TestPilot AI analyzes only the **changed code** using real static analysis tools (ESLint, Ruff) and an AI reviewer (Google Gemini). It also suggests test cases and improved code, keeps a history of analyses, and creates PDF reports. A manual code analyzer is included as a secondary feature.

> Built as an internship project. AI results are **suggestions**, not verified bugs. Nothing is ever executed on the server.

## Features

- Register / login with JWT authentication
- **Connect GitHub (OAuth)**, list repositories and Pull Requests
- **Pull Request analysis**: fetches the diff, finds the exact changed lines, runs ESLint / Ruff, and asks Gemini to review the changes
- Findings are shown **grouped by file**, with severity, line number, why it matters and a suggested fix
- Static analysis findings are clearly **separated** from AI suggestions
- **Test case generator** (suggestions, copy buttons, not executed)
- **Code improvement** with a side-by-side diff and a real lint check of the improved code
- **Manual code analyzer** (Monaco editor, JavaScript and Python)
- Analysis history with search, filters, pagination and delete
- PDF reports
- Dashboard with real statistics and charts
- Profile page: update name, change password, manage GitHub connection

## How a Pull Request is analyzed

1. The server reads the PR and its changed files from the GitHub API.
2. The diff (`@@ -a,b +c,d @@` headers) is parsed to find the **line numbers that were added or changed**.
3. Each supported file (`.js`, `.mjs`, `.py`) is downloaded at the PR's latest commit and checked by ESLint or Ruff. Only findings on **changed lines** are shown.
4. Gemini receives the annotated diff. Every file number and line number it returns is validated, and lines that are not changed lines are dropped.
5. Everything is stored in one analysis document.

## Tech stack

| Part | Technology |
|---|---|
| Frontend | React (Vite), Tailwind CSS, React Router, Monaco Editor, Axios, Chart.js, Lucide icons |
| Backend | Node.js, Express |
| Database | MongoDB Atlas, Mongoose |
| Auth | JWT, bcrypt (bcryptjs) |
| AI | Google Gemini API (`@google/genai`) |
| Static analysis | ESLint (JavaScript), Ruff (Python) |
| GitHub | GitHub REST API, OAuth App |
| Reports | PDFKit |
| Security | helmet, cors, express-rate-limit |

## Project structure

```
testpilot-ai/
├── client/                     React frontend
│   └── src/
│       ├── components/         Reusable UI (Sidebar, FindingsTable, CodeEditor, ...)
│       ├── context/            AuthContext
│       ├── layouts/            AppLayout (sidebar + top bar)
│       ├── pages/              One file per page
│       ├── routes/             ProtectedRoute
│       ├── services/           Axios instance
│       └── utils/              Helpers (PDF download)
├── server/                     Express backend
│   ├── config/                 Database connection
│   ├── controllers/            Request handlers
│   ├── middleware/             Auth, error handling
│   ├── models/                 Mongoose models
│   ├── routes/                 API routes
│   ├── services/
│   │   ├── ai/                 Gemini: review, test cases, improvements, validation
│   │   ├── analyzers/          ESLint and Ruff
│   │   ├── github/             GitHub API, diff parser, PR loading
│   │   └── reports/            PDF generation
│   └── utils/                  Score, token, encryption helpers
└── README.md
```

## Requirements

- Node.js 20 or newer
- A MongoDB Atlas account (free tier is enough)
- Python 3 with Ruff: `python -m pip install ruff`
- A Google Gemini API key
- A GitHub OAuth App

## Setup

**1. Install dependencies**

```
cd server
npm install
cd ../client
npm install
```

**2. Create `server/.env`** by copying `server/.env.example` and filling in the values.

**3. Create a GitHub OAuth App** (GitHub > Settings > Developer settings > OAuth Apps > New OAuth App)

- Homepage URL: `http://localhost:5173`
- Authorization callback URL: `http://localhost:5000/api/github/callback`

Copy the Client ID and Client Secret into `.env`.

**4. Generate the token encryption key** and put it in `GITHUB_TOKEN_KEY`:

```
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

**5. In MongoDB Atlas**, create a database user and allow your IP address under Network Access.

## Run

Open two terminals.

```
cd server
npm run dev
```

```
cd client
npm run dev
```

Open http://localhost:5173

## API

All routes except register, login and the GitHub callback need the header `Authorization: Bearer <token>`.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Log in |
| GET | `/api/auth/me` | Current user |
| PUT | `/api/auth/profile` | Update name |
| PUT | `/api/auth/password` | Change password |
| GET | `/api/github/connect-url` | Start the GitHub connection |
| GET | `/api/github/callback` | GitHub redirects here |
| GET | `/api/github/status` | Connection status |
| DELETE | `/api/github/connection` | Disconnect and revoke the token |
| GET | `/api/github/repos` | List repositories |
| GET | `/api/github/repos/:owner/:repo/pulls` | List Pull Requests |
| GET | `/api/github/repos/:owner/:repo/pulls/:number` | PR details and files |
| POST | `/api/analyses/pull-request` | Analyze a Pull Request |
| POST | `/api/analyses` | Analyze pasted code |
| GET | `/api/analyses` | History (`q`, `language`, `source`, `from`, `to`, `page`, `limit`) |
| GET | `/api/analyses/:id` | One analysis |
| DELETE | `/api/analyses/:id` | Delete an analysis |
| POST | `/api/analyses/:id/test-cases` | Generate test cases |
| POST | `/api/analyses/:id/improve` | Suggest improved code |
| GET | `/api/dashboard/stats` | Dashboard statistics |
| GET | `/api/reports/:id/pdf` | Download a PDF report |
| GET | `/api/health` | Server and database status |

## Database

| Collection | Main fields |
|---|---|
| `users` | name, email, passwordHash, createdAt |
| `projects` | userId, projectName, language, createdAt |
| `githubconnections` | userId (unique), login, scope, accessTokenEnc (encrypted), expiresAt |
| `analyses` | userId, source (`manual` or `github_pr`), github details, files, staticFindings, aiFindings, testCases, improvements, qualityScore, status, createdAt |

Every analysis query includes the `userId`, so users can only read, change or delete their own data.

## Security

- Passwords are hashed with bcrypt (cost 12). Plain passwords are never stored.
- JWT login tokens (7 days) are checked by middleware on every private route.
- Ownership checks on every analysis, report and GitHub request
- GitHub tokens are encrypted with AES-256-GCM, hidden from normal queries, never sent to the browser or to the AI, and revoked on disconnect
- OAuth `state` is a signed, short-lived token
- Rate limits on login and on all AI-backed routes
- helmet, CORS limited to the frontend, input validation, request size limits
- **Submitted and Pull Request code is never executed.** It is only read as text.
- Prompt-injection defenses: the code is marked as untrusted data, the AI replies with file numbers (not names), and every returned line number is checked
- Secrets live in `.env`, which is not committed

## Honest limitations

- Only JavaScript and Python files (`.js`, `.mjs`, `.py`)
- AI suggestions can be wrong. They are shown as "potential issues". Test cases and improved code have **not been run**.
- Static analysis only checks a limited set of rules
- A GitHub **OAuth App** cannot be read-only (the `public_repo` permission also allows changes). A GitHub App would be safer.
- The free Gemini tier may use submitted content to improve Google's products, so use it for public code only
- Large Pull Requests are partly analyzed (15 files, 100 KB per file)
- The quality score is a simple custom rule (100 minus points per finding)
- Runs locally. Not deployed.

## Future work

- GitHub App with webhooks, and automatic comments on Pull Requests
- More languages (TypeScript, Java)
- Running generated tests safely in a sandbox
- HttpOnly cookies, email verification and password reset
- Deployment (for example Vercel and Render)

## Author

Madhu Pratika Babu · [College name] · [Internship organization]