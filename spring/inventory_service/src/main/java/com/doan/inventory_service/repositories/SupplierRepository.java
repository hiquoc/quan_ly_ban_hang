package com.doan.inventory_service.repositories;

import com.doan.inventory_service.models.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupplierRepository extends JpaRepository<Supplier,Long> {

}
