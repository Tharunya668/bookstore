package com.example.bookstore.controller;

import com.example.bookstore.model.Book;
import com.example.bookstore.service.BookService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/books")   // matches App.jsx: fetch("http://localhost:8080/books")
@CrossOrigin(origins = "*") // allows the React app (port 3000) to call this
public class BookController {

    private final BookService bookService;

    public BookController(BookService bookService) {
        this.bookService = bookService;
    }

    // GET /books  — returns all books as JSON
    @GetMapping
    public List<Book> getAllBooks() {
        return bookService.getAllBooks();
    }

    // GET /books/{id}
    @GetMapping("/{id}")
    public ResponseEntity<?> getBook(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(bookService.getBook(id));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    // POST /books  — add a new book
    @PostMapping
    public ResponseEntity<Book> addBook(@Valid @RequestBody Book book) {
        return ResponseEntity.status(HttpStatus.CREATED).body(bookService.addBook(book));
    }

    // POST /books/{id}/buy  — buy copies, broadcast live update
    @PostMapping("/{id}/buy")
    public ResponseEntity<?> buyBook(@PathVariable Long id,
                                     @RequestBody Map<String, Integer> body) {
        int quantity = body.getOrDefault("quantity", 1);
        try {
            return ResponseEntity.ok(bookService.buyBook(id, quantity));
        } catch (IllegalStateException e) {
            // 409 Conflict = not enough stock
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }
}
