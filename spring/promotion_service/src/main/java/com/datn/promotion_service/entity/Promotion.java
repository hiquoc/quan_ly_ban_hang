package com.datn.promotion_service.entity;

import com.datn.promotion_service.enums.DiscountType;
import com.datn.promotion_service.enums.PromotionType;
import com.vladmihalcea.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "promotions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Promotion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "promotion_type", nullable = false, length = 20)
    private PromotionType promotionType;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", length = 20)
    private DiscountType discountType;

    @Column(name = "discount_value", precision = 15, scale = 2)
    private BigDecimal discountValue;

    @Column(name = "min_order_amount", precision = 15, scale = 2)
    private BigDecimal minOrderAmount;

    @Column(name = "max_discount_amount", precision = 15, scale = 2)
    private BigDecimal maxDiscountAmount;

    @Column(name = "usage_limit")
    private Integer usageLimit;

    @Column(name = "usage_count", nullable = false)
    private Integer usageCount = 0;

    @Column(name = "usage_limit_per_customer")
    private Integer usageLimitPerCustomer;

    @Column(name = "start_date", nullable = false)
    private LocalDateTime startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDateTime endDate;

    @Type(JsonBinaryType.class)
    @Column(name = "applicable_products", columnDefinition = "jsonb")
    private List<Long> applicableProducts;

    @Type(JsonBinaryType.class)
    @Column(name = "applicable_categories", columnDefinition = "jsonb")
    private List<Long> applicableCategories;

    @Type(JsonBinaryType.class)
    @Column(name = "applicable_brands", columnDefinition = "jsonb")
    private List<Long> applicableBrands;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_by_staff_id")
    private Long createdByStaffId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Helper methods
    public boolean isValid() {
        LocalDateTime now = LocalDateTime.now();
        return isActive &&
                !now.isBefore(startDate) &&
                !now.isAfter(endDate);
    }

    public boolean hasUsageLimit() {
        return usageLimit != null && usageLimit > 0;
    }

    public boolean isUsageLimitReached() {
        return hasUsageLimit() && usageCount >= usageLimit;
    }

    public boolean canBeUsed() {
        return isValid() && !isUsageLimitReached();
    }
}