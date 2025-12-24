package com.doan.auth_service.repositories;

import com.doan.auth_service.dtos.Staff.OwnerIdResponse;
import com.doan.auth_service.dtos.Staff.StaffRequest;
import com.doan.auth_service.dtos.Staff.StaffResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@FeignClient(
    name = "order-service")
public interface OrderRepository {

    @GetMapping("/internal/customer/{customerId}")
    boolean checkPendingOrder(@PathVariable Long customerId);
}
