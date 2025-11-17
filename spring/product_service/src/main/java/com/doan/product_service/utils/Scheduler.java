package com.doan.product_service.utils;

import com.doan.product_service.services.ProductService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class Scheduler {
    private final ProductService productService;

    public Scheduler (ProductService productService){
        this.productService=productService;
    }
    @Scheduled(cron = "0 0 2 * * ?")
    public void rebuildRecommendations(){
        try{
            productService.rebuildRecommendations();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
