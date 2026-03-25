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

type CartItem = Book & {
  quantity: number
}

type BooksResponse = {
  books: Book[]
  currentPage: number
  pageSize: number
  totalBooks: number
  totalPages: number
  sortOrder: 'asc' | 'desc'
  selectedCategory: string
}

// Default to same-origin so frontend and backend can run under one localhost URL.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''
const CART_STORAGE_KEY = 'bookstore-cart'

export default function BookList() {
  // UI state for page controls, filters, and API results.
  const [books, setBooks] = useState<Book[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [pageNum, setPageNum] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [totalPages, setTotalPages] = useState(1)
  const [totalBooks, setTotalBooks] = useState(0)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [isViewingCart, setIsViewingCart] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [cart, setCart] = useState<CartItem[]>(() => {
    // Keep the cart for the duration of the browser session.
    let savedCart: string | null = null
    try {
      savedCart = sessionStorage.getItem(CART_STORAGE_KEY)
    } catch {
      // Keep working even when storage is blocked by browser settings.
      return []
    }

    if (!savedCart) {
      return []
    }

    try {
      return JSON.parse(savedCart) as CartItem[]
    } catch {
      return []
    }
  })

  useEffect(() => {
    const controller = new AbortController()

    // Load category options once to build the category filter dropdown.
    const loadCategories = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/categories`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`)
        }

        const data: string[] = await response.json()
        setCategories(data)
      } catch {
        if (!controller.signal.aborted) {
          setCategories([])
        }
      }
    }

    void loadCategories()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    // Reload books whenever pagination, sorting, or category changes.
    const loadBooks = async () => {
      setIsLoading(true)
      setError('')

      try {
        const response = await fetch(
          `${API_BASE}/api/books?pageSize=${pageSize}&pageNum=${pageNum}&sortOrder=${sortOrder}&category=${encodeURIComponent(selectedCategory)}`,
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
        setPageNum(Math.min(Math.max(1, data.currentPage), Math.max(1, data.totalPages)))
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
  }, [pageNum, pageSize, sortOrder, selectedCategory])

  useEffect(() => {
    try {
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
    } catch {
      // Ignore storage write errors so cart actions still work in memory.
    }
  }, [cart])

  // Add clicked books to cart and increase quantity for duplicates.
  const addToCart = (book: Book) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.bookID === book.bookID)
      if (existing) {
        return prev.map((item) =>
          item.bookID === book.bookID ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }

      return [...prev, { ...book, quantity: 1 }]
    })
    setStatusMessage(`Added "${book.title}" to cart.`)
  }

  const updateQuantity = (bookID: number, quantity: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.bookID === bookID ? { ...item, quantity: Math.max(1, quantity) } : item))
        .filter((item) => item.quantity > 0),
    )
  }

  const removeFromCart = (bookID: number) => {
    const bookTitle = cart.find((item) => item.bookID === bookID)?.title ?? 'Book'
    setCart((prev) => prev.filter((item) => item.bookID !== bookID))
    setStatusMessage(`Removed "${bookTitle}" from cart.`)
  }

  const cartQuantity = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  )
  const cartSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  )

  const pages = useMemo(() => {
    // Generate page number buttons from the API total page count.
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }, [totalPages])

  return (
    <div className="row g-4">
      <div className="col-lg-8">
        <div className="d-flex flex-wrap align-items-end gap-3 mb-3">
          <div>
            <label htmlFor="category" className="form-label mb-1">
              Category
            </label>
            <select
              id="category"
              className="form-select"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setPageNum(1)
              }}
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

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

          <div className="ms-auto d-flex align-items-center gap-2">
            <span className="badge text-bg-primary fs-6">{cartQuantity} in cart</span>
            <button className="btn btn-outline-primary" onClick={() => setIsViewingCart(true)}>
              View Cart
            </button>
          </div>

          <div className="w-100 text-muted fw-semibold">
            Total Books in View: {totalBooks}
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        <p className="visually-hidden" role="status" aria-live="polite">
          {statusMessage}
        </p>

        {!isViewingCart && (
          <>
            <div className="table-responsive">
              <table className="table table-striped table-hover table-bordered align-middle bg-white book-table">
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
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-4">
                        Loading books...
                      </td>
                    </tr>
                  ) : books.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-4">
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
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-success book-action-btn"
                            onClick={() => addToCart(book)}
                            aria-label={`Add ${book.title} to cart`}
                          >
                            Add to Cart
                          </button>
                        </td>
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
        )}

        {isViewingCart && (
          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="h4 mb-3">Shopping Cart</h2>
              {cart.length === 0 ? (
                <p className="text-muted mb-0">Your cart is empty.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr>
                        <th>Book</th>
                        <th>Price</th>
                        <th style={{ width: '140px' }}>Quantity</th>
                        <th>Subtotal</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item) => (
                        <tr key={item.bookID}>
                          <td>{item.title}</td>
                          <td>${item.price.toFixed(2)}</td>
                          <td>
                            <input
                              className="form-control"
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) =>
                                updateQuantity(item.bookID, Number.parseInt(e.target.value, 10) || 1)
                              }
                            />
                          </td>
                          <td>${(item.price * item.quantity).toFixed(2)}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => removeFromCart(item.bookID)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th colSpan={3}>Total</th>
                        <th>${cartSubtotal.toFixed(2)}</th>
                        <th></th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              <button className="btn btn-primary" onClick={() => setIsViewingCart(false)}>
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="col-lg-4">
        {/* Bootstrap "sticky-top" keeps the cart summary visible while scrolling. */}
        <div className="card shadow-sm sticky-top" style={{ top: '1rem' }}>
          <div className="card-body">
            <h2 className="h5">Cart Summary</h2>
            <p className="mb-1">
              Items: <strong>{cartQuantity}</strong>
            </p>
            <p className="mb-3">
              Total: <strong>${cartSubtotal.toFixed(2)}</strong>
            </p>
            <div className="progress mb-3" role="progressbar" aria-label="Cart fullness">
              <div
                className="progress-bar"
                style={{ width: `${Math.min(100, cartQuantity * 10)}%` }}
              ></div>
            </div>
            <button
              className="btn btn-primary w-100"
              onClick={() => setIsViewingCart(true)}
            >
              Open Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
