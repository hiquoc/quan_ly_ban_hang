package com.doan.inventory_service.repositories;

import com.doan.inventory_service.models.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupplierRepository extends JpaRepository<Supplier,Long> {
    boolean existsByName(String name);
    boolean existsByNameAndIdNot(String name,Long id);

    boolean existsByCode(String code);
    boolean existsByCodeAndIdNot(String code,Long id);

    boolean existsByTaxCode(String taxCode);
    boolean existsByTaxCodeAndIdNot(String taxCode,Long id);

    boolean existsByPhone(String phone);
    boolean existsByPhoneAndIdNot(String phone,Long id);

    boolean existsByEmail(String email);
    boolean existsByEmailAndIdNot(String email,Long id);

}
