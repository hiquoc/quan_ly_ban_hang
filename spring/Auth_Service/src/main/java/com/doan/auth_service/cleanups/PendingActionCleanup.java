package com.doan.auth_service.cleanups;

import com.doan.auth_service.models.PendingAction;
import com.doan.auth_service.repositories.PendingActionRepository;
import com.doan.auth_service.services.CustomerServiceClient;
import com.doan.auth_service.services.StaffServiceClient;
import lombok.AllArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@AllArgsConstructor
public class PendingActionCleanup {

    private final PendingActionRepository repository;
    private final CustomerServiceClient customerServiceClient;
    private final StaffServiceClient staffServiceClient;

    @Scheduled(fixedRate = 300000) // every 5m
    public void retryPendingActions() {
        List<PendingAction> pending = repository.findByStatus("PENDING");
        for (PendingAction action : pending) {
            try {
                if ("DELETE".equals(action.getActionType())) {
                    if ("CUSTOMER_SERVICE".equals(action.getService())) {
                        customerServiceClient.deleteCustomer(action.getEntityId());
                    } else if ("STAFF_SERVICE".equals(action.getService())) {
                        staffServiceClient.deleteStaff(action.getEntityId());
                    }
                }
                //add more


                repository.delete(action); // remove completed actions from DB
            } catch (Exception e) {
                action.setLastAttemptAt(LocalDateTime.now());
                repository.save(action); // keep it for retry
                System.out.println("Retry failed for " + action.getService() + " id=" + action.getEntityId());
            }
        }
    }
}


