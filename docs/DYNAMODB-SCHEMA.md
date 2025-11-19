# DynamoDB Schema Documentation

## Overview

The Yggdrasil application uses Amazon DynamoDB with a **single-table design pattern**. This design stores all entity types (Users, Trees, Persons, Relationships) in one table, optimized for access patterns rather than normalized data structure.

## Table Structure

### Table Name

`Yggdrasil`

### Primary Key

- **PK** (Partition Key): String - Determines which partition stores the item
- **SK** (Sort Key): String - Enables range queries and hierarchical data

### Global Secondary Indexes (GSIs)

#### GSI1: Reverse Lookup Index

- **GSI1PK** (Partition Key): String
- **GSI1SK** (Sort Key): String
- **Purpose**: Query relationships in reverse direction
- **Projection**: ALL attributes

#### GSI2: Tree-Based Query Index

- **GSI2PK** (Partition Key): String
- **GSI2SK** (Sort Key): String
- **Purpose**: Get all entities belonging to a specific tree
- **Projection**: ALL attributes

#### GSI3: User-Based Query Index

- **GSI3PK** (Partition Key): String
- **GSI3SK** (Sort Key): String
- **Purpose**: Get all entities belonging to a specific user
- **Projection**: ALL attributes

### Billing Mode

**PAY_PER_REQUEST** (On-Demand)

- No capacity planning required
- Pay only for actual read/write requests
- Perfect for development and unpredictable workloads
- AWS Free Tier: 25 RCU and 25 WCU included monthly

---

## Entity Types

### 1. User Account

**Purpose**: User authentication and profile information

**Key Pattern**:

```
PK: USER#<userId>
SK: PROFILE
```

**Attributes**:
| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| EntityType | String | Yes | "User" |
| UserId | String | Yes | Unique user identifier (UUID) |
| Email | String | Yes | User's email (unique) |
| PasswordHash | String | Local only | bcrypt hash (local auth) |
| CognitoUsername | String | AWS only | Cognito sub (production auth) |
| DisplayName | String | No | User's display name |
| CreatedAt | String | Yes | ISO 8601 timestamp |
| UpdatedAt | String | Yes | ISO 8601 timestamp |
| GSI3PK | String | Yes | `USER#<userId>` |
| GSI3SK | String | Yes | `PROFILE` |

**Access Patterns**:

```typescript
// 1. Get user by ID
PK = "USER#<userId>" AND SK = "PROFILE"

// 2. Get user by email (requires scan or separate GSI in production)
// For demo: scan with filter on Email attribute
```

**Example Item**:

```json
{
  "PK": "USER#550e8400-e29b-41d4-a716-446655440000",
  "SK": "PROFILE",
  "EntityType": "User",
  "UserId": "550e8400-e29b-41d4-a716-446655440000",
  "Email": "john@example.com",
  "PasswordHash": "$2a$10$...",
  "DisplayName": "John Doe",
  "CreatedAt": "2025-11-18T12:00:00.000Z",
  "UpdatedAt": "2025-11-18T12:00:00.000Z",
  "GSI3PK": "USER#550e8400-e29b-41d4-a716-446655440000",
  "GSI3SK": "PROFILE"
}
```

---

### 2. Family Tree

**Purpose**: Metadata about a family tree

**Key Pattern**:

```
PK: USER#<userId>
SK: TREE#<treeId>
```

**Attributes**:
| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| EntityType | String | Yes | "Tree" |
| TreeId | String | Yes | Unique tree identifier (UUID) |
| UserId | String | Yes | Owner of the tree |
| TreeName | String | Yes | Display name for the tree |
| Description | String | No | Tree description |
| RootPersonId | String | No | ID of root person in tree |
| IsPublic | Boolean | Yes | Public visibility flag |
| SharedWith | String[] | No | UserIds with access |
| PersonCount | Number | Yes | Count of persons in tree |
| CreatedAt | String | Yes | ISO 8601 timestamp |
| UpdatedAt | String | Yes | ISO 8601 timestamp |
| GSI1PK | String | Yes | `TREE#<treeId>` |
| GSI1SK | String | Yes | `USER#<userId>` |
| GSI2PK | String | Yes | `TREE#<treeId>` |
| GSI2SK | String | Yes | `TREE#METADATA` |
| GSI3PK | String | Yes | `USER#<userId>` |
| GSI3SK | String | Yes | `TREE#<timestamp>` |

**Access Patterns**:

```typescript
// 1. Get all trees for a user
PK = "USER#<userId>" AND SK begins_with "TREE#"

// 2. Get tree by ID (reverse lookup via GSI1)
GSI1PK = "TREE#<treeId>"

// 3. Get user's trees sorted by creation date
GSI3PK = "USER#<userId>" AND GSI3SK begins_with "TREE#"
```

**Example Item**:

```json
{
  "PK": "USER#550e8400-e29b-41d4-a716-446655440000",
  "SK": "TREE#tree-001",
  "EntityType": "Tree",
  "TreeId": "tree-001",
  "UserId": "550e8400-e29b-41d4-a716-446655440000",
  "TreeName": "The Smith Family",
  "Description": "Our family tree spanning 5 generations",
  "RootPersonId": "person-001",
  "IsPublic": false,
  "PersonCount": 42,
  "CreatedAt": "2025-11-18T12:00:00.000Z",
  "UpdatedAt": "2025-11-18T12:00:00.000Z",
  "GSI1PK": "TREE#tree-001",
  "GSI1SK": "USER#550e8400-e29b-41d4-a716-446655440000",
  "GSI2PK": "TREE#tree-001",
  "GSI2SK": "TREE#METADATA",
  "GSI3PK": "USER#550e8400-e29b-41d4-a716-446655440000",
  "GSI3SK": "TREE#2025-11-18T12:00:00.000Z"
}
```

---

### 3. Person

**Purpose**: Individual person in a family tree

**Key Pattern**:

```
PK: USER#<userId>
SK: PERSON#<personId>
```

**Attributes**:
| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| EntityType | String | Yes | "Person" |
| PersonId | String | Yes | Unique person identifier (UUID) |
| TreeId | String | Yes | Tree this person belongs to |
| UserId | String | Yes | Owner of the tree |
| FirstName | String | Yes | First name |
| MiddleName | String | No | Middle name(s) |
| LastName | String | Yes | Last/family name |
| BirthName | String | No | Birth surname (maiden name) |
| PreferredName | String | No | Nickname or preferred name |
| Suffix | String | No | Jr., Sr., III, etc. |
| Gender | String | Yes | Male, Female, Other, Unknown |
| BirthDate | String | No | YYYY-MM-DD format |
| DeathDate | String | No | YYYY-MM-DD format |
| BirthPlace | String | No | City, State/Province, Country |
| DeathPlace | String | No | City, State/Province, Country |
| Biography | String | No | Life story, notes |
| PhotoUrl | String | No | S3 URL to profile photo |
| CreatedAt | String | Yes | ISO 8601 timestamp |
| UpdatedAt | String | Yes | ISO 8601 timestamp |
| GSI1PK | String | Yes | `PERSON#<personId>` |
| GSI1SK | String | Yes | `TREE#<treeId>` |
| GSI2PK | String | Yes | `TREE#<treeId>` |
| GSI2SK | String | Yes | `PERSON#<personId>` |
| GSI3PK | String | Yes | `USER#<userId>` |
| GSI3SK | String | Yes | `PERSON#<timestamp>#<n>` |

**Access Patterns**:

```typescript
// 1. Get all persons in a tree
GSI2PK = "TREE#<treeId>" AND GSI2SK begins_with "PERSON#"

// 2. Get person by ID (reverse lookup via GSI1)
GSI1PK = "PERSON#<personId>"

// 3. Get person with tree and user info
PK = "USER#<userId>" AND SK = "PERSON#<personId>"
```

**Example Item**:

```json
{
  "PK": "USER#550e8400-e29b-41d4-a716-446655440000",
  "SK": "PERSON#person-001",
  "EntityType": "Person",
  "PersonId": "person-001",
  "TreeId": "tree-001",
  "UserId": "550e8400-e29b-41d4-a716-446655440000",
  "FirstName": "John",
  "MiddleName": "William",
  "LastName": "Smith",
  "BirthName": "Smith",
  "Gender": "Male",
  "BirthDate": "1950-05-15",
  "DeathDate": null,
  "BirthPlace": "Boston, MA, USA",
  "Biography": "World War II veteran...",
  "CreatedAt": "2025-11-18T12:00:00.000Z",
  "UpdatedAt": "2025-11-18T12:00:00.000Z",
  "GSI1PK": "PERSON#person-001",
  "GSI1SK": "TREE#tree-001",
  "GSI2PK": "TREE#tree-001",
  "GSI2SK": "PERSON#person-001",
  "GSI3PK": "USER#550e8400-e29b-41d4-a716-446655440000",
  "GSI3SK": "PERSON#2025-11-18T12:00:00.000Z#1"
}
```

---

### 4. Relationship (Parent-Child)

**Purpose**: Link between parent and child

**Key Pattern** (bidirectional - 2 items per relationship):

```
Item 1 (parent perspective):
PK: USER#<userId>
SK: PERSON#<parentId>#CHILD#<childId>

Item 2 (child perspective - via GSI1):
GSI1PK: PERSON#<childId>
GSI1SK: PARENT#<parentId>
```

**Attributes**:
| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| EntityType | String | Yes | "Relationship" |
| RelationshipType | String | Yes | "ParentChild" |
| ParentId | String | Yes | Parent person ID |
| ChildId | String | Yes | Child person ID |
| TreeId | String | Yes | Tree containing relationship |
| UserId | String | Yes | Owner of the tree |
| Type | String | Yes | Biological, Adoptive, Step, Foster |
| AdoptionDate | String | No | YYYY-MM-DD (if adoptive) |
| Notes | String | No | Additional information |
| CreatedAt | String | Yes | ISO 8601 timestamp |
| UpdatedAt | String | Yes | ISO 8601 timestamp |
| GSI1PK | String | Yes | `PERSON#<childId>` |
| GSI1SK | String | Yes | `PARENT#<parentId>` |
| GSI2PK | String | Yes | `TREE#<treeId>` |
| GSI2SK | String | Yes | `RELATIONSHIP#PARENT#...` |

**Access Patterns**:

```typescript
// 1. Get all children of a parent
PK = "USER#<userId>" AND SK begins_with "PERSON#<parentId>#CHILD#"

// 2. Get all parents of a child (reverse via GSI1)
GSI1PK = "PERSON#<childId>" AND GSI1SK begins_with "PARENT#"

// 3. Get all relationships in a tree
GSI2PK = "TREE#<treeId>" AND GSI2SK begins_with "RELATIONSHIP#"
```

**Example Item**:

```json
{
  "PK": "USER#550e8400-e29b-41d4-a716-446655440000",
  "SK": "PERSON#person-001#CHILD#person-003",
  "EntityType": "Relationship",
  "RelationshipType": "ParentChild",
  "ParentId": "person-001",
  "ChildId": "person-003",
  "TreeId": "tree-001",
  "UserId": "550e8400-e29b-41d4-a716-446655440000",
  "Type": "Biological",
  "CreatedAt": "2025-11-18T12:00:00.000Z",
  "UpdatedAt": "2025-11-18T12:00:00.000Z",
  "GSI1PK": "PERSON#person-003",
  "GSI1SK": "PARENT#person-001",
  "GSI2PK": "TREE#tree-001",
  "GSI2SK": "RELATIONSHIP#PARENT#person-001#person-003"
}
```

---

### 5. Relationship (Spousal)

**Purpose**: Marriage or partnership between two people

**Key Pattern** (bidirectional - 2 items per relationship):

```
Item 1 (person1 perspective):
PK: USER#<userId>
SK: PERSON#<person1Id>#SPOUSE#<person2Id>

Item 2 (person2 perspective - via GSI1):
GSI1PK: PERSON#<person2Id>
GSI1SK: SPOUSE#<person1Id>
```

**Attributes**:
| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| EntityType | String | Yes | "Relationship" |
| RelationshipType | String | Yes | "Spousal" |
| Person1Id | String | Yes | First person ID |
| Person2Id | String | Yes | Second person ID |
| TreeId | String | Yes | Tree containing relationship |
| UserId | String | Yes | Owner of the tree |
| Status | String | Yes | Married, Divorced, Widowed, Separated |
| MarriageDate | String | No | YYYY-MM-DD |
| MarriagePlace | String | No | City, State, Country |
| DivorceDate | String | No | YYYY-MM-DD |
| Notes | String | No | Additional information |
| CreatedAt | String | Yes | ISO 8601 timestamp |
| UpdatedAt | String | Yes | ISO 8601 timestamp |
| GSI1PK | String | Yes | `PERSON#<person2Id>` |
| GSI1SK | String | Yes | `SPOUSE#<person1Id>` |
| GSI2PK | String | Yes | `TREE#<treeId>` |
| GSI2SK | String | Yes | `RELATIONSHIP#SPOUSE#...` |

**Access Patterns**:

```typescript
// 1. Get spouses of a person
PK = "USER#<userId>" AND SK begins_with "PERSON#<personId>#SPOUSE#"

// 2. Get spouse relationships (reverse via GSI1)
GSI1PK = "PERSON#<personId>" AND GSI1SK begins_with "SPOUSE#"

// 3. Get all marriages in a tree
GSI2PK = "TREE#<treeId>" AND GSI2SK begins_with "RELATIONSHIP#SPOUSE#"
```

**Example Item**:

```json
{
  "PK": "USER#550e8400-e29b-41d4-a716-446655440000",
  "SK": "PERSON#person-001#SPOUSE#person-002",
  "EntityType": "Relationship",
  "RelationshipType": "Spousal",
  "Person1Id": "person-001",
  "Person2Id": "person-002",
  "TreeId": "tree-001",
  "UserId": "550e8400-e29b-41d4-a716-446655440000",
  "Status": "Married",
  "MarriageDate": "1975-06-20",
  "MarriagePlace": "Portland, ME, USA",
  "CreatedAt": "2025-11-18T12:00:00.000Z",
  "UpdatedAt": "2025-11-18T12:00:00.000Z",
  "GSI1PK": "PERSON#person-002",
  "GSI1SK": "SPOUSE#person-001",
  "GSI2PK": "TREE#tree-001",
  "GSI2SK": "RELATIONSHIP#SPOUSE#person-001#person-002"
}
```

---

## Common Query Examples

### Query 1: Get User Profile

```typescript
import { GetItemCommand } from "@aws-sdk/client-dynamodb";

const result = await docClient.send(
  new GetItemCommand({
    TableName: "Yggdrasil",
    Key: {
      PK: "USER#550e8400-e29b-41d4-a716-446655440000",
      SK: "PROFILE",
    },
  })
);
```

### Query 2: Get All Trees for a User

```typescript
import { QueryCommand } from "@aws-sdk/client-dynamodb";

const result = await docClient.send(
  new QueryCommand({
    TableName: "Yggdrasil",
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: {
      ":pk": "USER#550e8400-e29b-41d4-a716-446655440000",
      ":sk": "TREE#",
    },
  })
);
```

### Query 3: Get All Persons in a Tree

```typescript
const result = await docClient.send(
  new QueryCommand({
    TableName: "Yggdrasil",
    IndexName: "GSI2",
    KeyConditionExpression: "GSI2PK = :pk AND begins_with(GSI2SK, :sk)",
    ExpressionAttributeValues: {
      ":pk": "TREE#tree-001",
      ":sk": "PERSON#",
    },
  })
);
```

### Query 4: Get Children of a Parent

```typescript
const result = await docClient.send(
  new QueryCommand({
    TableName: "Yggdrasil",
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: {
      ":pk": "USER#550e8400-e29b-41d4-a716-446655440000",
      ":sk": "PERSON#person-001#CHILD#",
    },
  })
);
```

### Query 5: Get Parents of a Child (Reverse Lookup)

```typescript
const result = await docClient.send(
  new QueryCommand({
    TableName: "Yggdrasil",
    IndexName: "GSI1",
    KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :sk)",
    ExpressionAttributeValues: {
      ":pk": "PERSON#person-003",
      ":sk": "PARENT#",
    },
  })
);
```

---

## Design Decisions

### Why Single-Table Design?

**Pros**:

1. **Cost Efficiency**: One table = one set of read/write capacity units
2. **Performance**: Related data in one query (no joins)
3. **Scalability**: DynamoDB scales per table
4. **Flexibility**: Add new entity types without schema changes

**Cons**:

1. **Complexity**: Requires careful key design
2. **Learning Curve**: Different from relational database thinking
3. **Limited Queries**: Must design for specific access patterns

### Why Bidirectional Relationships?

Each relationship stores **two items** (one for each direction):

- Enables efficient queries from both sides
- Example: Find children of parent OR parents of child
- Trade-off: 2x write cost, but much faster reads

### Why GSI Overloading?

GSI2 and GSI3 use generic key names (GSI2PK, GSI2SK) to support multiple access patterns:

- GSI2: Tree-scoped queries
- GSI3: User-scoped queries
- Allows querying different entity types with same index

---

## Performance Considerations

### Read Patterns

- **GetItem**: 0.5 RCU for items up to 4KB (eventually consistent)
- **Query**: 0.5 RCU per 4KB read (eventually consistent)
- **Scan**: Avoid in production (expensive, slow)

### Write Patterns

- **PutItem/UpdateItem**: 1 WCU per 1KB
- **BatchWriteItem**: Max 25 items per batch
- **Relationships**: Each creates 2 items (2 WCUs)

### Best Practices

1. Use Query instead of Scan
2. Fetch only needed attributes (ProjectionExpression)
3. Use eventually consistent reads when possible
4. Batch operations when creating multiple items
5. Monitor costs in CloudWatch (production)

---

## Migration from DynamoDB Local to AWS

When deploying to production:

1. **Unset DYNAMODB_ENDPOINT** in environment variables
2. **Configure AWS credentials** (IAM role recommended)
3. **Run setup script**: `npm run db:setup`
4. **Migrate data**:
   - Export from local: `npm run db:backup`
   - Import to AWS: Use AWS Data Pipeline or custom script
5. **Update NextAuth provider** to use Cognito
6. **Enable Point-in-Time Recovery** for production table
7. **Set up CloudWatch alarms** for monitoring

---

## Security Considerations

### Access Control

- Use IAM roles for AWS access (not access keys)
- Implement row-level security via userId check
- NextAuth session validates user owns requested data

### Data Protection

- Passwords hashed with bcrypt (cost factor 10)
- Sensitive data can be encrypted at rest (AWS KMS)
- Enable DynamoDB encryption by default

### API Security

- Validate all inputs with Zod schemas
- Check userId matches session
- Use HTTPS only (enforced by Amplify)
- Implement rate limiting on API routes

---

## Backup and Recovery

### Development (DynamoDB Local)

- **Backup**: `npm run db:backup`
- **Restore**: Recreate table + manual import

### Production (AWS)

- **Point-in-Time Recovery**: Enable for 35-day history
- **On-Demand Backups**: Create before major changes
- **AWS Backup**: Automated backup policies
- **Export to S3**: For long-term archival

---

## Troubleshooting

### Common Issues

**"ResourceNotFoundException: Table not found"**

- Solution: Run `npm run db:setup`

**"ValidationException: Invalid key condition"**

- Solution: Check key names match exactly (case-sensitive)

**"Could not load credentials"**

- Solution: Verify .env.local has AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY

**"UnrecognizedClientException" with Local**

- Solution: Ensure DYNAMODB_ENDPOINT is set to http://localhost:8000

**Queries return empty results**

- Check: PK/SK values match exactly (including USER# prefix)
- Check: begins_with uses correct format
- Check: GSI name is correct (GSI1, GSI2, GSI3)

---

## Further Reading

- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Single-Table Design](https://aws.amazon.com/blogs/compute/creating-a-single-table-design-with-amazon-dynamodb/)
- [NoSQL Workbench](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/workbench.html) - Visual tool for modeling
- [Alex DeBrie's DynamoDB Book](https://www.dynamodbbook.com/) - Comprehensive guide
