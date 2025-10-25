package com.datn.cart_service.repository;

import com.datn.cart_service.entity.ShoppingCart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CartRepository extends JpaRepository<ShoppingCart, Long> {

    // Lấy toàn bộ giỏ hàng của 1 khách hàng
    List<ShoppingCart> findByCustomerId(Long customerId);

    // Tìm một item trong giỏ theo khách hàng + variant
    Optional<ShoppingCart> findByCustomerIdAndVariantId(Long customerId, Long variantId);

    // Xóa toàn bộ giỏ hàng của 1 khách hàng
    void deleteByCustomerId(Long customerId);

    // Xóa 1 sản phẩm cụ thể khỏi giỏ hàng
    void deleteByCustomerIdAndVariantId(Long customerId, Long variantId);

    // Đếm tổng số sản phẩm trong giỏ
    Long countByCustomerId(Long customerId);

    // Kiểm tra xem variant có trong giỏ hàng chưa
    boolean existsByCustomerIdAndVariantId(Long customerId, Long variantId);
}