package com.doan.auth_service.repositories;

import com.doan.auth_service.dtos.Staff.OwnerIdResponse;
import com.doan.auth_service.dtos.Staff.StaffRequest;
import com.doan.auth_service.dtos.Staff.StaffResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@FeignClient(
    name = "delivery-service",
    path = "/internal/shippers"
)
public interface DeliveryRepository {

    @PostMapping
    ResponseEntity<OwnerIdResponse> createShipper(@RequestBody StaffRequest request);

    @GetMapping("")
    ResponseEntity<OwnerIdResponse> getShipperIdByEmail(@RequestParam("email") String email);

    @DeleteMapping("/{id}")
    void deleteShipper(@PathVariable("id") Long id);

    @GetMapping("/{id}")
    ResponseEntity<List<StaffResponse>> getShipperByIdLike(@PathVariable Long id);

    @GetMapping("/ids")
    ResponseEntity<List<StaffResponse>> getShipperByIds(@RequestParam List<Long> ids);

    @GetMapping("/keyword")
    ResponseEntity<List<StaffResponse>> getShipperByKeyword(@RequestParam String keyword,
                                                  @RequestParam String type,
                                                  @RequestParam Integer page,
                                                  @RequestParam Integer size);
}
