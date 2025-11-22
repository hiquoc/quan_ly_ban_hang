package com.doan.inventory_service.services.clients;

import com.doan.inventory_service.dtos.order.UpdateOrderStatusFromInvRequest;
import com.doan.inventory_service.repositories.feign.OrderRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class OrderServiceClient {

    private final OrderRepository orderRepository;
    private final ObjectMapper mapper = new ObjectMapper();

    public void updateOrderStatus(UpdateOrderStatusFromInvRequest request) {
        try {
            orderRepository.updateOrderStatus(request);
        } catch (FeignException ex) {
            throw parseFeignException(ex);
        }
    }

    private ResponseStatusException parseFeignException(FeignException ex) {
        HttpStatus status = HttpStatus.resolve(ex.status());
        if (status == null) status = HttpStatus.INTERNAL_SERVER_ERROR;

        String errorMessage = "Lỗi không xác định";
        String responseBody = null;

        try {
            responseBody = ex.contentUTF8();
            JsonNode node = mapper.readTree(responseBody);
            errorMessage = node.path("message").asText(errorMessage);
        } catch (Exception e) {
            System.out.println("Failed to parse Feign error body: " + e.getMessage());
        }

        System.out.println("=== Feign Exception Start ===");
        System.out.println("HTTP Status: " + status);
        System.out.println("Message: " + errorMessage);
        System.out.println("Response Body: " + responseBody);
        ex.printStackTrace(); // full Feign stack trace
        System.out.println("=== Feign Exception End ===");

        return new ResponseStatusException(status, errorMessage);
    }

}