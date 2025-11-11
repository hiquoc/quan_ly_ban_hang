package com.doan.product_service.repositories;

import com.doan.product_service.models.Product;
import com.doan.product_service.models.ProductVariant;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProductVariantRepository extends JpaRepository<ProductVariant,Long>, JpaSpecificationExecutor<ProductVariant> {
    Optional<ProductVariant> findByIdAndIsActiveIsTrue(Long id);
    List<ProductVariant> findByIsActiveIsTrue();

    Optional<ProductVariant> findBySku(String sku);

    boolean existsBySkuAndIdNot(String sku, Long id);

    List<ProductVariant> findByProductId(Long productId);
    @Query(value = "SELECT EXISTS(SELECT 1 FROM product_variants WHERE product_id = :productId AND is_deleted = :isDeleted)", nativeQuery = true)
    boolean existsByProductIdAndIsDeletedNative(@Param("productId") Long productId, @Param("isDeleted") boolean isDeleted);

    boolean existsByProductIdAndIsActiveIsTrue(Long productId);

    List<ProductVariant> findBySkuContainingIgnoreCase(String code);

    @Query(value = """
            SELECT v.id,v.name,v.sku,v.sold_count,v.imageUrls
            FROM product_variants v
            ORDER BY v.sold_count DESC
            LIMIT :size
            """, nativeQuery = true)
    List<Product> getTopVariants(@Param("size") int size);
}
