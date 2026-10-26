# TicketHub — Ticketing System Design

## 1. Requirements

TicketHub is a website for buying tickets to concerts and other events. The system must support browsing events, viewing available seats, temporarily holding seats, paying for tickets, and viewing purchased tickets.

### Functional Requirements

The system should allow users to:

- Create an account and log in.
- Browse upcoming concerts and events.
- Search and filter events by name, date, location, and category.
- View event details, including venue, date, time, price, and available seats.
- View a seat map and the current availability of seats.
- Select and temporarily hold available seats.
- Pay for held tickets using a supported payment method.
- Receive a confirmation after successful payment.
- View their purchased tickets.
- View order and payment status.
- Release seats automatically when a hold expires.

### Non-Functional Requirements

#### Speed

- Event pages should load quickly during normal traffic.
- Seat availability should respond within a few seconds.
- The system should remain responsive when a popular concert goes on sale.
- Frequently requested event information should be cached to reduce database load.

#### Correctness

- A seat must never be sold to two customers.
- Payment and ticket status must be accurately recorded.
- The database must be the source of truth for seat ownership.
- Seat holds must expire automatically after a short period, such as 10 minutes.
- Failed or cancelled payments must not permanently reserve seats.

#### Fairness

- Customers should be treated fairly when demand is higher than available seats.
- A virtual waiting queue should be used for extremely popular events.
- Requests should be rate-limited to prevent one customer or bot from overwhelming the system.
- Customers should receive a clear position or waiting status when a queue is used.
- Seats should only be held for a limited period so that customers cannot block them indefinitely.

#### Availability and Reliability

- The system should continue operating if one application server fails.
- Multiple application servers should be used so traffic can be distributed.
- Important data should be backed up.
- Monitoring should detect failures, slow responses, and database problems.

---

## 2. Traffic Estimates

TicketHub has **2 million registered users**.

### Normal Day

There are 50,000 visitors per day and each visitor views approximately 10 pages.

**Daily page views:**

50,000 × 10 = **500,000 page views per day**

There are 86,400 seconds in a day.

**Average page requests per second:**

500,000 ÷ 86,400 ≈ **5.8 requests per second**

A real system needs to handle peaks rather than only the daily average. If normal peak traffic is estimated at approximately five times the average:

5.8 × 5 ≈ **29 requests per second**

There are also 5,000 tickets sold per normal day:

5,000 ÷ 86,400 ≈ **0.06 ticket orders per second**

This shows that normal traffic is mainly read traffic such as browsing events and viewing pages.

### Big Sale

A popular concert has 20,000 seats, but **200,000 people try to buy them within the first 10 minutes**.

10 minutes = 600 seconds.

**Purchase attempts per second:**

200,000 ÷ 600 ≈ **333 purchase attempts per second**

Only 20,000 seats are available:

20,000 ÷ 600 ≈ **33 seats per second** if the seats were sold evenly.

### Comparison

| Metric                |          Normal Day |                       Big Sale |
| --------------------- | ------------------: | -----------------------------: |
| Visitors/attempts     | 50,000 visitors/day |          200,000 buyers/10 min |
| Page views            |         500,000/day | Very high concentrated traffic |
| Average page requests |            ~5.8/sec |                    Much higher |
| Purchase attempts     |   ~0.06/sec average |                       ~333/sec |
| Available seats       |              Varies |                         20,000 |
| Main challenge        |     Normal browsing |      Massive concurrent demand |

The big sale is therefore very different from normal traffic. The system must handle hundreds of purchase attempts every second while protecting the database and preventing the same seat from being sold twice.

---

## 3. API Design

TicketHub can provide a REST API.

| Method | Endpoint                      | Purpose                            |
| ------ | ----------------------------- | ---------------------------------- |
| GET    | `/api/events`                 | Browse and search events           |
| GET    | `/api/events/{eventId}`       | View details of one event          |
| GET    | `/api/events/{eventId}/seats` | View the event's seat availability |
| POST   | `/api/events/{eventId}/holds` | Hold selected seats temporarily    |
| POST   | `/api/orders/{orderId}/pay`   | Pay for a held order               |
| GET    | `/api/tickets`                | View the user's purchased tickets  |
| GET    | `/api/orders/{orderId}`       | View an order and its status       |

### Example: Hold Seats

`POST /api/events/25/holds`

Request:

```json
{
  "seat_ids": [101, 102]
}
```

The server checks that the seats are available and creates a temporary hold.

### Example: Pay

`POST /api/orders/5001/pay`

The payment service processes the payment. If successful, the order becomes `PAID` and the seats become `BOOKED`.

---

## 4. Data Model

TicketHub uses a relational database.

### Users

| Column        | Description           |
| ------------- | --------------------- |
| user_id       | Primary key           |
| name          | Customer name         |
| email         | Customer email        |
| password_hash | Hashed password       |
| created_at    | Account creation time |

### Events

| Column      | Description       |
| ----------- | ----------------- |
| event_id    | Primary key       |
| name        | Event name        |
| venue       | Event venue       |
| event_date  | Date and time     |
| description | Event description |

### Seats

| Column          | Description                        |
| --------------- | ---------------------------------- |
| seat_id         | Primary key                        |
| event_id        | Foreign key to events              |
| seat_number     | Seat identifier                    |
| price           | Ticket price                       |
| status          | AVAILABLE, HELD, or BOOKED         |
| hold_expires_at | Time when a temporary hold expires |

A database constraint should ensure that a seat number is unique within an event:

`UNIQUE(event_id, seat_number)`

### Orders

| Column       | Description                          |
| ------------ | ------------------------------------ |
| order_id     | Primary key                          |
| user_id      | Foreign key to users                 |
| event_id     | Foreign key to events                |
| status       | PENDING, PAID, CANCELLED, or EXPIRED |
| total_amount | Total order value                    |
| created_at   | Order creation time                  |

### Order Items

Because one order can contain several seats, an additional `order_items` table is useful.

| Column        | Description             |
| ------------- | ----------------------- |
| order_item_id | Primary key             |
| order_id      | Foreign key to orders   |
| seat_id       | Foreign key to seats    |
| price         | Price paid for the seat |

### Relationships

```text
Users
  |
  | 1-to-many
  v
Orders
  |
  | 1-to-many
  v
Order Items
  |
  | many-to-1
  v
Seats
  |
  | many-to-1
  v
Events
```

One user can have many orders.  
One event has many seats.  
One order can contain multiple seats.  
Each order item refers to a specific seat.

---

## 5. Preventing Double-Booking

Preventing double-booking is one of the most important parts of TicketHub.

The database should be the final source of truth for seat availability.

When a customer tries to hold a seat, the application starts a database transaction.

For example:

```text
BEGIN TRANSACTION

1. Lock the selected seat rows.
2. Check whether each seat is AVAILABLE
   or whether an old hold has expired.
3. Create the order.
4. Create the order items.
5. Change the seat status to HELD.
6. Set the hold expiration time.

COMMIT
```

The database can use row-level locking so that two customers cannot modify the same seat at exactly the same time.

For example, the application can use a database operation equivalent to:

```sql
SELECT *
FROM seats
WHERE seat_id = 101
FOR UPDATE;
```

The first transaction locks the seat. A second transaction trying to book the same seat must wait until the first transaction finishes.

Database constraints provide another layer of protection. The system can use a unique constraint so that the same seat cannot be assigned to conflicting reservations for the same event.

If the hold expires before payment is completed, the seat becomes `AVAILABLE` again.

The payment process should not keep a database transaction open while waiting for an external payment provider. Instead, the seat is held first, payment happens, and the order is then updated to `PAID` after successful payment.

This combination of **transactions, row locking, and database constraints** prevents two customers from successfully purchasing the same seat.

---

## 6. Architecture

```text
                         INTERNET
                            |
                            v
                    +---------------+
                    |   CDN / WAF   |
                    +---------------+
                            |
                            v
                    +---------------+
                    | Load Balancer |
                    +---------------+
                            |
              +-------------+-------------+
              |             |             |
              v             v             v
          +-------+     +-------+     +-------+
          | App 1 |     | App 2 |     | App 3 |
          +-------+     +-------+     +-------+
              |             |             |
              +-------------+-------------+
                            |
                +-----------+-----------+
                |                       |
                v                       v
          +-----------+            +-----------+
          |   Redis   |            |   Queue   |
          |   Cache   |            |           |
          +-----------+            +-----------+
                |                       |
                |                       v
                |                 +-----------+
                |                 |  Workers  |
                |                 +-----------+
                |
                v
          +-------------------+
          | Primary Database  |
          |                   |
          | Users             |
          | Events            |
          | Seats             |
          | Orders            |
          | Order Items       |
          +-------------------+
                    |
                    v
             +-------------+
             | Read Replica|
             +-------------+

                    |
                    v
             +-------------+
             |   Payment   |
             |   Provider  |
             +-------------+
```

### Components

**CDN/WAF:**  
The CDN serves static content quickly. The web application firewall helps block malicious traffic and common attacks.

**Load Balancer:**  
Distributes requests across multiple application servers. If one server fails, traffic can be sent to another server.

**Application Servers:**  
Handle the business logic and API requests. They are stateless so more servers can be added during a big sale.

**Redis Cache:**  
Stores frequently requested information such as event details. This reduces repeated reads from the database. Redis must not be treated as the final authority for whether a seat has been purchased.

**Queue:**  
During a big sale, a virtual waiting queue controls how many customers enter the purchasing system at once. It prevents 200,000 customers from hitting the database simultaneously.

**Workers:**  
Background workers process tasks such as sending confirmation messages, releasing expired holds, and other non-critical jobs.

**Primary Database:**  
Stores authoritative information about users, events, seats, and orders. Seat booking transactions occur here.

**Read Replica:**  
Handles read-heavy queries where slightly delayed data is acceptable, such as some event browsing operations. Booking decisions must use the primary database.

**Payment Provider:**  
Processes customer payments. The order is marked as paid only after successful payment confirmation.

### Surviving the Big Sale

When 200,000 customers arrive at once, the virtual queue prevents all customers from reaching the booking database simultaneously.

The CDN handles static content, Redis handles common read requests, and multiple application servers handle API traffic. The load balancer spreads traffic across the servers.

The database protects seat inventory using transactions and locks. This ensures that high traffic does not cause overselling.

Rate limiting also prevents individual users or automated bots from sending excessive requests.

---

## 7. Trade-Offs

### Trade-Off 1: Database Locking vs Performance

Strong database transactions and row locks provide correctness and prevent double-booking. However, locking can reduce throughput when many customers try to buy the same seats at once.

TicketHub chooses correctness over slightly higher throughput because selling the same seat twice would be a serious business problem.

### Trade-Off 2: Caching vs Freshness

Caching event and seat information improves speed and reduces database load. However, cached information can become stale.

TicketHub therefore uses caching mainly for read-heavy information. The primary database is always checked before a seat is held or purchased.

### Trade-Off 3: Virtual Queue vs Immediate Access

A virtual queue protects the system and provides a fairer process during extremely popular sales. However, customers have to wait instead of immediately accessing the booking system.

TicketHub accepts this trade-off because keeping the system stable and giving customers a fair chance is more important than allowing everyone to enter at exactly the same time.

---

## Conclusion

TicketHub is designed to provide fast and reliable ticket sales under both normal and extreme traffic. The most important design decision is protecting seat inventory through database transactions, row-level locking, and constraints. During a big sale, a virtual queue, load balancing, caching, rate limiting, and multiple application servers reduce pressure on the database while maintaining fairness and correctness.
