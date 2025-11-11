package com.doan.product_service.dtos.product_review;

import jakarta.validation.constraints.*;
import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class ProductReviewRequest {
    @NotNull(message = "Vui lòng cung cấp ID đơn hàng")
    private Long orderId;

    @NotNull(message = "Vui lòng cung cấp ID biến thể")
    private Long variantId;

    private Long customerId;
    private String username;

    @NotNull(message = "Vui lòng chọn số sao đánh giá")
    @Min(value = 1, message = "Số sao phải từ 1 trở lên")
    @Max(value = 5, message = "Số sao tối đa là 5")
    private Integer rating;

    private String content;
    private Boolean isApproved;
}

