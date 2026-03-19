using Microsoft.Data.Sqlite;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

// Absolute path to the provided SQLite file in the repo root.
var databasePath = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", "Bookstore.sqlite"));
// React production build output that ASP.NET will serve as static files.
var frontendDistPath = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", "frontend", "dist"));

app.MapGet("/api/books", (int? pageSize, int? pageNum, string? sortOrder) =>
{
    if (!File.Exists(databasePath))
    {
        return Results.Problem($"Database file not found at {databasePath}", statusCode: 500);
    }

    var safePageSize = Math.Clamp(pageSize ?? 5, 1, 100);
    var safePageNum = Math.Max(pageNum ?? 1, 1);
    // Only allow ASC/DESC so the ORDER BY stays safe and predictable.
    var normalizedSortOrder = string.Equals(sortOrder, "desc", StringComparison.OrdinalIgnoreCase) ? "DESC" : "ASC";

    var books = new List<Book>();
    var totalBooks = 0;

    using var connection = new SqliteConnection($"Data Source={databasePath}");
    connection.Open();

    using (var countCommand = connection.CreateCommand())
    {
        countCommand.CommandText = "SELECT COUNT(*) FROM Books";
        totalBooks = Convert.ToInt32(countCommand.ExecuteScalar());
    }

    var offset = (safePageNum - 1) * safePageSize;

    using (var command = connection.CreateCommand())
    {
        command.CommandText = $@"
            SELECT BookID, Title, Author, Publisher, ISBN, Classification, Category, PageCount, Price
            FROM Books
            ORDER BY Title COLLATE NOCASE {normalizedSortOrder}
            LIMIT @pageSize OFFSET @offset";

        command.Parameters.AddWithValue("@pageSize", safePageSize);
        command.Parameters.AddWithValue("@offset", offset);

        using var reader = command.ExecuteReader();

        while (reader.Read())
        {
            books.Add(new Book
            {
                BookID = reader.GetInt32(0),
                Title = reader.GetString(1),
                Author = reader.GetString(2),
                Publisher = reader.GetString(3),
                ISBN = reader.GetString(4),
                Classification = reader.GetString(5),
                Category = reader.GetString(6),
                PageCount = reader.GetInt32(7),
                Price = reader.GetDouble(8)
            });
        }
    }

    var totalPages = totalBooks == 0 ? 1 : (int)Math.Ceiling(totalBooks / (double)safePageSize);

    return Results.Ok(new PagedBooksResponse
    {
        Books = books,
        CurrentPage = safePageNum,
        PageSize = safePageSize,
        TotalBooks = totalBooks,
        TotalPages = totalPages,
        SortOrder = normalizedSortOrder.ToLowerInvariant()
    });
});

if (Directory.Exists(frontendDistPath))
{
    var frontendFileProvider = new PhysicalFileProvider(frontendDistPath);

    // Serve index.html and static assets from the built React app.
    app.UseDefaultFiles(new DefaultFilesOptions
    {
        FileProvider = frontendFileProvider
    });

    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = frontendFileProvider
    });

    // Let client-side routes resolve to React's index.html.
    app.MapFallback(async context =>
    {
        context.Response.ContentType = "text/html";
        await context.Response.SendFileAsync(Path.Combine(frontendDistPath, "index.html"));
    });
}
else
{
    app.MapGet("/", () =>
        Results.Text("Frontend build not found. Run: cd frontend && npm run build", "text/plain"));
}

app.Run();

public sealed class Book
{
    // Properties map to columns in the Books table.
    public int BookID { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public string Publisher { get; set; } = string.Empty;
    public string ISBN { get; set; } = string.Empty;
    public string Classification { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int PageCount { get; set; }
    public double Price { get; set; }
}

public sealed class PagedBooksResponse
{
    public List<Book> Books { get; set; } = [];
    public int CurrentPage { get; set; }
    public int PageSize { get; set; }
    public int TotalBooks { get; set; }
    public int TotalPages { get; set; }
    public string SortOrder { get; set; } = "asc";
}
