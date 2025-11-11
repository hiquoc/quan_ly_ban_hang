package com.datn.cart_service.controller;

import com.datn.cart_service.dto.request.AddToCartRequest;
import com.datn.cart_service.dto.request.UpdateCartRequest;
import com.datn.cart_service.dto.response.ApiResponse;
import com.datn.cart_service.dto.response.CartItemResponse;
import com.datn.cart_service.dto.response.CartResponse;
import com.datn.cart_service.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    /**
     * Thêm variant vào giỏ hàng
     * CHỈ cho phép thêm variant có isAvailable = true
     */
    @PreAuthorize("hasRole('CUSTOMER')")
    @PostMapping
    public ResponseEntity<ApiResponse<CartItemResponse>> addToCart(
            @RequestHeader("X-Owner-Id") Long customerId,
            @Valid @RequestBody AddToCartRequest request) {
        CartItemResponse response = cartService.addToCart(request, customerId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>("Thêm sản phẩm vào giỏ hàng thành công!", true, response));
    }

    /**
     * Lấy giỏ hàng của khách hàng
     * Hiển thị tất cả variant kể cả không available
     */
    @PreAuthorize("hasRole('CUSTOMER')")
    @GetMapping("/customer")
    public ResponseEntity<ApiResponse<CartResponse>> getCustomerCart(@RequestHeader("X-Owner-Id") Long customerId) {
        CartResponse response = cartService.getCustomerCart(customerId);
        return ResponseEntity.ok(new ApiResponse<>("Lấy giỏ hàng thành công!", true, response));
    }

    /**
     * Cập nhật số lượng variant trong giỏ
     */
    @PreAuthorize("hasRole('CUSTOMER')")
    @PutMapping("/{cartId}")
    public ResponseEntity<ApiResponse<CartItemResponse>> updateCartItem(
            @PathVariable Long cartId,
            @Valid @RequestBody UpdateCartRequest request) {
        CartItemResponse response = cartService.updateCartItem(cartId, request);

        return ResponseEntity.ok(new ApiResponse<>("Cập nhật giỏ hàng thành công!", true, response));
    }

    /**
     * Xóa variant khỏi giỏ hàng theo customer và variant
     */

    @DeleteMapping("/customer/variant/{variantId}")
    public ResponseEntity<ApiResponse<Void>> removeByCustomerAndVariant(
            @RequestHeader("X-Owner-Id") Long customerId,
            @PathVariable Long variantId) {
        cartService.removeByCustomerAndVariant(customerId, variantId);
        return ResponseEntity.ok(new ApiResponse<>("Xóa sản phẩm thành công!", true, null));
    }
    @DeleteMapping("/internal/customer/variant/{variantId}")
    public ResponseEntity<ApiResponse<Void>> internalRemove(
            @RequestHeader("X-Owner-Id") Long customerId,
            @PathVariable Long variantId) {
        cartService.removeByCustomerAndVariant(customerId, variantId);
        return ResponseEntity.ok(new ApiResponse<>("Removed successfully", true, null));
    }

    /**
     * Xóa toàn bộ giỏ hàng
     */

    @DeleteMapping("/customer")
    public ResponseEntity<ApiResponse<Void>> clearCart(@RequestHeader("X-Owner-Id") Long customerId) {
        cartService.clearCart(customerId);
        return ResponseEntity.ok(new ApiResponse<>("Xóa toàn bộ giỏ hàng thành công!", true, null));
    }
    @DeleteMapping("/internal/customer")
    public ResponseEntity<ApiResponse<Void>> internalClearCart(@RequestHeader("X-Owner-Id") Long customerId) {
        cartService.clearCart(customerId);
        return ResponseEntity.ok(new ApiResponse<>("Xóa toàn bộ giỏ hàng thành công!", true, null));
    }

    /**
     * Đếm số lượng variant trong giỏ
     */
    @PreAuthorize("hasRole('CUSTOMER')")
    @GetMapping("/customer/count")
    public ResponseEntity<ApiResponse<Long>> getCartItemCount(@RequestHeader("X-Owner-Id") Long customerId) {
        Long count = cartService.getCartItemCount(customerId);
        return ResponseEntity.ok(new ApiResponse<>("Lấy số lượng sản phẩm thành công!", true, count));
    }

    /**
     * Validate giỏ hàng trước khi checkout
     * CHỈ trả về variant available
     * Throw exception nếu có variant không available
     */
    @PreAuthorize("hasRole('CUSTOMER')")
    @GetMapping("/customer/validate")
    public ResponseEntity<ApiResponse<List<CartItemResponse>>> validateCart(@RequestHeader("X-Owner-Id") Long customerId) {
        List<CartItemResponse> validItems = cartService.validateCart(customerId);
        return ResponseEntity.ok(new ApiResponse<>("Giỏ hàng hợp lệ!", true, validItems));
    }
}