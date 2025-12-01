package com.doan.inventory_service.repositories;

import com.doan.inventory_service.models.InventoryTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, Long>, JpaSpecificationExecutor<InventoryTransaction> {
    long countByCreatedAtBetween(OffsetDateTime start, OffsetDateTime end);

    Page<InventoryTransaction> findByInventoryIdAndCreatedAtBetween(
            Long inventoryId, OffsetDateTime start, OffsetDateTime end, Pageable pageable);

    List<InventoryTransaction> findByInventoryIdAndCreatedAtBetween(
            Long inventoryId, OffsetDateTime start, OffsetDateTime end);

    List<InventoryTransaction> findByInventoryIdAndStatusAndCreatedAtBetweenOrderByCreatedAtDesc(Long id, String status, OffsetDateTime from, OffsetDateTime to);
    List<InventoryTransaction> findByInventoryIdAndStatusAndUpdatedAtBetweenOrderByCreatedAtAsc(Long id, String status, OffsetDateTime from, OffsetDateTime to);

    @Query("""
       SELECT t
       FROM InventoryTransaction t
       WHERE t.inventory.id IN :inventoryIds
         AND t.status = :status
         AND t.updatedAt BETWEEN :from AND :to
       ORDER BY t.inventory.id, t.createdAt ASC
       """)
    List<InventoryTransaction> findAllByInventoryIdsAndStatusAndUpdatedAtBetween(
            @Param("inventoryIds") List<Long> inventoryIds,
            @Param("status") String status,
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to
    );


    Page<InventoryTransaction> findByInventoryId(Long inventoryId, Pageable pageable);

    List<InventoryTransaction> findByInventoryId(Long inventoryId);

    List<InventoryTransaction> findByInventoryId(Long inventoryId, Sort sort);

    List<InventoryTransaction> findByReferenceTypeAndReferenceCodeAndTransactionTypeAndStatus(String refType, String refCode, String type, String status);

    List<InventoryTransaction> findByReferenceTypeAndReferenceCodeAndTransactionTypeAndStatusAndInventory_Warehouse_Id(
            String refType,
            String refCode,
            String type,
            String status,
            Long warehouseId
    );

    // 🔹 Base generic filter
    @Query("""
                SELECT t FROM InventoryTransaction t
                WHERE (:status IS NULL OR t.status = :status)
                  AND (:type IS NULL OR t.transactionType = :type)
                  AND (:start IS NULL OR t.createdAt >= :start)
                  AND (:end IS NULL OR t.createdAt <= :end)
            """)
    Page<InventoryTransaction> findWithFilters(
            @Param("status") String status,
            @Param("type") String type,
            @Param("start") OffsetDateTime start,
            @Param("end") OffsetDateTime end,
            Pageable pageable
    );

    // 🔹 Search by variant IDs (via SKU lookup)
    @Query("""
                SELECT t FROM InventoryTransaction t
                        WHERE t.inventory.variantId IN :variantIds
                  AND (:status IS NULL OR t.status = :status)
                  AND (:type IS NULL OR t.transactionType = :type)
                  AND (:start IS NULL OR t.createdAt >= :start)
                  AND (:end IS NULL OR t.createdAt <= :end)
            """)
    Page<InventoryTransaction> findByVariantIdsAndFilters(
            @Param("variantIds") List<Long> variantIds,
            @Param("status") String status,
            @Param("type") String type,
            @Param("start") OffsetDateTime start,
            @Param("end") OffsetDateTime end,
            Pageable pageable
    );

    // 🔹 Search by warehouse code (assuming warehouse is an entity relation)
    @Query("""
                SELECT t FROM InventoryTransaction t
                WHERE LOWER(t.inventory.warehouse.code) LIKE LOWER(CONCAT('%', :warehouseCode, '%'))
                  AND (:status IS NULL OR t.status = :status)
                  AND (:type IS NULL OR t.transactionType = :type)
                  AND (:start IS NULL OR t.createdAt >= :start)
                  AND (:end IS NULL OR t.createdAt <= :end)
            """)
    Page<InventoryTransaction> findByWarehouseCodeAndFilters(
            @Param("warehouseCode") String warehouseCode,
            @Param("status") String status,
            @Param("type") String type,
            @Param("start") OffsetDateTime start,
            @Param("end") OffsetDateTime end,
            Pageable pageable
    );

    // 🔹 Search by transaction code
    @Query("""
                SELECT t FROM InventoryTransaction t
                WHERE LOWER(t.code) LIKE LOWER(CONCAT('%', :code, '%'))
                  AND (:status IS NULL OR t.status = :status)
                  AND (:type IS NULL OR t.transactionType = :type)
                  AND (:start IS NULL OR t.createdAt >= :start)
                  AND (:end IS NULL OR t.createdAt <= :end)
            """)
    Page<InventoryTransaction> findByCodeAndFilters(
            @Param("code") String code,
            @Param("status") String status,
            @Param("type") String type,
            @Param("start") OffsetDateTime start,
            @Param("end") OffsetDateTime end,
            Pageable pageable
    );

    List<InventoryTransaction> findByReferenceTypeAndReferenceCodeAndTransactionType(String refType, String refCode, String type);
}
