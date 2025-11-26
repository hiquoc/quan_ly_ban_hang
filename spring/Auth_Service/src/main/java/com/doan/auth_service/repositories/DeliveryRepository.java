package com.doan.auth_service.repositories;

import com.doan.auth_service.dtos.Staff.OwnerIdResponse;
import com.doan.auth_service.dtos.Staff.StaffRequest;
import com.doan.auth_service.dtos.Staff.StaffResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@FeignClient(
    name = "delivery-service")
public interface DeliveryRepository {

    @PostMapping("/internal/shippers")
    ResponseEntity<OwnerIdResponse> createShipper(@RequestBody StaffRequest request);

    @GetMapping("/internal/shippers")
    ResponseEntity<OwnerIdResponse> getShipperIdByEmail(@RequestParam("email") String email);

    @DeleteMapping("/internal/shippers/{id}")
    void deleteShipper(@PathVariable("id") Long id);

    @GetMapping("/internal/shippers/{id}")
    ResponseEntity<List<StaffResponse>> getShipperByIdLike(@PathVariable Long id);

    @GetMapping("/internal/shippers/ids")
    ResponseEntity<List<StaffResponse>> getShipperByIds(@RequestParam List<Long> ids);

    @GetMapping("/internal/shippers/keyword")
    ResponseEntity<List<StaffResponse>> getShipperByKeyword(@RequestParam String keyword,
                                                  @RequestParam String type,
                                                  @RequestParam Integer page,
                                                  @RequestParam Integer size);

    @PostMapping("/internal/shippers/{id}/active")
    void changeShipperActive(@PathVariable Long id);
}
