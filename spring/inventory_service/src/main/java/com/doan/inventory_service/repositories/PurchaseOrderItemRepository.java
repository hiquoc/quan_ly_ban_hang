package com.doan.inventory_service.repositories;

import com.doan.inventory_service.models.PurchaseOrder;
import com.doan.inventory_service.models.PurchaseOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PurchaseOrderItemRepository extends JpaRepository<PurchaseOrderItem,Long> {
    boolean existsByVariantId(Long variantId);
}
