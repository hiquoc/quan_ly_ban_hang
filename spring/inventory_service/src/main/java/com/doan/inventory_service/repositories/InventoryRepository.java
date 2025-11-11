package com.doan.inventory_service.repositories;

import com.doan.inventory_service.dtos.inventory.InventoryResponse;
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

    boolean existsByWarehouseId(Long warehouseId);

    @Query("""
                SELECT i\s
                FROM Inventory i\s
                JOIN i.warehouse w\s
                WHERE i.isActive = :isActive
                  AND w.id = :warehouseId
           \s""")
    Page<Inventory> findAllByIsActiveAndWarehouseId(
            @Param("isActive") Boolean isActive,
            @Param("warehouseId") Long warehouseId,
            Pageable pageable
    );

    Page<Inventory> findAllByIsActive(Boolean isActive, Pageable pageable);

    @Query("""
    SELECT i FROM Inventory i
    WHERE i.isActive = :isActive
      AND (:variantIds IS NULL OR i.variantId IN :variantIds)
      AND (:warehouseId IS NULL OR i.warehouse.id = :warehouseId)
""")
    Page<Inventory> searchInventories(
            @Param("variantIds") List<Long> variantIds,
            @Param("isActive") Boolean isActive,
            @Param("warehouseId") Long warehouseId,
            Pageable pageable
    );

    @Query("""
    SELECT i FROM Inventory i
    WHERE i.isActive = :isActive
      AND (:variantIds IS NULL OR i.variantId IN :variantIds)
""")
    Page<Inventory> findAllByIsActiveAndVariantIdIn(@Param("isActive")Boolean isActive,
                                                    @Param("variantIds") List<Long> variantIds,
                                                    Pageable pageable);

    @Query("SELECT i FROM Inventory i " +
            "WHERE i.isActive = true " +
            "ORDER BY (i.quantity - i.reservedQuantity) ASC")
    Page<Inventory> findAllOrderByAvailableStock(Pageable pageable);}
