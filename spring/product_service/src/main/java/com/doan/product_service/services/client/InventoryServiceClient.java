package com.doan.product_service.services.client;

import com.doan.product_service.dtos.inventory.InventoryResponseForVariant;
import com.doan.product_service.repositories.feign.InventoryRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class InventoryServiceClient {

    private final InventoryRepository inventoryRepository;
    private final ObjectMapper mapper = new ObjectMapper();

    public List<InventoryResponseForVariant> getProductVariantFromInternal(List<Long> variantIds) {
        try {
            return inventoryRepository.getInventoriesFromVariantIds(variantIds).getBody();
        } catch (FeignException ex) {
            throw parseFeignException(ex);
        }
    }
    public Boolean checkPurchaseOrderByVariantId(Long variantId) {
        try {
            return inventoryRepository.checkPurchaseOrderByVariantId(variantId).getBody();
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