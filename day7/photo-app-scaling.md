# SnapShare Scaling Plan

## 1. Assumptions

SnapShare is a photo-sharing application where users upload photos and view a feed containing photos from people they follow.

The following assumptions are used:

- SnapShare has 10,000,000 registered users.
- 10% of registered users are active each day.
- Each active user uploads 1 photo per day.
- Each active user views 50 feed pages per day.
- Each photo has an average size of 2 MB.
- Each photo gets one thumbnail of approximately 50 KB.
- Traffic is spread across 86,400 seconds in a day for average calculations.
- Peak traffic is estimated at 5 times the average traffic.

### Daily Active Users

Daily active users:

10,000,000 × 10% = **1,000,000 daily active users**

---

## 2. Traffic and Storage Estimates

### Photo Uploads

Each of the 1,000,000 daily active users uploads one photo per day.

Uploads per day:

1,000,000 × 1 = **1,000,000 uploads per day**

Average uploads per second:

1,000,000 ÷ 86,400 ≈ **11.6 uploads per second**

Peak uploads per second:

11.6 × 5 ≈ **58 uploads per second**

### Feed Views

Each active user views 50 feed pages per day.

Feed views per day:

1,000,000 × 50 = **50,000,000 feed views per day**

Average feed views per second:

50,000,000 ÷ 86,400 ≈ **579 feed views per second**

Peak feed views per second:

579 × 5 ≈ **2,895 feed views per second**

### Photo Storage Per Year

Each uploaded photo requires approximately:

2 MB photo + 50 KB thumbnail ≈ **2.05 MB**

Storage required per day:

1,000,000 × 2.05 MB = **2,050,000 MB**, or approximately **2.05 TB per day**

Storage required per year:

2.05 TB × 365 = **748.25 TB per year**

Therefore, SnapShare would require approximately **748 TB of new photo and thumbnail storage per year**, before considering backups, replication and other overhead.

---

## 3. Read-Heavy or Write-Heavy?

SnapShare is a **read-heavy system**.

There are approximately 50 million feed views per day compared with only 1 million photo uploads per day. This means the system performs far more reads than writes.

The design should therefore optimise reading by using a cache, CDN and database read replica. Frequently requested information can be served without repeatedly querying the main database, while photos can be delivered from locations closer to users through the CDN.

---

## 4. Why Photos Should Not Be Stored in the Database

The actual photo files should not be stored directly inside the main relational database because they are large binary files and would make the database grow very quickly. This would make database backups, replication and queries more expensive and difficult to manage.

Instead, photos and thumbnails should be stored in **object storage**. The database should only store metadata such as the photo ID, user ID, upload time, caption and the location of the photo in object storage.

---

## 5. Architecture

```text
                         +-------------+
                         |    Users    |
                         +------+------+
                                |
                                v
                         +-------------+
                         |     CDN     |
                         +------+------+
                                |
                                v
                       +-----------------+
                       |  Load Balancer  |
                       +--------+--------+
                                |
                    +-----------+-----------+
                    |                       |
                    v                       v
             +-------------+         +-------------+
             | App Server  |         | App Server  |
             |      1      |         |      2      |
             +------+------+         +------+------+
                    |                       |
                    +-----------+-----------+
                                |
                +---------------+----------------+
                |               |                |
                v               v                v
           +---------+    +-----------+    +-------------+
           |  Cache  |    | Database  |    |   Object    |
           |         |    | Primary   |    |   Storage   |
           +---------+    +-----+-----+    +-------------+
                                |
                                v
                         +-------------+
                         |    Read     |
                         |   Replica   |
                         +-------------+

                    App Server
                         |
                         v
                    +---------+
                    |  Queue  |
                    +----+----+
                         |
                         v
                    +---------+
                    | Worker  |
                    +----+----+
                         |
                         v
                  +--------------+
                  | Create       |
                  | Thumbnail    |
                  +------+-------+
                         |
                         v
                  +--------------+
                  |Object Storage|
                  +--------------+
```

---

## 6. Purpose of Each Component

**CDN:** The CDN stores cached copies of photos and thumbnails close to users so that images load faster and the main servers receive fewer requests.

**Load Balancer:** The load balancer distributes incoming requests across multiple app servers so that one server does not become overloaded.

**App Servers:** The app servers handle application logic such as authentication, uploads, feed requests and communication with other services.

**Cache:** The cache stores frequently requested data, such as feed information, so that the application does not need to query the database for every request.

**Primary Database:** The primary database stores structured information such as users, follows, photo metadata and other application records.

**Read Replica:** The read replica handles many database read requests and reduces the workload on the primary database.

**Object Storage:** Object storage holds the actual photo and thumbnail files instead of placing large binary files inside the database.

**Queue:** The queue stores background jobs such as thumbnail-generation tasks so that photo uploads do not have to wait for all processing to finish.

**Worker:** The worker takes thumbnail jobs from the queue, creates the thumbnails and saves them to object storage.

---

## 7. Photo Upload Flow

1. A user selects a photo and starts an upload in the SnapShare application.
2. The request reaches the load balancer, which sends it to an available app server.
3. The app server authenticates the user and validates the upload.
4. The original photo is saved in object storage.
5. The app server saves the photo metadata, such as the user ID, photo location and upload time, in the primary database.
6. The app server places a thumbnail-generation job onto the queue.
7. The application can respond to the user without waiting for thumbnail generation to finish.
8. A worker takes the thumbnail job from the queue.
9. The worker retrieves the original photo from object storage and creates a smaller thumbnail.
10. The worker stores the new thumbnail in object storage and updates the relevant metadata if necessary.
11. When other users view their feeds, the application retrieves feed information using the cache and database/read replica.
12. Photos and thumbnails are delivered to users through the CDN whenever possible.

---

## 8. Trade-offs

### Trade-off 1: Cache Speed vs Stale Data

Using a cache makes feed requests much faster and reduces database load. However, cached information can become outdated. For example, a newly uploaded or deleted photo may not immediately be reflected in a cached feed. The system must balance fast responses with how quickly cached data is refreshed.

### Trade-off 2: Asynchronous Thumbnail Processing vs Immediate Availability

Using a queue and worker makes uploads faster because the user does not have to wait while a thumbnail is generated. However, there may be a short delay before the thumbnail becomes available if the queue contains many jobs or a worker is busy.

### Trade-off 3: Read Replicas vs Consistency

A read replica allows SnapShare to handle more read traffic and reduces pressure on the primary database. However, replication can have a small delay, meaning a user may briefly read older data from the replica immediately after information has been changed in the primary database.
