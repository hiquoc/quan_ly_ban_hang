package com.doan.auth_service.services;

import com.doan.auth_service.dtos.Staff.OwnerIdResponse;
import com.doan.auth_service.dtos.Staff.StaffRequest;
import com.doan.auth_service.dtos.Staff.StaffResponse;
import com.doan.auth_service.repositories.StaffRepository;
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
public class StaffServiceClient {

    private final StaffRepository staffRepository;
    private final ObjectMapper mapper = new ObjectMapper();

    public OwnerIdResponse createStaff(StaffRequest request) {
        try {
            return staffRepository.createStaff(request).getBody();
        } catch (FeignException ex) {
            throw parseFeignException(ex);
        }
    }

    public OwnerIdResponse getStaffIdByEmail(String email) {
        try {
            return staffRepository.getStaffIdByEmail(email).getBody();
        } catch (FeignException ex) {
            throw parseFeignException(ex);
        }
    }

    public void deleteStaff(Long id) {
        try {
            staffRepository.deleteStaff(id);
        } catch (FeignException ex) {
            throw parseFeignException(ex);
        }
    }
    public List<StaffResponse> getStaffByIdLike(Long id) {
        try {
            return staffRepository.getStaffByIdLike(id).getBody();

        } catch (FeignException ex) {
            throw parseFeignException(ex);
        }
    }
    public List<StaffResponse> getStaffByIds(List<Long> ids) {
        try {
            return staffRepository.getStaffByIds(ids).getBody();

        } catch (FeignException ex) {
            throw parseFeignException(ex);
        }
    }
    public List<StaffResponse> getStaffByKeyword(String keyword, String type, int page, int size) {
        try {
            return staffRepository.getStaffByKeyword(keyword, type, page, size).getBody();
        } catch (FeignException ex) {
            throw parseFeignException(ex);
        }
    }
    public void changeStaffActive(Long staffId) {
        try {
            staffRepository.changeStaffActive(staffId);
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
