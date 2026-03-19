import { useEffect, useMemo, useState } from 'react'

type Book = {
  bookID: number
  title: string
  author: string
  publisher: string
  isbn: string
  classification: string
  category: string
  pageCount: number
  price: number
}

type BooksResponse = {
  books: Book[]
  currentPage: number
  pageSize: number
  totalBooks: number
  totalPages: number
  sortOrder: 'asc' | 'desc'
}

// Default to same-origin so frontend and backend can run under one localhost URL.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export default function BookList() {
  // UI state for page controls and API results.
  const [books, setBooks] = useState<Book[]>([])
  const [pageNum, setPageNum] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [totalPages, setTotalPages] = useState(1)
  const [totalBooks, setTotalBooks] = useState(0)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    // Reload books whenever pagination or sort settings change.
    const loadBooks = async () => {
      setIsLoading(true)
      setError('')

      try {
        const response = await fetch(
          `${API_BASE}/api/books?pageSize=${pageSize}&pageNum=${pageNum}&sortOrder=${sortOrder}`,
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`)
        }

        const data: BooksResponse = await response.json()
        // Keep pagination metadata in sync with API response.
        setBooks(data.books)
        setTotalPages(data.totalPages)
        setTotalBooks(data.totalBooks)
      } catch {
        if (!controller.signal.aborted) {
          setError('Unable to load books right now. Make sure the backend is running.')
          setBooks([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadBooks()

    return () => controller.abort()
  }, [pageNum, pageSize, sortOrder])

  const pages = useMemo(() => {
    // Generate page number buttons from the API total page count.
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }, [totalPages])

  return (
    <>
      <div className="d-flex flex-wrap align-items-end gap-3 mb-3">
        <div>
          <label htmlFor="page-size" className="form-label mb-1">
            Results Per Page
          </label>
          <select
            id="page-size"
            className="form-select"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPageNum(1)
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
          </select>
        </div>

        <div>
          <label htmlFor="sort-order" className="form-label mb-1">
            Sort By Title
          </label>
          <select
            id="sort-order"
            className="form-select"
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value as 'asc' | 'desc')
              setPageNum(1)
            }}
          >
            <option value="asc">A to Z</option>
            <option value="desc">Z to A</option>
          </select>
        </div>

        <div className="ms-auto text-muted fw-semibold">Total Books: {totalBooks}</div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="table-responsive">
        <table className="table table-striped table-bordered align-middle bg-white">
          <thead className="table-dark">
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>Publisher</th>
              <th>ISBN</th>
              <th>Classification</th>
              <th>Category</th>
              <th>Pages</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-4">
                  Loading books...
                </td>
              </tr>
            ) : books.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-4">
                  No books found.
                </td>
              </tr>
            ) : (
              books.map((book) => (
                <tr key={book.bookID}>
                  <td>{book.title}</td>
                  <td>{book.author}</td>
                  <td>{book.publisher}</td>
                  <td>{book.isbn}</td>
                  <td>{book.classification}</td>
                  <td>{book.category}</td>
                  <td>{book.pageCount}</td>
                  <td>${book.price.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <nav aria-label="Book pages">
        <ul className="pagination flex-wrap">
          <li className={`page-item ${pageNum === 1 ? 'disabled' : ''}`}>
            <button
              className="page-link"
              onClick={() => setPageNum((prev) => Math.max(1, prev - 1))}
              aria-label="Previous"
            >
              &laquo;
            </button>
          </li>

          {pages.map((page) => (
            <li key={page} className={`page-item ${page === pageNum ? 'active' : ''}`}>
              <button className="page-link" onClick={() => setPageNum(page)}>
                {page}
              </button>
            </li>
          ))}

          <li className={`page-item ${pageNum === totalPages ? 'disabled' : ''}`}>
            <button
              className="page-link"
              onClick={() => setPageNum((prev) => Math.min(totalPages, prev + 1))}
              aria-label="Next"
            >
              &raquo;
            </button>
          </li>
        </ul>
      </nav>
    </>
  )
}
