package com.doan.inventory_service.repositories;

import com.doan.inventory_service.models.Inventory;
import com.doan.inventory_service.models.InventoryTransaction;
import feign.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface InventoryRepository extends JpaRepository<Inventory, Long> {
    List<Inventory> findByVariantId(Long variantId);
    List<Inventory> findByVariantIdIn(List<Long> variantId);

    Optional<Inventory> findByVariantIdAndWarehouseId(Long variantId, Long warehouseId);

    Page<InventoryTransaction> findByCreatedAtBetween(OffsetDateTime start, OffsetDateTime end, Pageable pageable);

    @Query("""
            SELECT i FROM Inventory i
            JOIN i.warehouse w
            WHERE (:variantIds IS NULL OR i.variantId IN :variantIds)
               OR (:warehouseKeyword IS NULL OR LOWER(w.code) LIKE :warehouseKeyword)
            """)
    Page<Inventory> searchInventories(
            @Param("variantIds") List<Long> variantIds,
            @Param("warehouseKeyword") String warehouseKeyword,
            Pageable pageable
    );
}
