# QA Hub - Next.js 15 Application

Internal QA management system with GitLab integration for a 4-person team.

## Status: ✅ FULLY FUNCTIONAL (Mock Mode)

The application is now fully functional in **Mock Mode** for offline development and testing.

### Architecture
- **Framework**: Next.js 15.5.6 (App Router)
- **Database**: SQLite with Drizzle ORM
- **Auth**: NextAuth.js v5 (Beta) with GitLab OAuth + Mock Credentials Provider
- **File Storage**: GitLab project uploads (with mock fallback)
- **API**: Server Actions + REST endpoints
- **UI**: Shadcn UI + Tailwind CSS

### Recent Updates (2025-12-01)

#### ✅ Real-time Notifications
- Implemented polling mechanism for instant notification updates
- Notifications refresh automatically without page reload

#### ✅ Enhanced Tiptap Editor
- **Image Resizing**: Drag-to-resize support for images in tables and content
- **Table Improvements**: Fixed menu positioning, better border styling, and spacing
- **Font Size Control**: Added dropdown for text size adjustment (Small to Huge)
- **Snippets**: Quick insertion of reusable text snippets

#### ✅ UI/UX Refinements
- **Premium Design**: Polished spacing, fonts, and dark mode consistency
- **Clickable Rows**: Entire issue rows are now clickable for better usability
- **Multi-label Selection**: Improved dropdowns to support selecting multiple labels without closing
- **Search & Filter**: Fixed search bar alignment and label filtering consistency

#### ✅ Code Quality & Stability
- **Centralized Logger**: New `logger.ts` utility for consistent logging across environments
- **Error Boundaries**: Added `ErrorBoundary` components for graceful failure handling
- **Strict Types**: Eliminated `any` types and improved TypeScript coverage

### Implemented Components

#### 1. Configuration Files
- ✅ `package.json` - All dependencies configured
- ✅ `tsconfig.json` - TypeScript strict mode
- ✅ `tailwind.config.js` - Tailwind CSS setup
- ✅ `drizzle.config.ts` - Database ORM configuration
- ✅ `.env.example` - Environment variables template
- ✅ `next.config.mjs` - Next.js 15 optimized configuration

#### 2. Database Schema (`/db/schema.ts`)
- ✅ Auth tables (users, accounts, sessions, verification tokens)
- ✅ Projects table with GitLab sync
- ✅ QA Records with Tiptap JSON content
- ✅ Attachments with GitLab URLs
- ✅ Notifications system
- ✅ User-Project many-to-many relationship
- ✅ Full relations and indexes

#### 3. Environment & Utils (`/lib/`)
- ✅ `env.ts` - Type-safe environment validation with t3-env
- ✅ `db.ts` - Database connection with Drizzle
- ✅ `utils.ts` - Utility functions (cn, tiptapToMarkdown, extractMentions)
- ✅ `rateLimit.ts` - Upload rate limiting (10/min per user)
- ✅ `mode.ts` - Centralized mock/production mode utilities
- ✅ `constants.ts` - Shared constants (system users, default labels, rate limits)
- ✅ `mock-user.ts` - Mock user/project/group creation utilities
- ✅ `validations.ts` - Zod validation schemas for server actions
- ✅ `logger.ts` - Centralized logging utility

#### 4. GitLab Integration (`/lib/gitlab/`)
- ✅ `index.ts` - Module re-exports
- ✅ `types.ts` - GitLab-related TypeScript types
- ✅ `mock-data.ts` - Centralized mock data (4 projects, users, labels)
- ✅ `simulation.ts` - Error simulation, webhook simulation, data evolution
- ✅ `../gitlab.ts` - Main GitLab API wrapper with mock mode support
- ✅ Project fetching methods
- ✅ Issue CRUD operations
- ✅ Label management
- ✅ File upload to GitLab (with placeholder fallback)
- ✅ Webhook creation
- ✅ Project members fetching

#### 5. Authentication (`/auth.ts`)
- ✅ NextAuth v5 configuration
- ✅ GitLab OAuth provider
- ✅ **Mock Credentials Provider** (ID: 'mock-login')
- ✅ Session callbacks with access token
- ✅ JWT augmentation for mock users
- ✅ Type definitions (`/types/next-auth.d.ts`)

#### 6. Server Actions (`/app/actions/`)
- ✅ `dashboard.ts` - Dashboard statistics
- ✅ `project.ts` - Add, configure, list projects
- ✅ `qaRecords.ts` - Create, update, submit (pass/fail), delete QA records
- ✅ `uploadAttachment.ts` - File upload with validation
- ✅ `notifications.ts` - Get, mark read, mark all read

#### 7. API Routes (`/app/api/`)
- ✅ `/api/auth/[...nextauth]` - NextAuth handlers
- ✅ `/api/webhooks/gitlab` - GitLab webhook processor
- ✅ `/api/issues/update-labels` - Label update endpoint

#### 8. Pages & UI
- ✅ `/auth/signin` - Sign-in page with mock mode indicator
- ✅ `/` - Dashboard with statistics
- ✅ `/issues` - Issues list
- ✅ `/board` - Kanban board redirect
- ✅ `/[projectId]` - Project board with validation
- ✅ Sidebar navigation
- ✅ Layout components

### Key Features

1. **Mock Mode (Development)**
   - No GitLab credentials required
   - Instant sign-in as "Mock Tester"
   - Pre-populated mock data
   - All write operations logged to console
   - Perfect for local development and testing

2. **Full GitLab Integration (Production)**
   - OAuth authentication
   - Real-time webhook sync
   - Issue label synchronization
   - File uploads to GitLab storage

3. **QA Workflow**
   - Test Cases editor (Tiptap JSON) with tables & images
   - Issues Found editor (Tiptap JSON)
   - **New**: Drag-to-resize images and advanced table controls
   - **New**: Text snippets for quick insertion
   - @mentions extraction
   - Pass/Fail with GitLab comment posting
   - Shareable public links (UUID-based)

4. **Type Safety**
   - 100% TypeScript
   - Zod validation for environment and server actions
   - Drizzle ORM type inference
   - NextAuth type augmentation
   - Dedicated type files for dashboard and editor components

5. **Built-in Tools**
   - **Test Data Generator**: Generate mock identity, finance, and location data for testing
   - **Snippets Manager**: Manage reusable text snippets for issue descriptions

## Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your values (see below)

# Push database schema
npm run db:push

# Start development server
npm run dev
```

## Environment Setup

### For Mock Mode (Recommended for Development)

Create `.env.local` with:

```bash
# Database
DATABASE_URL=file:local.db

# Mock Mode (bypasses GitLab)
NEXT_PUBLIC_MOCK_MODE=true

# Auth Secret (generate with: openssl rand -base64 32)
AUTH_SECRET=your-secret-key-here

# Optional: Gemini API for AI features
GEMINI_API_KEY=your-gemini-key
```

### For Production (GitLab Integration)

```bash
# Database
DATABASE_URL=file:local.db

# Mock Mode - MUST be false for production
NEXT_PUBLIC_MOCK_MODE=false

# GitLab OAuth
GITLAB_CLIENT_ID=your-gitlab-app-id
GITLAB_CLIENT_SECRET=your-gitlab-app-secret
GITLAB_BASE_URL=https://gitlab.com
GITLAB_API_VERSION=v4

# NextAuth
AUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Webhooks
WEBHOOK_SECRET=your-webhook-secret

# Optional: Gemini API
GEMINI_API_KEY=your-gemini-key
```

## Mock Mode Usage

1. **Start the server**:
   ```bash
   npm run dev
   ```

2. **Navigate to**: `http://localhost:3000/auth/signin`

3. **Click "Sign in with GitLab"** - You'll be instantly logged in as "Mock Tester"

## Database Management

```bash
# Push schema changes
npm run db:push

# Open Drizzle Studio (GUI)
npm run db:studio
```

## Troubleshooting

### Clear Cache and Restart

If you encounter issues:

```bash
# Kill all dev servers
pkill -f "next dev"

# Clear build cache
rm -rf .next node_modules/.cache

# Restart
npm run dev
```

### Port Already in Use

If port 3000 is in use, Next.js will automatically use port 3001. Check the terminal output for the correct URL.

## Production Deployment

1. Set up GitLab OAuth application at `https://gitlab.com/-/profile/applications`
2. Configure webhooks in GitLab projects
3. Set `NEXT_PUBLIC_MOCK_MODE=false` in production environment
4. Provide all required GitLab environment variables
5. Run:
   ```bash
   npm run build
   npm start
   ```

## Tech Stack

- **Next.js 15.5.6** - React framework with App Router
- **React 19** - UI library
- **TypeScript 5** - Type safety
- **Tailwind CSS 3** - Styling
- **Shadcn UI** - Component library
- **NextAuth.js v5** - Authentication
- **Drizzle ORM** - Database ORM
- **SQLite (libsql)** - Database
- **GitBeaker** - GitLab API client
- **Tiptap** - Rich text editor
- **DND Kit** - Drag and drop
- **Recharts** - Charts and analytics
- **date-fns** - Date utilities

## License

Internal use only.
