package com.doan.delivery_service.controllers;

import com.doan.delivery_service.dtos.ApiResponse;
import com.doan.delivery_service.dtos.OwnerIdResponse;
import com.doan.delivery_service.dtos.shipper.ShipperDetailsResponse;
import com.doan.delivery_service.dtos.shipper.ShipperRequest;
import com.doan.delivery_service.dtos.shipper.ShipperResponse;
import com.doan.delivery_service.models.Shipper;
import com.doan.delivery_service.sevices.ShipperService;
import jakarta.annotation.security.PermitAll;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("")
@AllArgsConstructor
public class ShipperController {
    private final ShipperService shipperService;

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @GetMapping("/secure/shippers")
    public ResponseEntity<?> getAllShippers(@RequestParam(required = false) Integer page,
                                                         @RequestParam(required = false) Integer size,
                                                         @RequestParam(required = false) String keyword,
                                                         @RequestParam(required = false) String status,
                                                         @RequestParam(required = false) Long warehouseId,
                                                         @RequestParam(required = false) Boolean active) {
        Page<Shipper> response = shipperService.getAllShippers(page, size, keyword, status,warehouseId,active);
        return ResponseEntity.ok(new ApiResponse<>("Success", true, response));
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @GetMapping("/secure/shippers-details")
    public ResponseEntity<?> getAllShippersDetails(@RequestParam(required = false) Integer page,
                                            @RequestParam(required = false) Integer size,
                                            @RequestParam(required = false) String keyword,
                                            @RequestParam(required = false) String status,
                                            @RequestParam(required = false) Long warehouseId,
                                            @RequestParam(required = false) Boolean active) {
        Page<ShipperDetailsResponse> response = shipperService.getAllShippersDetails(page, size, keyword, status,warehouseId,active);
        return ResponseEntity.ok(new ApiResponse<>("Success", true, response));
    }


    @GetMapping("/secure/shippers/{id}")
    public ResponseEntity<?> getShipperDetails(@PathVariable Long id,
                                             @RequestHeader("X-Owner-Id") Long shipperId,
                                             @RequestHeader("X-User-Role") String role) {
        if (!Objects.equals(id, shipperId) && (!role.equals("ADMIN") && !role.equals("MANAGER"))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền truy vấn dữ liệu này!");
        }
        return ResponseEntity.ok(
                new ApiResponse<>("Lấy dữ liệu thành công!",true,shipperService.getShipperDetailsById(id)));
    }

    @GetMapping("/secure/shippers/orders")
    public ResponseEntity<?> getShipperOrders(
            @RequestHeader("X-Owner-Id") Long shipperId) {
        return ResponseEntity.ok(
                new ApiResponse<>("Lấy dữ liệu thành công!", true,
                        shipperService.getShipperDeliveries(shipperId)));
    }


    @PutMapping("/secure/shippers")
    public ResponseEntity<?> updateShipper(@RequestBody ShipperRequest request,
                                           @RequestHeader("X-Owner-Id") Long shipperId) {
        return ResponseEntity.ok(
                new ApiResponse<>("Cập nhật thành công!",true,shipperService.updateShipper(shipperId, request)));
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @PatchMapping("/secure/shippers/{id}/warehouse/{warehouseId}")
    public ResponseEntity<?> updateShipperWarehouse(@PathVariable Long id,
                                                    @PathVariable Long warehouseId) {
        return ResponseEntity.ok(
                new ApiResponse<>("Cập nhật thành công!",true,shipperService.updateShipperWarehouse(id, warehouseId)));
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @PatchMapping("/secure/shippers/{id}/active")
    public ResponseEntity<?> updateShipperActive(@PathVariable Long id) {
        return ResponseEntity.ok(
                new ApiResponse<>("Cập nhật thành công!",true,shipperService.updateShipperActive(id,true)));
    }
    @PatchMapping("/secure/shippers/status")
    public ResponseEntity<?> updateShipperStatus(@RequestHeader("X-Owner-Id") Long shipperId,
                                                 @RequestParam String status) {
        return ResponseEntity.ok(
                new ApiResponse<>("Cập nhật thành công!",true,shipperService.updateShipperStatus(shipperId,status)));
    }
    @PostMapping("/internal/shippers/{id}/active")
    public void changeShipperActive(@PathVariable Long id){
        System.out.println("Controller hit with id = " + id);
        shipperService.updateShipperActive(id,false);
    }
    @PostMapping("/internal/shippers")
    public ResponseEntity<?> createShipper(@RequestBody ShipperRequest request) {
        Shipper shipper = shipperService.createShipper(request);
        OwnerIdResponse response = new OwnerIdResponse();
        response.setOwnerId(shipper.getId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/internal/shippers/ids")
    public ResponseEntity<?> getShipperByIds(@RequestParam List<Long> ids) {
        List<ShipperResponse> list = shipperService.getShipperByIds(ids).stream().map(customer ->
                new ShipperResponse(customer.getId(), customer.getFullName(), customer.getEmail(), customer.getPhone(), customer.getCreatedAt())).toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/internal/shippers/keyword")
    public ResponseEntity<?> getShipperByKeyword(@RequestParam String keyword,
                                                 @RequestParam String type,
                                                 @RequestParam Integer page,
                                                 @RequestParam Integer size) {
        List<ShipperResponse> list = shipperService.getShipperByKeyword(keyword, type, page, size).stream().map(customer ->
                new ShipperResponse(customer.getId(), customer.getFullName(), customer.getEmail(), customer.getPhone(), customer.getCreatedAt())).toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/internal/shippers")
    public ResponseEntity<?> getShipperByEmail(@RequestParam String email) {
        Shipper shipper = shipperService.getShipperByEmail(email);
        OwnerIdResponse response = new OwnerIdResponse();
        response.setOwnerId(shipper.getId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/internal/shippers/{id}")
    public ResponseEntity<?> getShipperByIdLike(@PathVariable Long id) {
        List<ShipperResponse> list = shipperService.getShipperByIdLike(id);
        return ResponseEntity.ok(list);
    }

    @DeleteMapping("/internal/shippers/{id}")
    public ResponseEntity<?> deleteCustomer(@PathVariable Long id) {
        shipperService.deleteShipper(id);
        return ResponseEntity.noContent().build();
    }


}
