package com.doan.product_service.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@NoArgsConstructor
@Entity
@Table(name = "categories")
public class Category {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 100)
    private String slug;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name="is_active" ,nullable = false)
    private Boolean isActive = false;

    @Column(name = "created_At", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public Category(String name, String slug,String imageUrl) {
        this.name = name;
        this.slug = slug;
        this.imageUrl = imageUrl;
    }
}

