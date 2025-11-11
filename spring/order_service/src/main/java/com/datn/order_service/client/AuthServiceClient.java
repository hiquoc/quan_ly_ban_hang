package com.datn.order_service.client;

import com.datn.order_service.dto.response.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "auth-service")
public interface AuthServiceClient {

    @GetMapping("/internal/accounts/{id}/isVerified")
    ResponseEntity<Boolean> checkAccountIsVerified(@PathVariable Long id);
}