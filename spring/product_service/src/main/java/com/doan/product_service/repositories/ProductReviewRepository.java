package com.doan.product_service.repositories;

import com.doan.product_service.models.ProductReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ProductReviewRepository extends JpaRepository<ProductReview, Long> {

    Page<ProductReview> findByProductId(Long productId, Pageable pageable);

    Page<ProductReview> findByProductIdAndRating(Long productId, Integer rating, Pageable pageable);

    @Query("SELECT r.rating, COUNT(r) FROM ProductReview r WHERE r.productId = :productId GROUP BY r.rating")
    List<Object[]> countRatingsByProductId(@Param("productId") Long productId);

    Optional<ProductReview> findByProductIdAndCustomerId(Long productId, Long ownerId);

    boolean existsByProductIdAndCustomerId(Long productId, Long ownerId);

    boolean existsByOrderId(Long orderId);

    boolean existsByOrderIdAndVariantId(Long orderId, Long variantId);

    List<ProductReview> findByCustomerId(Long id);

    @Query("""
            SELECT pr
            FROM ProductReview pr
            WHERE (pr.createdAt >= COALESCE(:startDate, pr.createdAt))
              AND (pr.createdAt <= COALESCE(:endDate, pr.createdAt))
            """)
    List<ProductReview> getAllReviews(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

}
