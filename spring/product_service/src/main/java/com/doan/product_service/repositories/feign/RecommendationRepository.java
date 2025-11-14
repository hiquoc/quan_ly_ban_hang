package com.doan.product_service.repositories.feign;

import com.doan.product_service.dtos.inventory.InventoryResponseForVariant;
import com.doan.product_service.dtos.rec.RecRequest;
import com.doan.product_service.dtos.rec.RecResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@FeignClient(
    name = "rec-service"
)
public interface RecommendationRepository {
    @PostMapping("/recommendations")
    RecResponse getRecommendations(@RequestBody RecRequest request);

    @PostMapping("/rebuild")
    void rebuildRecommendations();
}