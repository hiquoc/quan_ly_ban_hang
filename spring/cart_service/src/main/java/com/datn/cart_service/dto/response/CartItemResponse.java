package com.datn.cart_service.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartItemResponse {
    private Long id;

    // Thông tin Variant
    private Long variantId;
    private String variantName;        // Tên đầy đủ của variant
    private String variantSku;

    // Thông tin Product (từ productId của variant)
    private Long productId;            // ID sản phẩm cha
    private String productName;        // Tên sản phẩm cha
    private String productSlug;

    // Giá và số lượng
    private BigDecimal unitPrice;
    private Integer quantity;
    private BigDecimal totalPrice;

    // Hình ảnh
    private Map<String,String> imageUrls;           // Ưu tiên ảnh variant, fallback sang product

    // Trạng thái
    private String status;       // true = có thể mua, false = không khả dụng
    private String unavailableReason;  // Lý do không khả dụng (nếu có)

    private LocalDateTime addedAt;
}