package com.doan.customer_service.controllers;

import com.doan.customer_service.dtos.*;
import com.doan.customer_service.models.Address;
import com.doan.customer_service.models.Customer;
import com.doan.customer_service.services.AddressService;
import com.doan.customer_service.services.CustomerService;
import com.doan.customer_service.utils.JwtUtil;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@RestController
@RequestMapping("") // Keep empty
@AllArgsConstructor
public class CustomerController {

    private final CustomerService customerService;
    private final AddressService addressService;
    private final JwtUtil jwtUtil;

    @PostMapping("/internal/customers")
    public ResponseEntity<?> createCustomer(@RequestBody CustomerRequest customerRequest) {
        try {
            customerService.checkRegisterRequest(customerRequest);
            Customer customer = customerService.createCustomer(customerRequest);

            OwnerIdResponse response = new OwnerIdResponse();
            response.setOwnerId(customer.getId());
            return ResponseEntity.ok(response);

        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('CUSTOMER')")
    @GetMapping("/secure/customers/{id}")
    public ResponseEntity<?> getCustomerDetails(@PathVariable Long id,
                                                @RequestHeader("X-Owner-Id") Long tokenCustomerId,
                                                @RequestHeader("X-User-Role") String tokenRole) {
        try {
            if (!Objects.equals(tokenCustomerId, id) && "CUSTOMER".equals(tokenRole)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền truy cập!");
            }
            Customer customer = customerService.getCustomerById(id);
            CustomerDetailsResponse response = new CustomerDetailsResponse(
                    customer.getId(),
                    customer.getFullName(),
                    customer.getEmail(),
                    customer.getPhone(),
                    customer.getDateOfBirth(),
                    customer.getGender(),
                    customer.getSegment() != null ? customer.getSegment().getName() : null,
                    customer.getTotalSpent(),
                    customer.getTotalOrders(),
                    customer.getLastOrderDate(),
                    customer.getPreferences(),
                    customer.getTags(),
                    customer.getCreatedAt(),
                    customer.getUpdatedAt(),
                    customer.getAddresses()
            );

            return ResponseEntity.ok(new ApiResponse<>("Lấy thông tin khách hàng thành công!", true, response));

        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @GetMapping("/secure/customers")
    public List<CustomerResponse> getAllCustomers() {
        return customerService.getAllCustomers().stream()
                .map(user -> new CustomerResponse(
                        user.getId(),
                        user.getFullName(),
                        user.getEmail(),
                        user.getPhone(),
                        user.getCreatedAt()
                ))
                .collect(Collectors.toList());
    }

    @GetMapping("/internal/customers")
    public ResponseEntity<?> getCustomerIdByEmail(@RequestParam String email) {
        try {
            Customer customer = customerService.getCustomerByEmail(email);
            OwnerIdResponse response = new OwnerIdResponse();
            response.setOwnerId(customer.getId());
            return ResponseEntity.ok(response);
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PutMapping("/secure/customers")
    public ResponseEntity<?> updateCustomer(@RequestBody CustomerRequest request,
                                            @RequestHeader("X-Owner-Id") Long tokenCustomerId) {
        try {
            customerService.updateCustomer(tokenCustomerId, request);
            return ResponseEntity.noContent().build();
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @DeleteMapping("/internal/customers/{id}")
    public ResponseEntity<?> deleteCustomer(@PathVariable Long id) {
        try {
            customerService.deleteCustomer(id);
            return ResponseEntity.noContent().build();
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PostMapping("/secure/customers/addresses")
    public ResponseEntity<?> createAddress(@Valid @RequestBody AddressRequest request,
                                           @RequestHeader("X-Owner-Id") Long tokenCustomerId) {
        try {
            request.setCustomerId(tokenCustomerId);
            Address address = addressService.createAddress(request);
            return ResponseEntity.ok(new ApiResponse<>("Thêm địa chỉ thành công", true, address.getId()));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @GetMapping("/secure/customers/addresses")
    public ResponseEntity<?> getAllAddressesOfACustomer(@RequestHeader("X-Owner-Id") Long tokenCustomerId) {
        try {
            List<Address> addressList = addressService.getAllAddressesOfACustomer(tokenCustomerId);
            return ResponseEntity.ok(new ApiResponse<>("Lấy danh sách địa chỉ thành công", true, addressList));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @GetMapping("/secure/customers/addresses/{id}")
    public ResponseEntity<?> getAddress(@PathVariable Long id,
                                        @RequestHeader("X-Owner-Id") Long tokenCustomerId,
                                        @RequestHeader("X-User-Role") String tokenRole) {
        try {
            Address address = addressService.getAddress(id);
            if (!Objects.equals(address.getCustomer().getId(), tokenCustomerId) && "CUSTOMER".equals(tokenRole)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền lấy dữ liệu!");
            }
            return ResponseEntity.ok(new ApiResponse<>("Lấy địa chỉ thành công", true, address));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PutMapping("/secure/customers/addresses/{id}")
    public ResponseEntity<?> updateAddress(@PathVariable Long id,
                                           @RequestBody AddressRequest request,
                                           @RequestHeader("X-Owner-Id") Long tokenCustomerId) {
        try {
            addressService.updateAddress(id, request, tokenCustomerId);
            return ResponseEntity.ok(new ApiResponse<>("Cập nhật địa chỉ thành công", true, null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PatchMapping("/secure/customers/addresses/{id}")
    public ResponseEntity<?> changeMainAddress(@PathVariable Long id,
                                               @RequestHeader("X-Owner-Id") Long tokenCustomerId) {
        try {
            addressService.changeMainAddress(id, tokenCustomerId);
            return ResponseEntity.ok(new ApiResponse<>("Đặt địa chỉ mặc định thành công", true, null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @DeleteMapping("/secure/customers/addresses/{id}")
    public ResponseEntity<?> deleteAddress(@PathVariable Long id,
                                           @RequestHeader("X-Owner-Id") Long tokenCustomerId) {
        try {
            addressService.deleteAddress(id, tokenCustomerId);
            return ResponseEntity.ok(new ApiResponse<>("Xóa địa chỉ thành công", true, null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }


    private ResponseEntity<Map<String, Object>> errorResponse(ResponseStatusException ex) {
        Map<String, Object> error = new HashMap<>();
        error.put("message", ex.getReason());
        error.put("success", false);
        return ResponseEntity.status(ex.getStatusCode()).body(error);
    }
}
