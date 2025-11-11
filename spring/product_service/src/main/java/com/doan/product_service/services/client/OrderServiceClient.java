package com.doan.product_service.services.client;

import com.doan.product_service.dtos.inventory.InventoryResponseForVariant;
import com.doan.product_service.dtos.order.OrderDetailResponse;
import com.doan.product_service.repositories.feign.InventoryRepository;
import com.doan.product_service.repositories.feign.OrderRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class OrderServiceClient {

    private final OrderRepository orderRepository;
    private final ObjectMapper mapper = new ObjectMapper();

    public OrderDetailResponse getOrder(Long orderId) {
        try {
            return Objects.requireNonNull(orderRepository.getOrder(orderId).getBody()).getData();
        } catch (FeignException ex) {
            throw parseFeignException(ex);
        }
    }

    private ResponseStatusException parseFeignException(FeignException ex) {
        HttpStatus status = HttpStatus.resolve(ex.status());
        if (status == null) status = HttpStatus.INTERNAL_SERVER_ERROR;

        String errorMessage = "Lỗi không xác định";

        try {
            String body = ex.contentUTF8();
            if (body != null && !body.isEmpty()) {
                JsonNode node = mapper.readTree(body);
                if (node.has("message")) {
                    errorMessage = node.get("message").asText();
                } else {
                    errorMessage = node.toString();
                }
            } else {
                errorMessage = ex.getMessage();
            }
        } catch (Exception parseEx) {
            errorMessage = ex.getMessage();
        }

        System.err.println("Feign Error [Status " + ex.status() + "]: " + errorMessage);
        return new ResponseStatusException(status, errorMessage);
    }

}