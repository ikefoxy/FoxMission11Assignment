# FoxMission11And12Assignment

Combined Mission #11 + Mission #12 bookstore app using ASP.NET Core API + React + SQLite.

## What is included

- Book list with pagination, page size, and title sorting
- Category filtering (`All Categories` + DB categories)
- Pagination updates to match the selected category
- Shopping cart with add/update/remove
- Cart quantity, item subtotal, and cart total
- Cart saved in `sessionStorage` for the active browser session
- "Continue Shopping" button that returns to the same list page/filter state
- Cart summary shown on the main book list page
- Bootstrap grid layout (`row`, `col-lg-8`, `col-lg-4`)
- Extra Bootstrap feature: `sticky-top` for the cart summary card
- Extra Bootstrap feature: `progress` / `progress-bar` for cart fullness

## TA Bootstrap note

Two Bootstrap features added beyond basic table/buttons:

1. `sticky-top` on the cart summary card to keep it visible while scrolling
2. `progress` / `progress-bar` in the cart summary to show cart fullness visually

## Simple run steps

From the repo root:

```bash
npm run start:all
```

Then open:

`http://localhost:5039`

This URL serves both backend API and frontend build from the same localhost origin.

To stop:

```bash
kill $(lsof -ti :5039) 2>/dev/null || true
```

## API

- `GET /api/categories`
- `GET /api/books?pageSize=5&pageNum=1&sortOrder=asc|desc&category=all|<categoryName>`
