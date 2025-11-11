package com.doan.product_service.services;

import com.doan.product_service.repositories.ProductRepository;
import com.doan.product_service.repositories.ProductVariantRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@AllArgsConstructor
public class ProductDashboardService {
    private final ProductRepository productRepository;
    private final ProductVariantRepository variantRepository;

    public Object getDashboard(LocalDateTime from, LocalDateTime to){
        Object topProduct=productRepository.getTopProducts(5);
        Object getTopVariant=variantRepository.getTopVariants(5);
        return null;
    }
}
