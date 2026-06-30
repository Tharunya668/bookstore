package com.example.bookstore.service;

import com.example.bookstore.model.Book;
import com.example.bookstore.repository.BookRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@Service
public class BookService {

    private final BookRepository bookRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public BookService(BookRepository bookRepository, SimpMessagingTemplate messagingTemplate) {
        this.bookRepository = bookRepository;
        this.messagingTemplate = messagingTemplate;
    }

    public List<Book> getAllBooks() {
        return bookRepository.findAll();
    }

    public Book getBook(Long id) {
        return bookRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Book not found: " + id));
    }

    public Book addBook(Book book) {
        return bookRepository.save(book);
    }

    /**
     * Buys `quantity` copies — safe for multiple users at the same time.
     * Step 1: lock the row in the database (no other request can touch it)
     * Step 2: check stock is enough
     * Step 3: decrement and save
     * Step 4: push the new stock to EVERY open browser tab via WebSocket
     */
    @Transactional
    public Book buyBook(Long bookId, int quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be at least 1");
        }

        Book book = bookRepository.findByIdForUpdate(bookId)
                .orElseThrow(() -> new NoSuchElementException("Book not found: " + bookId));

        if (book.getStock() < quantity) {
            throw new IllegalStateException(
                    "Not enough stock for \"" + book.getTitle() + "\". Only " + book.getStock() + " left.");
        }

        book.setStock(book.getStock() - quantity);
        Book updated = bookRepository.save(book);

        // Broadcast to all connected browsers so every tab updates instantly
        messagingTemplate.convertAndSend("/topic/stock-updates", Map.of(
                "id",    updated.getId(),
                "stock", updated.getStock(),
                "title", updated.getTitle()
        ));

        return updated;
    }
}
