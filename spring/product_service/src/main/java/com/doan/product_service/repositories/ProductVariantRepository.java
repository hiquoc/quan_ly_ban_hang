package com.doan.product_service.repositories;

import com.doan.product_service.models.Product;
import com.doan.product_service.models.ProductVariant;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface ProductVariantRepository extends JpaRepository<ProductVariant,Long>, JpaSpecificationExecutor<ProductVariant> {
    Optional<ProductVariant> findByIdAndIsActiveIsTrue(Long id);
    List<ProductVariant> findByIsActiveIsTrue();

    Optional<ProductVariant> findBySku(String sku);

    boolean existsBySkuAndIdNot(String sku, Long id);

    List<ProductVariant> findByProductId(Long productId);
    boolean existsByProductId(Long productId);
    boolean existsByProductIdAndIsActiveIsTrue(Long productId);

    List<ProductVariant> findBySkuContainingIgnoreCase(String code);

}
