# QA Hub - Next.js 15 Application

Internal QA management system with GitLab integration for a 4-person team.

## Backend Status: ✅ COMPLETE

The complete backend infrastructure has been implemented including:

### Architecture
- **Framework**: Next.js 15 (App Router)
- **Database**: SQLite with Drizzle ORM
- **Auth**: NextAuth.js with GitLab OAuth
- **File Storage**: GitLab project uploads
- **API**: Server Actions + REST endpoints

### Implemented Backend Components

#### 1. Configuration Files
- ✅ `package.json` - All dependencies configured
- ✅ `tsconfig.json` - TypeScript strict mode
- ✅ `tailwind.config.js` - Tailwind CSS setup
- ✅ `drizzle.config.ts` - Database ORM configuration
- ✅ `.env.example` - Environment variables template
- ✅ `next.config.mjs` - Next.js configuration

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

#### 4. GitLab Integration (`/lib/gitlab.ts`)
- ✅ Client wrapper
- ✅ Project fetching methods
- ✅ Issue CRUD operations
- ✅ Label management
- ✅ File upload to GitLab
- ✅ Webhook creation
- ✅ Project members fetching

#### 5. Authentication (`/auth.ts`)
- ✅ NextAuth configuration
- ✅ GitLab OAuth provider
- ✅ Session callbacks with access token
- ✅ JWT augmentation
- ✅ Type definitions (`/types/next-auth.d.ts`)

#### 6. Server Actions (`/app/actions/`)
- ✅ `project.ts` - Add, configure, list projects
- ✅ `qaRecords.ts` - Create, update, submit (pass/fail), delete QA records
- ✅ `uploadAttachment.ts` - File upload with validation
- ✅ `notifications.ts` - Get, mark read, mark all read

#### 7. API Routes (`/app/api/`)
- ✅ `/api/auth/[...nextauth]` - NextAuth handlers
- ✅ `/api/webhooks/gitlab` - GitLab webhook processor
- ✅ `/api/issues/update-labels` - Label update endpoint

### Key Features Implemented

1. **Full GitLab Integration**
   - OAuth authentication
   - Real-time webhook sync
   - Issue label synchronization
   - File uploads to GitLab storage

2. **QA Workflow**
   - Test Cases editor (Tiptap JSON)
   - Issues Found editor (Tiptap JSON)
   - @mentions extraction
   - Pass/Fail with GitLab comment posting
   - Shareable public links (UUID-based)

3. **Type Safety**
   - 100% TypeScript
   - Zod validation for environment
   - Drizzle ORM type inference
   - NextAuth type augmentation

4. **Mock Mode**
   - `NEXT_PUBLIC_MOCK_MODE` environment variable
   - Allows development without GitLab connection

## Frontend Status: ⏳ PENDING

The frontend implementation is ready to begin. It will include:
- Dashboard with statistics
- Issues board (Kanban drag-and-drop)
- QA Detail view with Tiptap editors
- Notifications
- Project management
- Tools & Snippets (from prototype)

## Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your values
# Set NEXT_PUBLIC_MOCK_MODE="true" for development

# Push database schema
npm run db:push

# Start development server
npm run dev
```

## Mock Mode Development

For development without GitLab:

1. Set `NEXT_PUBLIC_MOCK_MODE="true"` in `.env.local`
2. GitLab credentials become optional
3. Mock data will be used instead of real GitLab API calls

## Production Deployment

1. Set up GitLab OAuth application
2. Configure webhooks in GitLab projects
3. Set `NEXT_PUBLIC_MOCK_MODE="false"`
4. Provide all GitLab environment variables
5. Run `npm run build && npm start`

## Database Management

```bash
# Push schema changes
npm run db:push

# Open Drizzle Studio (GUI)
npm run db:studio
```

## Next Steps

Switch to Gemini model in Antigravity, then the frontend will be implemented with:
- Shadcn UI components
- React Query data fetching
- Tiptap rich text editors
- DND Kit drag-and-drop
- Recharts for analytics
- Matching the Vite/React prototype design
