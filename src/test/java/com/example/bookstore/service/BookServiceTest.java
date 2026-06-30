package com.example.bookstore.service;

import com.example.bookstore.model.Book;
import com.example.bookstore.repository.BookRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * UNIT TEST — runs in milliseconds, no Spring, no database.
 * We mock (fake) the repository and messaging, so this test only
 * checks: does BookService logic work correctly?
 */
@ExtendWith(MockitoExtension.class)
class BookServiceTest {

    @Mock
    private BookRepository bookRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    private BookService bookService;

    @BeforeEach
    void setUp() {
        bookService = new BookService(bookRepository, messagingTemplate);
    }

    // ✅ Normal buy: stock should go down, WebSocket should fire
    @Test
    void buyBook_decreasesStock_whenEnoughStockAvailable() {
        Book book = new Book("Java for Beginners", "Author", "Programming", 14.99, 5, null);
        book.setId(1L);

        when(bookRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(book));
        when(bookRepository.save(any(Book.class))).thenAnswer(inv -> inv.getArgument(0));

        Book result = bookService.buyBook(1L, 2);

        assertThat(result.getStock()).isEqualTo(3);
        // must broadcast to all open browser tabs
        verify(messagingTemplate).convertAndSend(eq("/topic/stock-updates"), any(Object.class));
    }

    // ❌ Not enough stock: should throw error, must NOT broadcast a fake update
    @Test
    void buyBook_throwsError_whenNotEnoughStock() {
        Book book = new Book("Java for Beginners", "Author", "Programming", 14.99, 1, null);
        book.setId(1L);

        when(bookRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(book));

        assertThrows(IllegalStateException.class, () -> bookService.buyBook(1L, 5));

        verify(messagingTemplate, never()).convertAndSend(eq("/topic/stock-updates"), any(Object.class));
    }

    // ❌ Bad quantity
    @Test
    void buyBook_throwsError_whenQuantityIsZeroOrNegative() {
        assertThrows(IllegalArgumentException.class, () -> bookService.buyBook(1L, 0));
        assertThrows(IllegalArgumentException.class, () -> bookService.buyBook(1L, -1));
    }

    // ❌ Book doesn't exist
    @Test
    void buyBook_throwsError_whenBookDoesNotExist() {
        when(bookRepository.findByIdForUpdate(99L)).thenReturn(Optional.empty());
        assertThrows(java.util.NoSuchElementException.class, () -> bookService.buyBook(99L, 1));
    }
}
