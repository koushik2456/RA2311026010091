# Stage 1

## REST API Design — Campus Notification Platform

### Core Actions Identified
1. Fetch all notifications for a logged-in student
2. Fetch unread notifications count
3. Mark a single notification as read
4. Mark all notifications as read
5. Filter notifications by type (Placement / Event / Result)
6. Real-time delivery of new notifications

---

### Endpoints

#### GET /api/notifications
Fetch all notifications for the authenticated student.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Response 200:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "Placement",
      "message": "Google hiring drive on 10th May",
      "isRead": false,
      "createdAt": "2026-04-22T17:51:30Z"
    }
  ],
  "total": 1,
  "unread": 1
}
```

---

#### GET /api/notifications/unread-count
Returns count of unread notifications.

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{ "unreadCount": 5 }
```

---

#### PATCH /api/notifications/:id/read
Mark a specific notification as read.

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{ "id": "uuid", "isRead": true }
```

---

#### PATCH /api/notifications/read-all
Mark all notifications for the student as read.

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{ "message": "All notifications marked as read", "updatedCount": 5 }
```

---

#### GET /api/notifications?type=Placement
Filter by type using query parameter.

**Query Params:** `type` = `Placement` | `Event` | `Result`

---

### Real-Time Notification Mechanism

**Choice: WebSockets (Socket.IO)**

Rationale: WebSockets maintain a persistent bidirectional connection, enabling the server to push new notifications instantly without client polling. Compared to SSE (server-sent events), WebSocket supports bidirectional communication and is better supported across load balancers with sticky sessions.

**Flow:**
1. Student authenticates → connects to `ws://server/notifications`
2. Server keeps a map of `studentID → socket`
3. When a new notification is inserted, server emits `new_notification` event to the student's socket
4. Client updates the notification badge without any page refresh

---

# Stage 2

## Persistent Storage Design

### Recommended Database: PostgreSQL

**Rationale:**
- Notifications have a clear relational structure (student → notifications)
- ACID compliance ensures no notification is lost during a DB write failure
- Rich indexing support (composite indexes, partial indexes) handles the read-heavy query pattern efficiently
- `ENUM` types natively supported (Placement, Event, Result)
- Better suited than NoSQL here because notification data is structured and queries are predictable

---

### Schema

```sql
CREATE TYPE notification_type AS ENUM ('Placement', 'Event', 'Result');

CREATE TABLE students (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id        INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    type              notification_type NOT NULL,
    message           TEXT NOT NULL,
    is_read           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for the most common query pattern
CREATE INDEX idx_notifications_student_unread
    ON notifications (student_id, is_read, created_at DESC);

CREATE INDEX idx_notifications_type
    ON notifications (type, created_at DESC);
```

---

### Queries for REST APIs (from Stage 1)

```sql
-- GET /api/notifications (all for student)
SELECT id, type, message, is_read, created_at
FROM notifications
WHERE student_id = $1
ORDER BY created_at DESC;

-- GET /api/notifications/unread-count
SELECT COUNT(*) AS unread_count
FROM notifications
WHERE student_id = $1 AND is_read = FALSE;

-- PATCH /api/notifications/:id/read
UPDATE notifications
SET is_read = TRUE
WHERE id = $1 AND student_id = $2
RETURNING id, is_read;

-- PATCH /api/notifications/read-all
UPDATE notifications
SET is_read = TRUE
WHERE student_id = $1 AND is_read = FALSE;

-- GET /api/notifications?type=Placement
SELECT id, type, message, is_read, created_at
FROM notifications
WHERE student_id = $1 AND type = $2
ORDER BY created_at DESC;
```

---

### Scaling Problems as Data Grows

| Problem | Cause | Solution |
|---|---|---|
| Slow reads | Full table scans without indexes | Composite index on (student_id, is_read, created_at DESC) |
| Table bloat | Millions of old read notifications never deleted | Archive/partition by month; delete read notifications older than 90 days |
| Write bottleneck | Bulk inserts during "Notify All" | Use connection pooling (PgBouncer); async queue (Redis + BullMQ) |
| Index bloat | Frequent updates to is_read flip index entries | Partial index: `WHERE is_read = FALSE` reduces index size |

---

# Stage 3

## Query Analysis and Optimisation

### Original Query
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

### Is the Query Accurate?
Functionally yes — it fetches unread notifications for student 1042 ordered newest first. However:
- `SELECT *` retrieves all columns including large `message` TEXT fields — unnecessary if the API only needs id, type, message, created_at
- Should be `SELECT id, type, message, created_at` to reduce I/O

### Why Is It Slow?
With 50,000 students and 5,000,000 notifications and no index on `(studentID, isRead)`, the database performs a **sequential scan** of all 5M rows to find the ~100 rows for student 1042. Cost: O(N).

### What to Change — Composite Index

```sql
CREATE INDEX idx_notifications_student_unread
ON notifications (student_id, is_read, created_at DESC);
```

**Computation cost change:** From O(N) full scan → O(log N + k) index seek where k = result rows. At 5M rows, this reduces query time from ~800ms to ~2ms.

---

### Is "Index Every Column" Good Advice?

**No.** Indexing every column is harmful:
- Each index adds write overhead: every INSERT/UPDATE must update all indexes
- Disk space doubles or triples
- The query planner may pick suboptimal indexes
- Only index columns that appear in WHERE, JOIN, or ORDER BY clauses of real queries

**Correct approach:** Index only `(student_id, is_read, created_at DESC)` for this workload.

---

### Query: Placement Notifications in Last 7 Days

```sql
SELECT id, type, message, created_at
FROM notifications
WHERE type = 'Placement'
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

**Supporting index:**
```sql
CREATE INDEX idx_notifications_type_date
ON notifications (type, created_at DESC);
```

---

# Stage 4

## Caching Strategy for Notification Fetching

### Problem
Notifications are fetched on every page load for every student → DB overwhelmed at 50,000 students.

---

### Solution 1: Redis Cache with TTL

**Strategy:** Cache each student's notification list in Redis with a 60-second TTL.

```
Cache Key: notifications:{student_id}
TTL: 60 seconds
Invalidation: On new notification insert or is_read update for that student
```

**Tradeoffs:**
- ✅ Eliminates DB hits on repeated page loads
- ✅ O(1) Redis lookup vs O(log N) DB query
- ❌ Stale data possible within the 60s window
- ❌ Cache invalidation complexity when notifications are marked read

---

### Solution 2: Pagination (Offset/Cursor)

**Strategy:** Never load all notifications; load 20 at a time via cursor pagination.

```sql
SELECT id, type, message, is_read, created_at
FROM notifications
WHERE student_id = $1 AND created_at < $cursor
ORDER BY created_at DESC
LIMIT 20;
```

**Tradeoffs:**
- ✅ Drastically reduces data transfer per request
- ✅ No stale data problem
- ❌ Client must implement infinite scroll / load more

---

### Solution 3: Unread Count Cache

**Strategy:** Cache only the unread count (the cheapest query), invalidate on read/new notification.

**Tradeoffs:**
- ✅ Cheapest to implement and maintain
- ✅ Badge count is always accurate after invalidation
- ❌ Full list still hits DB

---

### Recommended Combination
1. Redis cache for the full notification list (TTL 60s, invalidate on write)
2. Cursor pagination to limit response size to 20 items
3. WebSocket push to instantly update badge without a fresh API call

---

# Stage 5

## Notify All — Redesign

### Original Pseudocode Problems

```
function notify_all(student_ids: array, message: string):
    for student_id in student_ids:
        send_email(student_id, message)   # synchronous, blocking
        save_to_db(student_id, message)   # if email fails, this doesn't run
        push_to_app(student_id, message)  # tightly coupled
```

**Shortcomings:**
1. **Sequential loop over 50,000 students** — takes hours; blocks the server
2. **No error handling** — if `send_email` fails at student 200, all subsequent students are skipped
3. **No retry mechanism** — failed emails are silently lost
4. **DB save and email are coupled** — if email API is down, DB is never updated
5. **Synchronous I/O** — each network call waits for the previous to finish

---

### When send_email Fails Midway
Without retry or a queue, 49,800 students never get notified. Logs show the failure but there is no recovery.

---

### Redesigned Approach: Message Queue (BullMQ + Redis)

**Design principle:** Save to DB first (source of truth), then enqueue email and push as independent async jobs with retry.

```
function notify_all(student_ids, message):
    # 1. Bulk insert all notifications into DB atomically
    db.bulk_insert(student_ids, message)

    # 2. Enqueue jobs for email + push (non-blocking)
    for student_id in student_ids in batches of 500:
        email_queue.add({ student_id, message }, { attempts: 3, backoff: 'exponential' })
        push_queue.add({ student_id, message }, { attempts: 3 })

    return { status: "queued", total: len(student_ids) }

# Workers process independently
email_worker.process(job):
    try:
        send_email(job.student_id, job.message)
    except:
        raise RetryableError()   # BullMQ retries up to 3 times

push_worker.process(job):
    socket = socket_map.get(job.student_id)
    if socket:
        socket.emit('new_notification', job.message)
```

---

### Should DB Save and Email Happen Together?

**No.** They should be decoupled:
- DB save is the **source of truth** — it must always succeed first
- Email delivery is **best-effort** — the notification exists even if email fails
- Coupling them means a transient email API failure rolls back the notification record, which is incorrect behaviour

**Revised Pseudocode:**
```
function notify_all(student_ids, message):
    # Step 1: Persist (synchronous, must succeed)
    db.bulk_insert(notifications: student_ids × message)

    # Step 2: Enqueue async delivery (fire-and-forget with retry)
    for batch in chunks(student_ids, 500):
        email_queue.addBulk(batch)
        push_queue.addBulk(batch)
```

---

# Stage 6

## Priority Inbox — Top N Notifications

### Approach

**Priority Score Formula:**
```
weight = { Placement: 3, Result: 2, Event: 1 }
recency_score = 1 / (seconds_since_notification + 1)
priority = weight[type] * 1000 + recency_score
```

Higher priority score = shown first.

### Maintaining Top-N Efficiently as New Notifications Arrive

Use a **Min-Heap of size N**:
- Heap always holds the top-N highest priority items
- On new notification: if its priority > heap.min(), pop the min and push the new one
- O(log N) per insertion regardless of total notification count
- No need to re-sort the entire list

### Implementation (Python — priority_inbox.py)

See `notification_app_be/src/services/priorityInbox.py`

---