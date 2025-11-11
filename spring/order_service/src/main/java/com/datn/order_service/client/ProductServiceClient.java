package com.datn.order_service.client;

import com.datn.order_service.client.dto.VariantDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@FeignClient(name = "product-service")
public interface ProductServiceClient {

    @GetMapping("/internal/variants/{id}/active")
    ResponseEntity<VariantDTO> getVariant(@PathVariable("id") Long id);

    @PostMapping("/internal/variants/{id}/sold")
    void updateVariantSold(
            @PathVariable Long id,
            @RequestParam int num
    );
}