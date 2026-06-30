package com.example.bookstore.repository;

import com.example.bookstore.model.Book;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface BookRepository extends JpaRepository<Book, Long> {

    /**
     * SELECT ... FOR UPDATE — locks the row while we check and decrement stock.
     * This means if two people buy the last copy at the same moment, one
     * request must wait for the other to finish. The second one then sees
     * stock = 0 and correctly fails instead of overselling.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Book b where b.id = :id")
    Optional<Book> findByIdForUpdate(Long id);
}
