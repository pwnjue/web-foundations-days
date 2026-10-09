

\# Library Books API Design



\## 1. List all books

\- Method: GET

\- Path: /api/books

\- Description: Retrieves all books.

\- Request body: None

\- Success status: 200 OK



\## 2. Get one book

\- Method: GET

\- Path: /api/books/{id}

\- Description: Retrieves a book by its ID.

\- Request body: None

\- Success status: 200 OK



\## 3. Create a book

\- Method: POST

\- Path: /api/books

\- Description: Adds a new book.

\- Example request body:

&#x20; ```json

&#x20; {

&#x20;   "title": "Introduction to Computing",

&#x20;   "author": "John Smith",

&#x20;   "isbn": "9781234567890"

&#x20; }

&#x20; ```

\- Success status: 201 Created



\## 4. Update a book

\- Method: PUT

\- Path: /api/books/{id}

\- Description: Updates an existing book.

\- Example request body:

&#x20; ```json

&#x20; {

&#x20;   "title": "Introduction to Computing",

&#x20;   "author": "John Smith",

&#x20;   "isbn": "9781234567890"

&#x20; }

&#x20; ```

\- Success status: 200 OK



\## 5. Delete a book

\- Method: DELETE

\- Path: /api/books/{id}

\- Description: Deletes a book by its ID.

\- Request body: None

\- Success status: 204 No Content



\## 6. List books by author

\- Method: GET

\- Path: /api/books?author=John%20Smith

\- Description: Retrieves books written by a specified author.

\- Request body: None

\- Success status: 200 OK



\## Error Responses



\### 400 Bad Request

\- Example: Creating a book without a required title.



\### 404 Not Found

\- Example: Requesting a book ID that does not exist.

