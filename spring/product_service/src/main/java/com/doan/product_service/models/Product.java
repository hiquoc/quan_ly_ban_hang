package com.doan.product_service.models;

import jakarta.persistence.*;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.*;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;

@Data
@NoArgsConstructor
@Entity
@Table(name = "products")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(name = "product_code", nullable = false, unique = true)
    private String productCode;

    @Column(nullable = false, unique = true)
    private String slug;


    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "short_description", columnDefinition = "TEXT")
    private String shortDescription;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "brand_id", nullable = false)
    private Brand brand;

    @Column(name = "technical_specs", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, String> technicalSpecs;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "is_active")
    private Boolean isActive = false;

    @Column(name = "is_featured")
    private Boolean isFeatured = false;

    @Column(name = "created_at")
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;


    public Product(String name,
                   String productCode,
                   String slug,
                   String description,
                   String shortDescription,
                   Category category,
                   Brand brand,
                   Map<String,String> technicalSpecs,
                   String imageUrl) {
        this.name = name;
        this.productCode=productCode;
        this.slug = slug;
        this.description = description;
        this.shortDescription = shortDescription;
        this.category = category;
        this.brand = brand;
        this.technicalSpecs = technicalSpecs;
        this.imageUrl = imageUrl;
    }
}



