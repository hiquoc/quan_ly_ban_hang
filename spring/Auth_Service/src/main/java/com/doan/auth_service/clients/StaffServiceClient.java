package com.doan.auth_service.clients;

import com.doan.auth_service.dtos.Staff.StaffRequest;
import com.doan.auth_service.dtos.Staff.OwnerIdResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

@Service
@AllArgsConstructor
public class StaffServiceClient {
    private final RestTemplate restTemplate;

    public OwnerIdResponse createStaff(StaffRequest request) {
        String url = "http://localhost:8082/internal/staffs";
        try {
            OwnerIdResponse response = restTemplate.postForObject(url, request, OwnerIdResponse.class);

            if (response == null || response.getOwnerId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to create staff");
            }
            return response;

        } catch (HttpClientErrorException | HttpServerErrorException ex) {
            HttpStatus status = (HttpStatus) ex.getStatusCode();
            String responseBody = ex.getResponseBodyAsString();

            System.out.println("Error status: " + status);
            System.out.println("Error body: " + responseBody);

            String errorMessage = "Unknown error";
            try {
                ObjectMapper mapper = new ObjectMapper();
                JsonNode node = mapper.readTree(responseBody);
                errorMessage = node.path("message").asText(errorMessage);
            } catch (Exception ignored) {
            }

            throw new ResponseStatusException(status, errorMessage);

        } catch (ResourceAccessException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "User service unavailable");
        }
    }
    public OwnerIdResponse getStaffIdByEmail(String email) {
        String url = UriComponentsBuilder
                .fromUriString("http://localhost:8082/internal/users")
                .queryParam("email", email)
                .toUriString();  // automatically encodes email
        try {
            OwnerIdResponse response = restTemplate.getForObject(url, OwnerIdResponse.class);
            if (response == null || response.getOwnerId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "Failed to find user with email: " + email);
            }
            return response;

        } catch (HttpClientErrorException | HttpServerErrorException ex) {
            HttpStatus status = (HttpStatus) ex.getStatusCode();
            String responseBody = ex.getResponseBodyAsString();

            String errorMessage = "Unknown error";
            try {
                ObjectMapper mapper = new ObjectMapper();
                JsonNode node = mapper.readTree(responseBody);
                errorMessage = node.path("message").asText(errorMessage);
            } catch (Exception ignored) {
            }

            throw new ResponseStatusException(status, errorMessage);

        } catch (ResourceAccessException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Staff service unavailable");
        }
    }
    public void deleteStaff(Long id) {
        String url = "http://localhost:8082/internal/staffs/{id}";
        try {
            restTemplate.exchange(
                    url,
                    HttpMethod.DELETE,
                    null,
                    Void.class,
                    id
            );
            System.out.println("Staff deleted successfully.");

        } catch (HttpClientErrorException | HttpServerErrorException ex) {
            HttpStatus status = (HttpStatus) ex.getStatusCode();
            String responseBody = ex.getResponseBodyAsString();

            System.out.println("Error status: " + status);
            System.out.println("Error body: " + responseBody);

            String errorMessage = "Unknown error";
            try {
                ObjectMapper mapper = new ObjectMapper();
                JsonNode node = mapper.readTree(responseBody);
                errorMessage = node.path("message").asText(errorMessage);
            } catch (Exception ignored) {
            }

            throw new ResponseStatusException(status, errorMessage);

        } catch (ResourceAccessException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Staff service unavailable");
        }
    }
}
