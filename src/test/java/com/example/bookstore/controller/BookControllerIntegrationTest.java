package com.example.bookstore.controller;

import com.example.bookstore.model.Book;
import com.example.bookstore.repository.BookRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * INTEGRATION TEST — starts the full Spring Boot app with a real (in-memory)
 * test database. Sends actual HTTP requests and checks real responses.
 * Slower than unit tests but catches issues the unit tests can't:
 * wrong URLs, broken JSON, wrong HTTP status codes.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BookControllerIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired BookRepository bookRepository;
    @Autowired ObjectMapper objectMapper;

    private Long bookId;

    @BeforeEach
    void setUp() {
        bookRepository.deleteAll();
        Book book = new Book("Spring Boot Guide", "Author", "Programming", 29.99, 2, null);
        bookId = bookRepository.save(book).getId();
    }

    // ✅ GET /books returns 200
    @Test
    void getAllBooks_returns200() throws Exception {
        mockMvc.perform(get("/books"))
                .andExpect(status().isOk());
    }

    // ✅ Buy succeeds, stock goes from 2 → 1
    @Test
    void buyBook_succeeds_andDecreasesStock() throws Exception {
        mockMvc.perform(post("/books/{id}/buy", bookId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("quantity", 1))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stock", is(1)));
    }

    // ❌ Trying to buy 99 copies when only 2 in stock → 409 Conflict
    @Test
    void buyBook_returns409_whenNotEnoughStock() throws Exception {
        mockMvc.perform(post("/books/{id}/buy", bookId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("quantity", 99))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").exists());
    }

    // ❌ Book ID that doesn't exist → 404 Not Found
    @Test
    void buyBook_returns404_whenBookDoesNotExist() throws Exception {
        mockMvc.perform(post("/books/{id}/buy", 999999L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("quantity", 1))))
                .andExpect(status().isNotFound());
    }
}
