# QuickDesk: AI-Assisted Helpdesk

QuickDesk is an internal helpdesk platform engineered to augment human support agents with generative AI. Rather than replacing agents, the platform accelerates ticket resolution by automatically categorizing and prioritizing incoming tickets, retrieving relevant knowledge base articles via Retrieval-Augmented Generation (RAG), and drafting grounded, citation-backed responses ready for agent review and editing.

---

## Architecture Diagram

```
+---------------------------------------------------------------------------------------+
|                                    REACT FRONTEND                                     |
|               Vite + TypeScript + Tailwind CSS (SPA, Port 5173)                       |
|                                                                                       |
|   +-----------------------+   +------------------------+   +----------------------+   |
|   |  Employee Portal      |   |  Agent Dashboard       |   |  Metrics & Analytics |   |
|   |  - Submit Ticket      |   |  - Real-time Ticket Feed|  |  - Resolution Times  |   |
|   |  - My Tickets (Filter)|   |  - Category Overrides  |   |  - Override Rates    |   |
|   |  - Live Status Flip   |   |  - RAG Draft + Citations|  |  - Category Counts   |   |
|   +-----------+-----------+   +-----------+------------+   +----------+-----------+   |
+---------------|---------------------------|---------------------------|---------------+
                | HTTP / REST (JWT Bearer)  | SSE (/api/sse/updates)    |
                v                           v                           v
+---------------------------------------------------------------------------------------+
|                                   FASTAPI BACKEND                                     |
|                             Python 3.14 (Async, Port 8000)                            |
|                                                                                       |
|   +----------------------+    +-----------------------+    +----------------------+   |
|   |  Auth & Security     |    |  Ticket Engine & SSE  |    |  RAG & AI Services   |   |
|   |  - JWT HS256         |    |  - CRUD + RBAC Guards |    |  - Groq Qwen-3.8-27b |   |
|   |  - Bcrypt 12 rounds  |    |  - In-memory Pub/Sub  |    |  - In-memory Vector  |   |
|   |  - Role Dependencies |    |  - Audit Trail Engine |    |  - 7 Grounded Docs   |   |
|   +-----------+----------+    +-----------+-----------+    +----------+-----------+   |
+---------------|---------------------------|---------------------------|---------------+
                | Async ORM (SQLAlchemy 2.1)|                           | REST API
                v                           v                           v
+-----------------------------------------------+   +-----------------------------------+
|               POSTGRESQL (Supabase)           |   |             GROQ CLOUD            |
|  - Users (Roles: employee, agent)             |   |  Model: qwen/qwen3.8-27b          |
|  - Tickets (Status, AI/Agent fields, replies) |   |  - 0.1 temp for Classification    |
|  - AuditLogs (Field, old/new, agent, time)    |   |  - 0.3 temp for RAG synthesis     |
+-----------------------------------------------+   +-----------------------------------+
```

---

## Quick Start (Fresh Clone)

### Prerequisites
- Python 3.11+ (Tested up to Python 3.14)
- Node.js 18+ and npm
- PostgreSQL database (Supabase free tier or local Postgres)
- [Groq API Key](https://console.groq.com) (free tier)

### 1. Backend Setup

```powershell
cd backend

# Create virtual environment
python -m venv venv
.\venv\Scripts\activate       # Windows PowerShell
# source venv/bin/activate    # Linux / macOS

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
copy .env.example .env
# Open .env and set your DATABASE_URL and GROQ_API_KEY

# Run database migrations
alembic upgrade head

# Seed initial users & knowledge base index
python seed.py

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```
- Swagger API Docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/tickets/my` (requires Bearer token)

### 2. Frontend Setup

In a new terminal window:
```powershell
cd frontend

# Install packages
npm install

# Start Vite dev server
npm run dev
```
- Web Application: `http://localhost:5173`

---

## Seeded Demo Credentials

| Role | Email | Password | Allowed Capabilities |
|---|---|---|---|
| **Support Agent** | `agent@quickdesk.com` | `Agent@123` | View all tickets, filter & search, override AI classifications, generate RAG drafts, send replies, view audit logs, view metrics dashboard |
| **Employee** | `employee@quickdesk.com` | `Employee@123` | Submit tickets with attachments, view only own tickets, filter tickets by status cards, receive live resolution updates |

---

## API Endpoints

| Method | Path | Purpose | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new employee or agent user | None |
| `POST` | `/api/auth/login` | Authenticate user, return JWT bearer token | None |
| `POST` | `/api/tickets` | Submit new ticket; invokes LLM for category, priority & confidence | Employee |
| `GET` | `/api/tickets/my` | Retrieve only current authenticated employee's tickets | Employee |
| `GET` | `/api/agent/tickets` | List all tickets with filtering (status, category, priority) & title search | Agent |
| `GET` | `/api/agent/tickets/{id}` | Get full ticket details with audit logs | Agent |
| `POST` | `/api/agent/tickets/{id}/reply` | Submit final reply, mark resolved, retain AI draft & final reply | Agent |
| `PATCH` | `/api/agent/tickets/{id}/override` | Override AI category/priority; creates immutable audit log record | Agent |
| `GET` | `/api/agent/tickets/{id}/draft` | Execute RAG pipeline over KB articles and generate drafted reply with citations | Agent |
| `GET` | `/api/agent/tickets/{id}/audit` | Fetch audit trail history for specific ticket | Agent |
| `GET` | `/api/metrics` | Retrieve operational metrics (counts, breakdown, median time, override rate) | Agent |
| `GET` | `/api/sse/updates` | Server-Sent Events stream for real-time ticket creation & resolution | Authenticated (Token via Query Param) |

---

## Stretch Goals Implemented

1. **AI Confidence Score**:
   - The ticket triage LLM prompt was upgraded to output an explicit confidence float `[0.0, 1.0]`.
   - Stored in the database (`tickets.ai_confidence`) and visually surfaced across the application:
     - On Agent Dashboard table (compact percentage pill).
     - On Ticket Detail view with color-coded confidence indicators (Green: >=80%, Amber: >=60%, Red: <60%).
     - On Employee My Tickets view.
2. **Critical Path Automated Test Suite (`pytest`)**:
   - Comprehensive test suite covering the 3 most sensitive application pathways:
     - **Auth & Password Security** (`tests/test_auth.py`): Verifies salted bcrypt hashing and JWT token cryptographic encoding/decoding.
     - **Role-Based Access Control** (`tests/test_rbac.py`): Verifies unauthenticated 401s and ensures employees hitting agent routes (`/api/agent/tickets`, `/api/metrics`) are strictly rejected with HTTP `403 Forbidden ("Agent role required")`.
     - **RAG Pipeline & Retrieval** (`tests/test_rag.py`): Verifies knowledge base chunking, cosine retrieval accuracy, and grounded response synthesis with citations.
   - Run tests via: `pytest tests/ -v` (7 passed in ~4s).

---

## Decisions and Tradeoffs

### a) Why React + Vite vs Next.js?
**Decision**: Single-Page Application (SPA) built with React 18, Vite, and React Router.  
**Tradeoff**: Next.js App Router provides Server-Side Rendering (SSR) and built-in API routes. However, for an **internal company helpdesk**, SEO is completely irrelevant and initial page weight is trivial. QuickDesk's primary technical complexity revolves around real-time reactive state (SSE connection, live status flipping, ticket filters, agent draft editing). Pairing a lightweight Vite SPA with a standalone FastAPI backend provided strict separation of concerns, faster HMR development iteration, and allowed Python's asynchronous ecosystem to handle RAG and database workloads independently from frontend assets.

### b) How did you structure the RAG pipeline?
**Decision**:
- **Chunk Size & Overlap**: Chunk size of 450 characters with 100 characters overlap (`stride=350`). Because our internal knowledge base articles are concise policy documents (150–300 words), smaller chunks preserve precise actionable paragraphs (e.g., specific VPN server address, password minimum length rules) without diluting retrieval similarity.
- **Retriever**: In-memory vector store computing normalized token overlap / Cosine similarity across pre-chunked markdown articles. Top $k=3$ most relevant chunks are selected with a relevance threshold (>0.05 score) to avoid injecting unrelated context.
- **Prompt & Grounding**: The prompt explicitly primes the model as an internal support agent, injects bracketed citations (`[From <source.md>]: <content>`), provides the employee's title and description, and instructs the LLM: *"If the context doesn't fully address the issue, mention that you'll escalate if needed. Do not hallucinate external policies."*
- **Model**: Groq-hosted `qwen/qwen3.8-27b` operating at `temperature=0.3` for grounded synthesis.

### c) How did you handle the case where the LLM returns a category that does not match your allowed list?
**Decision**: Multi-tier defense in `app/services/llm_service.py`:
1. **Prompt Constraint**: The prompt explicitly restricts output to valid enum keys (`IT, HR, Finance, Admin, Other`) and mandates pure JSON.
2. **Defensive Parsing**: A substring search isolates the outer `{ ... }` brackets to protect against conversational preambles (e.g., *"Here is your JSON:"*).
3. **Whitelist Validation**: Extracted values are validated against `VALID_CATEGORIES = {"IT", "HR", "Finance", "Admin", "Other"}`. If the LLM invents a non-existent category (e.g., `"Networking"` or `"Billing"`), the service automatically clamps it to `"Other"`, defaults priority to `"Medium"`, and assigns a lower confidence score (0.50).
4. **Agent Override Guarantee**: The database persists both `ai_category` and `agent_category`. If the AI ever misclassifies, the agent can override it with a single click, which is recorded in the audit trail.

### d) Where did you store the JWT on the client, and why?
**Decision**: Stored in `localStorage` accessed via Axios request interceptors and AuthContext.  
**Tradeoff & Security Assessment**:
- *Why*: `localStorage` allows fast client-side route guards, seamless session persistence on browser reloads, and simple token attachment for the native browser `EventSource` (SSE) API via query parameters (`/api/sse/updates?token=...`), since the browser `EventSource` API does not support custom headers.
- *Tradeoff*: `localStorage` is vulnerable to Cross-Site Scripting (XSS) if untrusted third-party scripts execute.
- *Production Mitigation*: In an enterprise production deployment, JWTs should be stored in `httpOnly`, `Secure`, `SameSite=Strict` cookies. CSRF protection tokens would be paired with state-changing requests, and SSE authorization would be established via an authenticated ticket-granting handshake.

### e) How did you enforce role-based access on the backend? What stops an employee from hitting an agent-only endpoint by guessing the URL?
**Decision**: Hierarchical FastAPI Dependency Injection (`Depends(get_agent_user)`):
- Every HTTP request passes through `get_current_user`, which cryptographically verifies the JWT signature (`HS256`), checks token expiration, and queries the user record in Postgres.
- Agent routes (`/api/agent/*` and `/api/metrics`) declare `current_agent: User = Depends(get_agent_user)`.
- `get_agent_user` verifies `current_user.role == UserRole.agent`. If an employee token hits any agent URL (even if they guessed the ID), FastAPI immediately aborts the pipeline with HTTP `403 Forbidden` (`{"detail": "Agent role required"}`).
- The test suite explicitly proves this in `tests/test_rbac.py::test_agent_endpoint_rejected_for_employee_role`.

### f) Why did you pick Server-Sent Events (SSE) for real-time? What is the failure mode if the socket disconnects mid-session?
**Decision**: Server-Sent Events (SSE) via `sse-starlette` and FastAPI `asyncio.Queue`.  
**Comparison & Justification**:
- Helpdesk updates are **unidirectional** (server notifies client when a ticket is created or status changes; the client communicates via standard REST `POST`/`PATCH`).
- WebSockets introduce bidirectional overhead, custom protocol negotiation, heartbeat maintenance, and stateful socket handling across load balancers.
- SSE runs over standard HTTP, natively supports auto-reconnection in the browser `EventSource` API, and works out-of-the-box through corporate firewalls and proxies.
**Failure Mode**:
- If an SSE connection drops (e.g., network switch, Wi-Fi blip), browser `EventSource` automatically retries connection every 3 seconds.
- If a ticket was resolved while an employee was disconnected, their view would show the previous state until reconnection or page reload.
- *Mitigation*: When `EventSource.onopen` fires after reconnection, the client automatically re-triggers `fetchTickets()` to synchronize state.

### g) What is the worst failure mode in your system today, and what would you do to address it?
**Worst Failure Mode**: **LLM / Groq API Outage or Rate Limit (HTTP 429 / 503)** during ticket submission or draft generation.  
If Groq experiences downtime:
- Currently, ticket submission falls back gracefully to `"Other"` category and `"Medium"` priority so ticket creation never crashes, but draft reply generation returns a fallback notice: *"I don't have specific information about this in our knowledge base. Please consult with the IT team directly."*
**What I would do to address it**:
1. **Background Async Job Queue**: Move LLM categorization and RAG generation out of the request-response cycle into a background worker (e.g., Celery or ARQ with Redis). Tickets would be saved immediately with `status="processing"`, and the AI suggestions would stream in asynchronously via SSE when ready.
2. **Provider Redundancy / Fallback Chain**: Configure LangChain with a fallback provider (e.g., primary: Groq LLaMA, secondary: OpenAI `gpt-4o-mini`, tertiary: local Ollama instance).
3. **Dead-Letter Queue (DLQ)**: Failed LLM calls would retry with exponential backoff rather than silently defaulting.

### h) Where did AI tools help you most? Where did they hurt or mislead you?
**Where AI Helped Most**:
- Generating boilerplate schemas, initial CRUD routers, and initial knowledge base markdown scenarios.
- Writing the comprehensive CSS layout and responsive dashboard views rapidly.
- Designing the statistical aggregation queries in `metrics.py` (calculating median resolution time across timestamps in SQL/Python).
**Where AI Misled / Hurt**:
- **Package Incompatibilities**: AI initially recommended `faiss-cpu==1.9.0` and `asyncpg==0.29.0`. On Windows with Python 3.14, these libraries lacked pre-built wheels and triggered severe C++ Microsoft Visual Studio build tool errors. I had to intervene, diagnose the lack of C-compilers in the runtime environment, and migrate the async DB connector to `psycopg[binary]` with a Windows event loop policy (`WindowsSelectorEventLoopPolicy`).
- **Decommissioned Models**: AI initially hardcoded `llama3-8b-8192`, which Groq had deprecated. I debugged the 404 response via the Groq SDK model discovery endpoint and updated the pipeline to the active `qwen/qwen3.8-27b` model.

---

## What I Would Do With More Time

1. **Persistent Vector Database with pgvector**: Replace the in-memory vector store with PostgreSQL's `pgvector` extension so knowledge base embeddings persist inside Supabase across backend container restarts.
2. **Automated Ticket Assignment**: Implement agent workload distribution algorithms (round-robin or least-loaded agent assignment) based on ticket category expertise.
3. **Draft Quality Feedback Loop**: Track an "Edit Distance" metric (Levenshtein distance between `ai_draft_reply` and `final_reply`) to evaluate LLM draft accuracy over time on the Metrics page.
4. **File Upload S3 / Supabase Storage**: Connect actual file attachments to Supabase Storage with signed upload URLs instead of metadata filenames.
5. **Full Docker Compose Setup**: Provide a multi-stage `docker-compose.yml` defining backend, frontend, and local PostgreSQL for zero-dependency one-command evaluation.

---

## Known Issues / Limitations

1. **SSE Multi-Worker Scaling**: The current SSE implementation uses in-memory `asyncio.Queue` objects. If running multiple Uvicorn workers or across distributed nodes, events must be backed by a Redis Pub/Sub channel.
2. **Token in SSE Query String**: Because native browser `EventSource` cannot pass custom `Authorization` headers, the JWT is transmitted as a URL query parameter (`?token=...`), which may appear in access logs unless scrubbed by an API gateway.
3. **Embedding Model Scalability**: The current in-memory vector index loads KB articles from disk on startup. While sub-millisecond for 5–20 articles, scaling to thousands of enterprise articles requires dedicated vector databases.
