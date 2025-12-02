package com.doan.product_service.utils;

import com.doan.product_service.models.PendingAction;
import com.doan.product_service.repositories.PendingActionRepository;
import com.doan.product_service.services.ProductService;
import com.doan.product_service.services.cloud.CloudinaryService;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

@Component
@Slf4j
@AllArgsConstructor
public class Scheduler {
    private final ProductService productService;
    private final PendingActionRepository pendingActionRepository;
    private final CloudinaryService cloudinaryService;

    @Scheduled(cron = "0 0 2 * * ?", zone = "Asia/Ho_Chi_Minh")
    public void rebuildRecommendations() {
        try {
            productService.rebuildRecommendations();
        } catch (Exception e) {
            log.error("Failed to rebuild recommendations", e);
        }
    }

    @Scheduled(fixedRate = 60 * 60 *1800)
    public void cleanupPendingImages() {
        Instant cutoff = Instant.now().minusSeconds(1800);

        List<PendingAction> pendingImages = pendingActionRepository
                .findByTimestampBefore(cutoff);
        if(pendingImages.isEmpty()) return;
        try {
            cloudinaryService.deleteMultipleFiles(pendingImages.stream().map(PendingAction::getImageUrl).toList());
            pendingActionRepository.deleteAll(pendingImages);
        } catch (Exception e) {
            log.error("Failed to cleanup pending image", e);
        }

    }
}
