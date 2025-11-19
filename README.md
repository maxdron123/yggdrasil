# Yggdrasil

A modern family tree builder that actually works the way you'd expect. Built because I got tired of clunky genealogy software that feels stuck in 2005.

## What It Does

Build and visualize your family tree with an interactive canvas. Add people, connect relationships (parents, spouses, siblings), and see everything laid out visually. Store photos, dates, places, and notes about your relatives.

The tree visualization uses drag-and-drop nodes, so you can arrange things however makes sense to you. Everything syncs to a database, so your family history is safe.

## Tech Stack

**Frontend:**
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- ReactFlow (for the tree canvas)
- TanStack Query (data fetching)

**Backend:**
- NextAuth.js v5 (authentication)
- AWS DynamoDB (single-table design)
- AWS S3 (photo storage - planned)

**Development:**
- Docker (runs DynamoDB locally, no AWS needed)
- DynamoDB Admin UI (visual database inspector)

## Getting Started

### Prerequisites

- Node.js 20+
- Docker Desktop
- Git

### Installation

```bash
# Clone the repo
git clone https://github.com/maxdron123/yggdrasil.git
cd yggdrasil

# Install dependencies
npm install

# Start Docker containers (DynamoDB Local + Admin UI)
npm run docker:up

# Set up the database table
npm run db:setup

# Load sample data (optional but recommended)
npm run db:seed

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and you're good to go.

### Demo Account

Try it out with:
- Email: `demo@yggdrasil.local`
- Password: `demo123`

The seed data includes a few sample family trees to play with.

## Project Structure

```
yggdrasil/
├── src/
│   ├── app/              # Next.js pages & API routes
│   ├── components/       # React components
│   │   ├── ui/          # Buttons, inputs, modals, etc.
│   │   ├── layout/      # Navbar, layout wrappers
│   │   ├── person/      # Person cards & forms
│   │   └── tree/        # Tree visualization components
│   ├── lib/
│   │   ├── aws/         # DynamoDB & S3 clients
│   │   ├── auth/        # NextAuth configuration
│   │   ├── services/    # Business logic layer
│   │   ├── hooks/       # React Query hooks
│   │   └── providers/   # Context providers
│   └── types/           # TypeScript definitions
├── scripts/             # Database scripts
├── docs/                # Documentation
└── docker/              # Docker data (gitignored)
```

## Available Scripts

**Docker:**
```bash
npm run docker:up        # Start containers
npm run docker:down      # Stop containers
npm run docker:logs      # View container logs
```

**Database:**
```bash
npm run db:setup         # Create DynamoDB tables
npm run db:seed          # Load sample data
npm run db:backup        # Backup local data to JSON
```

**Development:**
```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run lint             # Run ESLint
```

## How It Works

### Database Design

Uses a single DynamoDB table with a generic key structure that supports multiple entity types:

- **Users** - Authentication and account info
- **Trees** - Family tree metadata
- **Persons** - Individual people in trees
- **Relationships** - Connections between people (parent/child, spouse, sibling)

Each relationship is stored bidirectionally, so you can efficiently query "get parents" or "get children" without scanning the whole table.

### Local Development

Everything runs locally in Docker. No AWS account needed for development. The configuration automatically switches between local and production based on environment variables.

Set `DYNAMODB_ENDPOINT=http://localhost:8000` for local, or leave it empty for AWS.

### Authentication

NextAuth.js handles authentication with two providers:

1. **Credentials** (email/password) - for local development
2. **Cognito** - for production (not configured yet)

Passwords are hashed with bcrypt. Sessions use JWT tokens.

## Deployment

Not deployed yet, but the plan:

1. Deploy to Vercel/AWS Amplify
2. Create production DynamoDB table
3. Set up Cognito User Pool
4. Configure S3 bucket for photos
5. Update environment variables

## Environment Variables

Copy `.env.production.template` to `.env.local` and fill in your values:

```bash
# Database (local development)
DYNAMODB_ENDPOINT=http://localhost:8000
DYNAMODB_REGION=us-east-1
DYNAMODB_TABLE_NAME=Yggdrasil

# Auth (required)
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# AWS (production only)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

## Features

**Current:**
- ✅ User authentication (sign up, sign in, sign out)
- ✅ Create multiple family trees
- ✅ Add people with detailed info (dates, places, occupation, bio)
- ✅ Connect relationships (parent/child, spouse, sibling)
- ✅ Interactive tree visualization with zoom/pan
- ✅ List view with search
- ✅ Responsive design

**Planned:**
- 📷 Photo uploads for people
- 🔍 Advanced search and filtering
- 📊 Statistics and insights
- 🌍 Map view showing birthplaces
- 📤 Export to GEDCOM format
- 🔗 Shareable public trees
- 📱 Mobile app (maybe)

## Contributing

This is a personal project, but if you find bugs or have ideas, feel free to open an issue. PRs welcome if you want to add something cool.

## License

MIT - do whatever you want with it.

## Why "Yggdrasil"?

It's the world tree from Norse mythology. Seemed fitting for a family tree app. Plus it sounds cooler than "FamilyTreeApp" or whatever.

---

Built with ☕ and occasional frustration by Max
