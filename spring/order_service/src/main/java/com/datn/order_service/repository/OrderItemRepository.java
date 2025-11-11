package com.datn.order_service.repository;

import com.datn.order_service.entity.OrderItem;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    List<OrderItem> findByOrderId(Long orderId);


    @Query(value = """
        SELECT
            (product_snapshot->>'productId')::bigint AS product_id,
            COUNT(*) AS total_sold,
            product_snapshot->>'productName' AS product_name,
            product_snapshot->>'code' AS product_code,
            product_snapshot->>'slug' AS product_slug
        FROM order_items
        WHERE created_at BETWEEN :from AND :to
        GROUP BY product_snapshot->>'productId', product_snapshot->>'productName', product_snapshot->>'code', product_snapshot->>'slug'
        ORDER BY total_sold DESC
        """, nativeQuery = true)
    List<Object[]> getTopProduct(@Param("from") OffsetDateTime from,
                                 @Param("to") OffsetDateTime to,
                                 Pageable pageable);

    @Query(value = """
        SELECT
            variant_id,
            COUNT(*) AS total_sold,
            product_snapshot->>'name' AS variant_name,
            product_snapshot->>'sku' AS variant_sku
        FROM order_items
        WHERE created_at BETWEEN :from AND :to
        GROUP BY variant_id, product_snapshot->>'name', product_snapshot->>'sku'
        ORDER BY total_sold DESC
        """, nativeQuery = true)
    List<Object[]> getTopVariant(@Param("from") OffsetDateTime from,
                                 @Param("to") OffsetDateTime to,
                                 Pageable pageable);
}