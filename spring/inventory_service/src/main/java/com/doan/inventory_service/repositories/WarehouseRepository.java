package com.doan.inventory_service.repositories;

import com.doan.inventory_service.models.Supplier;
import com.doan.inventory_service.models.Warehouse;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WarehouseRepository extends JpaRepository<Warehouse,Long> {
    boolean existsByName(String name);
    boolean existsByNameAndIdNot(String name,Long id);

    boolean existsByCode(String code);
    boolean existsByCodeAndIdNot(String code,Long id);
}
