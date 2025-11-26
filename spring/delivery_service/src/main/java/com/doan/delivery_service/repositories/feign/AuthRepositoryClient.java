package com.doan.delivery_service.repositories.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;

@FeignClient(
        name = "auth-service",
        path = "/internal/accounts"
)
public interface AuthRepositoryClient {
    @PostMapping("/{ownerId}/{roleId}/active")
    void changeAccountActive(@PathVariable Long ownerId,@PathVariable Long roleId);
}