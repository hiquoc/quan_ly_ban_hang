package com.datn.promotion_service.repository.feign;

import com.datn.promotion_service.dto.response.BrandResponse;
import com.datn.promotion_service.dto.response.CategoryResponse;
import com.datn.promotion_service.dto.response.ProductResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@FeignClient(
    name = "product-service",
    path = "/internal"
)
public interface ProductClientRepository {
    @GetMapping("/products")
     List<ProductResponse> getProductsByIds(@RequestParam List<Long> ids);

    @GetMapping("/brands")
     List<BrandResponse> getBrandsByIds(@RequestParam List<Long> ids);

    @GetMapping("/categories")
     List<CategoryResponse> getCategoriesByIds(@RequestParam List<Long> ids);
}