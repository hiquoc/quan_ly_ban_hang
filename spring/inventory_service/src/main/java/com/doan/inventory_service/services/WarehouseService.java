package com.doan.inventory_service.services;

import com.doan.inventory_service.dtos.supplier.SupplierRequest;
import com.doan.inventory_service.dtos.warehouse.WarehouseRequest;
import com.doan.inventory_service.models.Supplier;
import com.doan.inventory_service.models.Warehouse;
import com.doan.inventory_service.repositories.InventoryRepository;
import com.doan.inventory_service.repositories.SupplierRepository;
import com.doan.inventory_service.repositories.WarehouseRepository;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Objects;

@Service
@AllArgsConstructor
public class WarehouseService {
    private final WarehouseRepository warehouseRepository;
    private final InventoryRepository inventoryRepository;

    public Warehouse createWarehouse(WarehouseRequest request){
        if(warehouseRepository.existsByName(request.getName()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Tên kho đã tồn tại!");

        if(warehouseRepository.existsByCode(request.getCode()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Mã kho đã tồn tại!");

        Warehouse warehouse=new Warehouse(request.getName(), request.getCode(),
                request.getAddress(), request.getDescription());
        return warehouseRepository.save(warehouse);
    }
    public List<Warehouse> getWarehouses(){
        return warehouseRepository.findAll();
    }

    @Transactional
    public Warehouse updateWarehouse(Long id, WarehouseRequest request){
        Warehouse warehouse=warehouseRepository.findById(id)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy kho!"));

        if(!Objects.equals(request.getName(), warehouse.getName())){
            if(warehouseRepository.existsByNameAndIdNot(request.getName(),id))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Tên kho đã tồn tại!");
            warehouse.setName(request.getName());
        }
        if(!Objects.equals(request.getCode(), warehouse.getCode())){
            if(warehouseRepository.existsByCodeAndIdNot(request.getCode(),id))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Mã kho đã tồn tại!");
            warehouse.setCode(request.getCode());
        }
        if(!Objects.equals(request.getAddress(), warehouse.getAddress()))
            warehouse.setAddress(request.getAddress());
        if(!Objects.equals(request.getDescription(), "") && !Objects.equals(request.getDescription(), warehouse.getDescription()))
            warehouse.setDescription(request.getDescription());
        return warehouse;
    }
    public void deleteWarehouse(Long id){
        Warehouse supplier=warehouseRepository.findById(id)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy kho!"));
        if(inventoryRepository.existsByWarehouseId(id))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Kho đang được sử dụng!");
        warehouseRepository.delete(supplier);
    }
}
