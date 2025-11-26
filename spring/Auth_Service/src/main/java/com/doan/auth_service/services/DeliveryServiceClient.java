package com.doan.auth_service.services;

import com.doan.auth_service.dtos.Staff.OwnerIdResponse;
import com.doan.auth_service.dtos.Staff.StaffRequest;
import com.doan.auth_service.dtos.Staff.StaffResponse;
import com.doan.auth_service.repositories.DeliveryRepository;
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
public class DeliveryServiceClient {

    private final DeliveryRepository deliveryRepository;
    private final ObjectMapper mapper = new ObjectMapper();

    public OwnerIdResponse createShipper(StaffRequest request) {
        try {
            return deliveryRepository.createShipper(request).getBody();
        } catch (FeignException ex) {
            throw parseFeignException(ex);
        }
    }

    public OwnerIdResponse getShipperIdByEmail(String email) {
        try {
            return deliveryRepository.getShipperIdByEmail(email).getBody();
        } catch (FeignException ex) {
            throw parseFeignException(ex);
        }
    }

    public void deleteShipper(Long id) {
        try {
            deliveryRepository.deleteShipper(id);
        } catch (FeignException ex) {
            throw parseFeignException(ex);
        }
    }
    public List<StaffResponse> getShipperByIdLike(Long id) {
        try {
            return deliveryRepository.getShipperByIdLike(id).getBody();

        } catch (FeignException ex) {
            throw parseFeignException(ex);
        }
    }
    public List<StaffResponse> getShipperByIds(List<Long> ids) {
        try {
            return deliveryRepository.getShipperByIds(ids).getBody();

        } catch (FeignException ex) {
            throw parseFeignException(ex);
        }
    }
    public List<StaffResponse> getShipperByKeyword(String keyword, String type, int page, int size) {
        try {
            return deliveryRepository.getShipperByKeyword(keyword, type, page, size).getBody();
        } catch (FeignException ex) {
            throw parseFeignException(ex);
        }
    }
    public void changeShipperActive(Long shipperId) {
        try {
            deliveryRepository.changeShipperActive(shipperId);
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
            JsonNode node = mapper.readTree(body);
            errorMessage = node.path("message").asText(errorMessage);
        } catch (Exception ignored) {}

        System.out.println("Feign Error: " + status + " - " + errorMessage);
        return new ResponseStatusException(status, errorMessage);
    }

}
