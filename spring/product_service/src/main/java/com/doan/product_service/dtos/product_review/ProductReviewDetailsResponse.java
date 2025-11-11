package com.doan.product_service.dtos.product_review;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;

@Data
@AllArgsConstructor
@Builder
public class ProductReviewDetailsResponse {
        private Long id;
        private Long orderId;
        private Long productId;
        private Long variantId;
        private Long customerId;
        private String username;
        private Integer rating;
        private String content;
        private Map<String, String> images;
        private Map<String,String> attributes;
        private Boolean isApproved;
        private OffsetDateTime createdAt;
        private OffsetDateTime updatedAt;
}
