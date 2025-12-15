package com.doan.product_service.utils;

import com.doan.product_service.models.PendingAction;
import com.doan.product_service.repositories.PendingActionRepository;
import com.doan.product_service.services.ProductService;
import com.doan.product_service.services.cloud.CloudinaryService;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

@Component
@Slf4j
@AllArgsConstructor
public class Scheduler {

    private final ProductService productService;
    private final PendingActionRepository pendingActionRepository;
    private final CloudinaryService cloudinaryService;

    private final AtomicBoolean rebuildRunning = new AtomicBoolean(false);
    private final AtomicBoolean cleanupRunning = new AtomicBoolean(false);

    @Scheduled(cron = "0 0 2 * * ?", zone = "Asia/Ho_Chi_Minh")
    public void rebuildRecommendations() {
        if (!rebuildRunning.compareAndSet(false, true)) return;

        try {
            productService.rebuildRecommendations();
        } catch (Exception e) {
            log.error("Failed to rebuild recommendations", e);
        } finally {
            rebuildRunning.set(false);
        }
    }

    @Scheduled(fixedDelay = 60 * 60 * 1000)
    public void cleanupPendingImages() {
        if (!cleanupRunning.compareAndSet(false, true)) return;

        try {
            Instant cutoff = Instant.now().minusSeconds(1800);

            List<PendingAction> pendingImages =
                    pendingActionRepository.findTop50ByTimestampBeforeOrderByTimestampAsc(cutoff);

            if (pendingImages.isEmpty()) return;

            cloudinaryService.deleteMultipleFiles(
                    pendingImages.stream()
                            .map(PendingAction::getImageUrl)
                            .toList()
            );

            deletePendingImages(pendingImages);
        } catch (Exception e) {
            log.error("Failed to cleanup pending image", e);
        } finally {
            cleanupRunning.set(false);
        }
    }

    @Transactional(timeout = 5)
    public void deletePendingImages(List<PendingAction> actions) {
        pendingActionRepository.deleteAll(actions);
    }
}

