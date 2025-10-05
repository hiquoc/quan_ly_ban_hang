package com.doan.product_service.models;

import jakarta.persistence.*;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.*;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;

@Data
@NoArgsConstructor
@Entity
@Table(name = "product_variants")
public class ProductVariant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "name")
    private String name;  // e.g., "128GB Black"

    @Column(nullable = false, unique = true)
    private String sku;

    @Column(name = "import_price")
    private BigDecimal importPrice=BigDecimal.ZERO;

    @Column(name = "selling_price", nullable = false)
    private BigDecimal sellingPrice=BigDecimal.ZERO;

    @Column(name = "discount_percent")
    private Integer discountPercent = 0;

    @Column(name = "attributes", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, String> attributes;

    @Column(name = "imageUrls", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, String> imageUrls;

    @Column(name = "sold_count")
    private Long soldCount = 0L;

    @Column(name = "is_active")
    private Boolean isActive = false;

    @Column(name = "created_at")
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt = OffsetDateTime.now();


    // Constructor
    public ProductVariant(Product product,
                          String name,
                          String sku,
                          Map<String,String> attributes,
                          Map<String,String> imageUrls) {
        this.product = product;
        this.name = name;
        this.sku = sku;
        this.attributes = attributes;
        this.imageUrls = imageUrls;
    }

    // Dynamic discounted price
    public BigDecimal getDiscountPrice() {
        if (discountPercent != null && discountPercent > 0) {
            return sellingPrice.multiply(BigDecimal.valueOf(100 - discountPercent))
                    .divide(BigDecimal.valueOf(100));
        }
        return sellingPrice;
    }

}

