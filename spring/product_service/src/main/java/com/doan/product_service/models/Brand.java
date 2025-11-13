package com.doan.product_service.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;

@Data
@NoArgsConstructor
@Entity
@Table(name = "brands")
public class Brand {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 100)
    private String slug;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name="is_active" ,nullable = false)
    private Boolean isActive = false;

    @Column(name="is_featured" ,nullable = false)
    private Boolean isFeatured = false;

    @Column(name="description",columnDefinition = "TEXT")
    private String description;

    @Column(name = "created_at",nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    public Brand(String name, String slug,String description, String imageUrl) {
        this.name = name;
        this.slug = slug;
        this.description=description;
        this.imageUrl = imageUrl;
    }

}
