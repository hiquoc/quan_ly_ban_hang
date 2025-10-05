package com.doan.product_service.repositories;

import com.doan.product_service.models.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductVariantRepository extends JpaRepository<ProductVariant,Long> {
    List<ProductVariant> findByIsActiveIsTrue();

    Optional<ProductVariant> findBySku(String sku);

    boolean existsBySkuAndIdNot(String sku, Long id);

    List<ProductVariant> findByProductId(Long productId);
    boolean existsByProductId(Long productId);
    boolean existsByProductIdAndIsActiveIsTrue(Long productId);
}
