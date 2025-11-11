package com.doan.inventory_service.services.clients;

import com.doan.inventory_service.dtos.ApiResponse;
import com.doan.inventory_service.dtos.productVariant.VariantResponse;
import com.doan.inventory_service.repositories.feign.ProductVariantRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductServiceClient {

    private final ProductVariantRepository productVariantRepository;
    private final ObjectMapper mapper = new ObjectMapper();

    public VariantResponse getProductVariantFromInternal(Long id) {
        try {
            ResponseEntity<ApiResponse<VariantResponse>> response = productVariantRepository.getProductVariantFromInternal(id);
            ApiResponse<VariantResponse> apiResponse = response.getBody();
            if (apiResponse != null && apiResponse.getData() != null) {
                return apiResponse.getData();
            } else {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy biến thể!");
            }
        } catch (FeignException ex) {
            throw parseFeignException(ex);
        }
    }


    public void changeProductVariantStatus(Long id, String status) {
        try {
            productVariantRepository.changeProductVariantStatus(id,status);
        } catch (FeignException ex) {
            throw parseFeignException(ex);
        }
    }

    public void updateVariantImportPrice(Long id,int oldQuantity,int newQuantity, BigDecimal importPrice) {
        try {
            productVariantRepository.updateVariantImportPrice(id, oldQuantity, newQuantity,importPrice);
        } catch (FeignException ex) {
            throw parseFeignException(ex);
        }
    }

    public List<Long> searchVariantIds(String code) {
        try {
            return productVariantRepository.searchVariantIds(code);

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

//        System.out.println("=== Feign Exception Start ===");
//        System.out.println("HTTP Status: " + status);
//        System.out.println("Message: " + errorMessage);
//        System.out.println("Response Body: " + responseBody);
//        ex.printStackTrace(); // full Feign stack trace
//        System.out.println("=== Feign Exception End ===");

        return new ResponseStatusException(status, errorMessage);
    }

}