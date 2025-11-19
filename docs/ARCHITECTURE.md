# Yggdrasil - Architecture Documentation

## Project Overview

Yggdrasil is a family tree application built with Next.js, React, and AWS services. It allows users to create, view, and edit their family heritage with an interactive visualization.

## Technology Stack

### Frontend

- **Next.js 16** with App Router - Server-side rendering and routing
- **React 19** - UI components and state management
- **TypeScript 5** - Type safety and better developer experience
- **Tailwind CSS 4** - Utility-first styling

### Backend & Database

- **AWS DynamoDB** - NoSQL database with single-table design
- **DynamoDB Local** (Docker) - Local development database
- **AWS SDK v3** - Modular AWS service clients

### Authentication

- **NextAuth.js v5** - Flexible authentication framework
- **Local Mode**: Credentials provider with bcrypt password hashing
- **Production Mode**: AWS Cognito User Pool integration

### State Management & Data Fetching

- **TanStack Query (React Query)** - Server state management, caching, automatic refetching
- **React Hook Form** - Performant form handling with validation
- **Zod** - TypeScript-first schema validation

### Visualization

- **ReactFlow** - Node-based diagram library for interactive family trees
- Custom node components for person representation
- Graph traversal algorithms for tree navigation

## Directory Structure

```
yggdrasil/
├── src/
│   ├── app/                          # Next.js App Router pages
│   │   ├── api/                      # API route handlers
│   │   │   ├── auth/                 # Authentication endpoints
│   │   │   ├── persons/              # Person CRUD endpoints
│   │   │   ├── relationships/        # Relationship endpoints
│   │   │   └── trees/                # Tree endpoints
│   │   ├── auth/                     # Auth pages (signin, signup)
│   │   ├── dashboard/                # User dashboard
│   │   ├── tree/                     # Tree views
│   │   └── person/                   # Person detail/edit pages
│   │
│   ├── components/                   # React components
│   │   ├── ui/                       # Reusable UI components (Button, Input, etc.)
│   │   ├── layout/                   # Layout components (Header, Sidebar, Footer)
│   │   ├── tree/                     # Tree visualization components
│   │   ├── person/                   # Person-related components
│   │   └── auth/                     # Authentication components
│   │
│   ├── lib/                          # Core application logic
│   │   ├── aws/                      # AWS SDK configuration and clients
│   │   │   ├── config.ts             # Environment-aware AWS configuration
│   │   │   ├── dynamodb.ts           # DynamoDB client setup
│   │   │   └── s3.ts                 # S3 client setup
│   │   ├── services/                 # Business logic layer
│   │   │   ├── personService.ts      # Person CRUD operations
│   │   │   ├── relationshipService.ts # Relationship management
│   │   │   ├── treeService.ts        # Tree operations
│   │   │   └── userService.ts        # User management
│   │   ├── utils/                    # Utility functions
│   │   │   ├── treeTraversal.ts      # Graph algorithms (BFS, DFS)
│   │   │   ├── treeLayout.ts         # Tree positioning algorithms
│   │   │   ├── dateHelpers.ts        # Date formatting utilities
│   │   │   └── validators.ts         # Custom validation functions
│   │   └── hooks/                    # Custom React hooks
│   │       ├── useAuth.ts            # Authentication hook
│   │       ├── usePerson.ts          # Person data fetching
│   │       ├── useRelationships.ts   # Relationship queries
│   │       └── useFamilyTree.ts      # Tree data management
│   │
│   ├── types/                        # TypeScript type definitions
│   │   ├── person.ts                 # Person entity types
│   │   ├── relationship.ts           # Relationship types
│   │   ├── tree.ts                   # Tree types
│   │   └── auth.ts                   # Authentication types
│   │
│   └── constants/                    # Application constants
│       ├── relationships.ts          # Relationship type definitions
│       └── config.ts                 # App-wide configuration
│
├── scripts/                          # Utility scripts
│   ├── setup-dynamodb.ts             # DynamoDB table creation
│   ├── seed-data.ts                  # Sample data generation
│   ├── backup-local-data.ts          # Local data backup
│   └── migrate-to-aws.ts             # AWS migration script
│
├── docs/                             # Documentation
│   ├── ARCHITECTURE.md               # This file
│   ├── dynamodb-schema.md            # Database schema documentation
│   └── deployment.md                 # Deployment guide
│
├── infrastructure/                   # Infrastructure as Code
│   └── aws-cdk/                      # AWS CDK stack definitions
│
├── public/                           # Static assets
│   └── images/                       # Image files
│
├── .env.local                        # Local environment variables
├── .env.production                   # Production environment variables
├── docker-compose.yml                # Docker services configuration
└── package.json                      # Dependencies and scripts
```

## Data Flow Architecture

### 1. User Request Flow

```
User Browser → Next.js Page → React Query Hook → API Route → Service Layer → DynamoDB
```

### 2. Authentication Flow

```
User Login → NextAuth.js → Credentials Provider → UserService → DynamoDB User Record → JWT Token
```

### 3. Tree Visualization Flow

```
User Opens Tree → useFamilyTree Hook → Fetch Persons & Relationships →
Tree Traversal Algorithm → ReactFlow Layout → Render Nodes & Edges
```

## DynamoDB Single-Table Design

### Why Single-Table?

- **Cost Efficiency**: One table = one set of capacity units
- **Performance**: Related data fetched in single query
- **Scalability**: DynamoDB scales per table
- **Flexibility**: GSIs provide multiple access patterns

### Key Design Patterns

1. **Composite Keys**: `PK` and `SK` allow hierarchical data organization
2. **Global Secondary Indexes**: Reverse lookups and alternative access patterns
3. **Bi-directional Relationships**: Parent→Child and Child→Parent stored separately
4. **Entity Type Discrimination**: `EntityType` field identifies record type

### Access Patterns Supported

- Get all trees for a user
- Get all persons in a tree
- Get person details by ID
- Get parents of a person
- Get children of a person
- Get spouse(s) of a person
- Get all relationships in a tree

## Environment Configuration

### Local Development

- DynamoDB Local running in Docker (port 8000)
- LocalStack S3 emulation (optional)
- NextAuth.js with Credentials provider
- Mock email verification

### Production (AWS)

- AWS DynamoDB (on-demand capacity)
- AWS Cognito User Pool
- AWS S3 for photo storage
- AWS Amplify hosting

## Security Considerations

### Local Development

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens for session management
- HTTPS in production only

### Production

- AWS Cognito for authentication
- IAM roles with least privilege
- S3 bucket policies for private access
- Signed URLs for photo access
- Environment variables for secrets

## Performance Optimization

### Database

- Single-table design reduces cross-table queries
- BatchGetItem for fetching multiple persons
- GSIs for optimized query patterns
- Sparse indexes to reduce costs

### Frontend

- React Query caching (5-minute stale time)
- Optimistic updates for better UX
- Lazy loading for large trees
- Code splitting with Next.js dynamic imports

### Visualization

- Virtual rendering for large trees (500+ nodes)
- Debounced search/filter
- Memoized tree calculations

## Development Workflow

### Local Development

1. Start Docker services: `npm run docker:up`
2. Initialize database: `npm run db:setup`
3. Seed sample data: `npm run db:seed`
4. Start dev server: `npm run dev`
5. Open browser: `http://localhost:3000`

### Production Deployment

1. Set AWS credentials
2. Deploy infrastructure: `npm run deploy:infrastructure`
3. Build application: `npm run build`
4. Deploy to Amplify: `npm run deploy:amplify`

## Testing Strategy

### Unit Tests

- Service layer functions
- Utility functions (tree traversal, validators)
- React hooks

### Integration Tests

- API routes with mocked DynamoDB
- Authentication flows

### E2E Tests (Future)

- User journey: Sign up → Create tree → Add persons → View tree

## Future Enhancements

### Phase 2 Features

- GEDCOM import/export
- Tree collaboration (multiple editors)
- Advanced search (by name, date, location)
- Tree statistics and reports

### Phase 3 Features

- Photo albums
- Document attachments (birth certificates, etc.)
- DNA integration
- Historical records search

## Resources & References

- [Next.js Documentation](https://nextjs.org/docs)
- [AWS DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [ReactFlow Documentation](https://reactflow.dev/)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
