package com.doan.product_service.repositories;

import com.doan.product_service.models.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product,Long>, JpaSpecificationExecutor<Product> {
    List<Product> findByIsActiveIsTrue();
    boolean existsByNameAndIdNot(String name, Long id);
    boolean existsBySlugAndIdNot(String slug, Long id);
    Optional<Product> findByProductCode(String productCode);
    Optional<Product> findByName(String name);
    Optional<Product> findBySlug(String slug);
    boolean existsByBrandIdAndIsActiveIsTrue(Long id);
    boolean existsByCategoryIdAndIsActiveIsTrue(Long id);

    Page<Product> findByNameContainingIgnoreCaseAndIsActive(String name, boolean isActive, Pageable pageable);
    Page<Product> findByNameContainingIgnoreCase(String name, Pageable pageable);
    Page<Product> findByIsActive(boolean isActive, Pageable pageable);

    @Query(value = """
        SELECT p.*
        FROM products p
        LEFT JOIN product_variants v
               ON v.product_id = p.id
        WHERE p.is_active = true
        GROUP BY p.id
        HAVING MAX(v.discount_percent) > 0
        ORDER BY MAX(v.discount_percent) DESC
        LIMIT :size OFFSET :offset
        """, nativeQuery = true)
    List<Product> findDiscountedProducts(@Param("size") int size, @Param("offset") int offset);
}
