package com.doan.product_service.dtos.product_review;

import com.doan.product_service.models.ProductReview;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;

import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ProductReviewResponse {
    private Page<ProductReviewDetailsResponse> reviews;
    private Map<Integer, Long> ratingCounts;
}