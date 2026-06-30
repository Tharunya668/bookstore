package com.example.bookstore.config;

import com.example.bookstore.model.Book;
import com.example.bookstore.repository.BookRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    private final BookRepository bookRepository;

    public DataSeeder(BookRepository bookRepository) {
        this.bookRepository = bookRepository;
    }

    @Override
    public void run(String... args) {
        if (bookRepository.count() > 0) return; // don't duplicate on restart

        bookRepository.saveAll(List.of(
            new Book("Java for Beginners", "Herbert Schildt", "Programming", 14.99, 8,
                "https://gohired.in/wp-content/uploads/2016/08/51WaQVeEReL.jpg"),
            new Book("React JS Guide", "Alex Banks", "Frontend", 25.99, 5,
                "https://content.packt.com/_/image/original/V17670/cover_image.jpg"),
            new Book("Spring Boot 3 and React", "Juha Hinkula", "Full Stack", 35.99, 6,
                "https://content.packt.com/_/image/original/B19818/cover_image.jpg"),
            new Book("Full Stack .NET Web Development", "Trevoir Williams", "Full Stack", 29.99, 4,
                "https://via.placeholder.com/160x230?text=.NET+Core"),
            new Book("Python Programming", "Eric Matthes", "Programming", 19.99, 10,
                "https://via.placeholder.com/160x230?text=Python"),
            new Book("Machine Learning Basics", "Aurélien Géron", "AI/ML", 39.99, 3,
                "https://via.placeholder.com/160x230?text=Machine+Learning"),
            new Book("Artificial Intelligence", "Stuart Russell", "AI/ML", 44.99, 1,
                "https://via.placeholder.com/160x230?text=AI"),
            new Book("Data Structures & Algorithms", "Robert Lafore", "Programming", 24.99, 7,
                "https://via.placeholder.com/160x230?text=DSA"),
            new Book("AWS Cloud Practitioner", "Neal Davis", "Cloud", 34.99, 2,
                "https://via.placeholder.com/160x230?text=AWS")
        ));
    }
}
