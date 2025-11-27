package com.doan.auth_service.repositories;

import com.doan.auth_service.dtos.Staff.OwnerIdResponse;
import com.doan.auth_service.dtos.Staff.StaffRequest;
import com.doan.auth_service.dtos.Staff.StaffResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@FeignClient(
    name = "staff-service",
    path = "/internal/staffs"
)
public interface StaffRepository {

    @PostMapping
    ResponseEntity<OwnerIdResponse> createStaff(@RequestBody StaffRequest request);

    @GetMapping("")
    ResponseEntity<OwnerIdResponse> getStaffIdByEmail(@RequestParam("email") String email);

    @DeleteMapping("/{id}")
    ResponseEntity<Void> deleteStaff(@PathVariable("id") Long id);

    @GetMapping("/{id}")
    ResponseEntity<List<StaffResponse>> getStaffByIdLike(@PathVariable Long id);

    @GetMapping("/ids")
    ResponseEntity<List<StaffResponse>> getStaffByIds(@RequestParam List<Long> ids);

    @GetMapping("/keyword")
    ResponseEntity<List<StaffResponse>> getStaffByKeyword(@RequestParam String keyword,
                                                  @RequestParam String type,
                                                  @RequestParam Integer page,
                                                  @RequestParam Integer size);

    @PostMapping("/{id}/active")
    void changeStaffActive(@PathVariable Long id);

    @GetMapping("/{id}/email")
    String getStaffEmail(@PathVariable Long id);
}
