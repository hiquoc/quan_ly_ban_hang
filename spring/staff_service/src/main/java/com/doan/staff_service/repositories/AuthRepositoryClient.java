package com.doan.staff_service.repositories;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@FeignClient(
        name = "auth-service",
        path = ""
)
public interface AuthRepositoryClient {
    @PostMapping("/internal/accounts/{ownerId}/{roleId}/active")
    void changeAccountActive(@PathVariable Long ownerId,@PathVariable Long roleId);

    @PostMapping("/internal/staff/{staffId}/role/{roleId}")
    void changeStaffRole(@PathVariable Long staffId, @PathVariable Long roleId);

    @GetMapping("/internal/staffs")
    Map<Long,String> getStaffsRole(@RequestParam List<Long> staffIds);
}