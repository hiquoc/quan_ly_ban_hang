package com.doan.customer_service.services;

import com.doan.customer_service.dtos.CustomerDashboardResponse;
import com.doan.customer_service.repositories.CustomerRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Service
@AllArgsConstructor
public class DashboardService {
    private final CustomerRepository customerRepository;

    public CustomerDashboardResponse getDashboard(LocalDateTime from, LocalDateTime to){
        List<Object[]> result = customerRepository.getCustomerSummary(from, to);
        Object[] summary = result.isEmpty() ? new Object[]{0L} : result.getFirst();
        if (summary == null) {
            summary = new Object[]{0L};
        }

        long totalCustomers = ((Number) summary[0]).longValue();

        long days = Duration.between(from.toLocalDate().atStartOfDay(), to.toLocalDate().atStartOfDay()).toDays() + 1;
        LocalDateTime prevFrom = from.minusDays(days);
        LocalDateTime prevTo   = to.minusDays(days);

        List<Object[]> preResult = customerRepository.getCustomerSummary(prevFrom, prevTo);
        Object[] preSummary = preResult.isEmpty() ? new Object[]{0L} : preResult.getFirst();
        if (preSummary == null) {
            preSummary = new Object[]{0L};
        }
        long prevTotalCustomers = ((Number) preSummary[0]).longValue();
        return new CustomerDashboardResponse(totalCustomers,prevTotalCustomers);
    }
}
