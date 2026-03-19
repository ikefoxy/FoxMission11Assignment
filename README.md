# FoxMission11Assignment

Mission #11 bookstore app using ASP.NET Core API + React + SQLite.
Completed frontend UI and completed backend API are included in this submission.

## Completed

- Connected to provided `Bookstore.sqlite` database
- `Book` model matches all `Books` table columns
- Lists required fields (title, author, publisher, ISBN, classification, category, pages, price)
- Pagination (default 5 per page)
- User can change results per page
- User can sort by title (A-Z / Z-A)
- Book list component included in `App.tsx`
- Styled with Bootstrap

## Run

From repo root:

```bash
npm run start:all
```

Open `http://localhost:5039`.

Stop the server:

```bash
kill $(lsof -ti :5039) 2>/dev/null || true
```

## API

`GET /api/books?pageSize=5&pageNum=1&sortOrder=asc|desc`

Params: `pageSize`, `pageNum`, `sortOrder`.
