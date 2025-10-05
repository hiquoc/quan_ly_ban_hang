package com.doan.inventory_service.services;

import com.doan.inventory_service.dtos.supplier.SupplierRequest;
import com.doan.inventory_service.models.Supplier;
import com.doan.inventory_service.repositories.SupplierRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@AllArgsConstructor
public class SupplierService {
    private final SupplierRepository supplierRepository;

    public Supplier createSupplier(SupplierRequest request){
        Supplier supplier=new Supplier(request.getName(), request.getContactName(),
                request.getPhone(),request.getEmail(),request.getTaxCode());
        return supplierRepository.save(supplier);
    }
    public List<Supplier> getSuppliers(){
        return supplierRepository.findAll();
    }
}
