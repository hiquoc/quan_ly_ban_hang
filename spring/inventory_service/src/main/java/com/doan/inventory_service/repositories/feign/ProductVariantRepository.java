package com.doan.inventory_service.repositories.feign;

import com.doan.inventory_service.dtos.ApiResponse;
import com.doan.inventory_service.dtos.productVariant.VariantResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@FeignClient(
    name = "product-service",
    path = "/internal/variants"
)
public interface ProductVariantRepository {

    @GetMapping("/{id}")
    ResponseEntity<ApiResponse<VariantResponse>> getProductVariantFromInternal(@PathVariable("id") Long id);

    @PostMapping("/status/{id}")
    void changeProductVariantStatus(@PathVariable("id") Long id,@RequestParam(name = "status") String status);

    @PostMapping("/{id}/importPrice")
    void updateVariantImportPrice(@PathVariable Long id, @RequestParam BigDecimal importPrice);

    @GetMapping("/search")
    List<Long> searchVariantIds(@RequestParam("code") String code);
}