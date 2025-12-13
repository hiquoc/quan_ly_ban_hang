package com.doan.product_service.repositories;

import com.doan.product_service.models.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {
    List<Product> findByIsActiveIsTrue();

    boolean existsByNameAndIdNot(String name, Long id);

    boolean existsBySlugAndIdNot(String slug, Long id);

    Optional<Product> findByProductCode(String productCode);

    Optional<Product> findByName(String name);

    Optional<Product> findBySlug(String slug);

    boolean existsByBrandIdAndIsActiveIsTrue(Long id);

    boolean existsByCategoryIdAndIsActiveIsTrue(Long id);

    boolean existsByProductCodeAndIdNot(String productCode, Long id);


    @Query(value = """
            SELECT p.id,p.name,p.product_code,p.slug,p.total_sold,p.image_url
            FROM product p
            WHERE p.is_active=true
            ORDER BY p.total_sold DESC
            LIMIT :size
            """, nativeQuery = true)
    List<Product> getTopProducts(@Param("size") int size);

    @Query(value = """
            SELECT p.*
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.is_active = true
              AND (:categorySlug IS NULL OR c.slug = :categorySlug)
            ORDER BY RANDOM()
            LIMIT :size
            """, nativeQuery = true)
    List<Product> getRandomActiveProductByCategorySlug(@Param("categorySlug") String categorySlug,
                                                       @Param("size") int size);

    @Query("""
                SELECT p.id
                FROM Product p
                WHERE p.isActive = TRUE
                  AND EXISTS (
                    SELECT 1 FROM ProductVariant v
                    WHERE v.product = p
                      AND v.status != 'OUT_OF_STOCK'
                      AND v.isDeleted = FALSE
                  )
            """)
    List<Long> getAvailableProducts();

    @Query(
            value = """
            SELECT DISTINCT category_id, brand_id
            FROM products
            WHERE id IN (:productIds)
        """,
            nativeQuery = true
    )
    List<Object[]> findCategoryAndBrandIdsByProductIds(
            @Param("productIds") List<Long> productIds
    );

}
