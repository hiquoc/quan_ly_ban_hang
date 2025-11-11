package com.doan.inventory_service.services;

import com.doan.inventory_service.dtos.supplier.SupplierRequest;
import com.doan.inventory_service.models.Supplier;
import com.doan.inventory_service.repositories.PurchaseOrderRepository;
import com.doan.inventory_service.repositories.SupplierRepository;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Objects;

@Service
@AllArgsConstructor
public class SupplierService {
    private final SupplierRepository supplierRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;

    public Supplier createSupplier(SupplierRequest request){
        if(supplierRepository.existsByName(request.getName()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Tên nhà cung cấp đã tồn tại!");
        if(supplierRepository.existsByCode(request.getCode()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Mã nhà cung cấp đã tồn tại!");
        if(supplierRepository.existsByTaxCode(request.getTaxCode()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Mã số thuế đã tồn tại!");
        if(supplierRepository.existsByPhone(request.getPhone()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Số điện thoại đã được sử dụng!");
        if(supplierRepository.existsByEmail(request.getEmail()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Email đã được sử dụng!");
        Supplier supplier=new Supplier(request.getName(), request.getCode(), request.getPhone(),request.getEmail(),
                request.getAddress(), request.getTaxCode(), request.getDescription());
        return supplierRepository.save(supplier);
    }
    public List<Supplier> getSuppliers(){
        return supplierRepository.findAll();
    }

    @Transactional
    public Supplier updateSupplier(Long id,SupplierRequest request){
        Supplier supplier=supplierRepository.findById(id)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy nhà cung cấp!"));
        if(!Objects.equals(request.getTaxCode(), supplier.getTaxCode())){
            if(supplierRepository.existsByTaxCodeAndIdNot(request.getTaxCode(),id))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Mã số thuế đã tồn tại!");
            supplier.setTaxCode(request.getTaxCode());
        }

        if(!Objects.equals(request.getName(), supplier.getName())){
            if(supplierRepository.existsByNameAndIdNot(request.getName(),id))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Tên nhà cung cấp đã tồn tại!");
            supplier.setName(request.getName());
        }
        if(!Objects.equals(request.getCode(), supplier.getCode())){
            if(supplierRepository.existsByCodeAndIdNot(request.getCode(),id))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Mã nhà cung cấp đã tồn tại!");
            supplier.setCode(request.getCode());
        }

        if(!Objects.equals(request.getPhone(), supplier.getPhone())){
            if(supplierRepository.existsByPhoneAndIdNot(request.getPhone(),id))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Số điện thoại đã được sử dụng!");
            supplier.setPhone(request.getPhone());
        }
        if(!Objects.equals(request.getEmail(), supplier.getEmail())){
            if(supplierRepository.existsByEmailAndIdNot(request.getEmail(),id))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Email đã được sử dụng!");
            supplier.setEmail(request.getEmail());
        }

        if(!Objects.equals(request.getAddress(), supplier.getAddress()))
            supplier.setAddress(request.getAddress());
        if(!Objects.equals(request.getDescription(), supplier.getDescription()))
            supplier.setDescription(request.getDescription());
        return supplier;
    }
    public void deleteSupplier(Long id){
        /// /
        Supplier supplier=supplierRepository.findById(id)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy nhà cung cấp!"));
        if(purchaseOrderRepository.existsBySupplierId(id))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Nhà cung cấp đã được sử dụng!");
        supplierRepository.delete(supplier);
    }
}
