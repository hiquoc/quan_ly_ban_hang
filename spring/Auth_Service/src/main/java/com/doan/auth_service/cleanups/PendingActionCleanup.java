package com.doan.auth_service.cleanups;

import com.doan.auth_service.models.PendingAction;
import com.doan.auth_service.models.VerificationCode;
import com.doan.auth_service.repositories.PendingActionRepository;
import com.doan.auth_service.repositories.VerificationCodeRepository;
import com.doan.auth_service.services.CustomerServiceClient;
import com.doan.auth_service.services.DeliveryServiceClient;
import com.doan.auth_service.services.StaffServiceClient;
import lombok.AllArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

@Component
@AllArgsConstructor
public class PendingActionCleanup {

    private final PendingActionRepository repository;
    private final CustomerServiceClient customerServiceClient;
    private final StaffServiceClient staffServiceClient;
    private final DeliveryServiceClient deliveryServiceClient;
    private final VerificationCodeRepository verificationCodeRepository;

    private final AtomicBoolean retryRunning = new AtomicBoolean(false);
    private final AtomicBoolean cleanupRunning = new AtomicBoolean(false);

    @Scheduled(fixedDelay = 300000)
    public void retryPendingActions() {
        if (!retryRunning.compareAndSet(false, true)) return;

        try {
            List<PendingAction> pending =
                    repository.findTop50ByStatusOrderByLastAttemptAtAsc("PENDING");

            for (PendingAction action : pending) {
                try {
                    executeExternalAction(action);
                    deletePendingAction(action.getId());
                } catch (Exception e) {
                    markRetry(action.getId());
                    System.out.println("Retry failed for " + action.getService()
                            + " id=" + action.getEntityId());
                }
            }
        } finally {
            retryRunning.set(false);
        }
    }

    private void executeExternalAction(PendingAction action) {
        if (!"DELETE".equals(action.getActionType())) return;

        switch (action.getService()) {
            case "CUSTOMER_SERVICE" ->
                    customerServiceClient.deleteCustomer(action.getEntityId());
            case "STAFF_SERVICE" ->
                    staffServiceClient.deleteStaff(action.getEntityId());
            case "DELIVERY_SERVICE" ->
                    deliveryServiceClient.deleteShipper(action.getEntityId());
        }
    }

    @Transactional(timeout = 5)
    public void deletePendingAction(Long id) {
        repository.deleteById(id);
    }

    @Transactional(timeout = 5)
    public void markRetry(Long id) {
        repository.updateLastAttemptAt(id, LocalDateTime.now());
    }


    @Scheduled(fixedDelay = 300000)
    public void removeExpiredCodes() {
        if (!cleanupRunning.compareAndSet(false, true)) return;

        try {
            List<VerificationCode> expiredCodes =
                    verificationCodeRepository.findTop100ByExpiryTimeBefore(
                            LocalDateTime.now());

            if (!expiredCodes.isEmpty()) {
                verificationCodeRepository.deleteAll(expiredCodes);
                System.out.println("Deleted " + expiredCodes.size()
                        + " expired verification codes");
            }
        } finally {
            cleanupRunning.set(false);
        }
    }
}
