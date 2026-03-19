import './App.css'
import BookList from './components/BookList'

function App() {
  return (
    <div className="container py-4">
      {/* Assignment asks to add the listing component into App.tsx */}
      <h1 className="mb-3">Bookstore Catalog</h1>
      <BookList />
    </div>
  )
}

export default App
