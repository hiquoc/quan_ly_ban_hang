package com.doan.auth_service.controllers;

import com.doan.auth_service.dtos.Account.AccountResponse;
import com.doan.auth_service.dtos.Account.ChangePasswordRequest;
import com.doan.auth_service.dtos.ApiResponse;
import com.doan.auth_service.dtos.Login.LoginRequest;
import com.doan.auth_service.dtos.Login.LoginResponse;
import com.doan.auth_service.dtos.Login.RegisterRequest;
import com.doan.auth_service.models.Account;
import com.doan.auth_service.repositories.DeliveryRepository;
import com.doan.auth_service.repositories.PendingActionRepository;
import com.doan.auth_service.repositories.VerificationCodeRepository;
import com.doan.auth_service.services.AccountService;
import com.doan.auth_service.services.CustomerServiceClient;
import com.doan.auth_service.services.RoleService;
import com.doan.auth_service.services.StaffServiceClient;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;


@RestController
@RequestMapping("")
@AllArgsConstructor
public class AuthController {
    private final AccountService accountService;
    private final RoleService roleService;
    private final PendingActionRepository pendingActionRepository;
    private final StaffServiceClient staffServiceClient;
    private final CustomerServiceClient customerServiceClient;
    private final VerificationCodeRepository verificationCodeRepository;
    private final DeliveryRepository deliveryRepository;

    @PostMapping("/public/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            LoginResponse loginResponse = accountService.login(loginRequest.getUsername().trim(), loginRequest.getPassword().trim());
            return ResponseEntity.ok(loginResponse);
        } catch (ResponseStatusException ex) {
            Map<String, Object> error = new HashMap<>();
            error.put("message", ex.getReason());
            error.put("success", false);
            return ResponseEntity.status(ex.getStatusCode()).body(error);
        }
    }

    @PostMapping("/public/register")
    public ResponseEntity<Map<String, Object>> customerRegister(
            @Valid @RequestBody RegisterRequest registerRequest) {
        try {
            accountService.createCustomer(registerRequest);
            Map<String, Object> responseBody = new HashMap<>();
            responseBody.put("message", "Đăng kí thành công!\nVui lòng đăng nhập.");
            responseBody.put("success", true);
            responseBody.put("data", null);
            return ResponseEntity.ok(responseBody);
        } catch (Exception ex) {
            HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;
            String message = "Đăng kí thất bại: " + ex.getMessage();

            if (ex instanceof ResponseStatusException rse) {
                status = (HttpStatus) rse.getStatusCode();
                message = rse.getReason();
            }

            Map<String, Object> error = new HashMap<>();
            error.put("message", message);
            error.put("success", false);
            return ResponseEntity.status(status).body(error);
        }
    }


    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @PostMapping("/secure/register")
    public ResponseEntity<Map<String, Object>> staffRegister(@Valid @RequestBody RegisterRequest registerRequest) {
        try {
            accountService.createStaff(registerRequest);

            Map<String, Object> responseBody = new HashMap<>();
            responseBody.put("message", "Đăng kí thành công!.");
            responseBody.put("success", true);
            responseBody.put("data", null);
            return ResponseEntity.ok(responseBody);
        } catch (Exception ex) {
            HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;
            String message = "Đăng kí thất bại: " + ex.getMessage();

            if (ex instanceof ResponseStatusException rse) {
                status = (HttpStatus) rse.getStatusCode();
                message = rse.getReason();
            }

            Map<String, Object> error = new HashMap<>();
            error.put("message", message);
            error.put("success", false);
            return ResponseEntity.status(status).body(error);
        }

    }

    @PatchMapping("/secure/accounts")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest request,
                                            @RequestHeader("X-Account-Id") Long accountId) {
        try {
            accountService.changePassword(accountId, request);
            return ResponseEntity.ok(new ApiResponse<>("Thay đổi mật khẩu thành công!", true, null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @GetMapping("/secure/accounts")
    public ResponseEntity<ApiResponse<Page<AccountResponse>>> getAllAccounts(@RequestParam(required = false) Integer page,
                                                                             @RequestParam(required = false) Integer size,
                                                                             @RequestParam(required = false) String keyword,
                                                                             @RequestParam(required = false) String type,
                                                                             @RequestParam(required = false) Boolean active,
                                                                             @RequestParam(required = false) Long roleId) {
        return ResponseEntity.ok(
                new ApiResponse<>("Lấy danh sách sản phẩm thành công!", true, accountService.getAllAccounts(page, size, keyword, type, active, roleId)));
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @PatchMapping("/secure/accounts/active/{id}")
    public ResponseEntity<?> changeAccountActive(
            @PathVariable Long id,
            @RequestHeader("X-Account-Id") Long tokenAccountId,
            @RequestHeader("X-User-Role") String tokenRole) {
        try {
            if (id.equals(tokenAccountId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không thể thay đổi trạng thái của chính mình!");
            }
            if (Objects.equals(tokenRole, "MANAGER")) {
                Account account = accountService.getAccountById(id);
                if (Objects.equals(account.getRole().getName(), "ADMIN")) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền khóa tài khoản này!");
                }
            }
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
        accountService.changeAccountActive(id);
        return ResponseEntity.ok(new ApiResponse<>("Cập nhật trạng thái thành công!", true, null));
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @DeleteMapping("/secure/accounts/{id}")
    public ResponseEntity<?> deleteAccount(
            @PathVariable Long id,
            @RequestHeader("X-Account-Id") Long tokenAccountId,
            @RequestHeader("X-User-Role") String tokenRole) {

        try {
            if (id.equals(tokenAccountId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không thể xóa tài khoản của chính mình!");
            }
            Account account = accountService.getAccountById(id);

            if ("MANAGER".equals(tokenRole) && "ADMIN".equals(account.getRole().getName())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền xóa tài khoản này!");
            }
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }

        try {
            accountService.deleteAccount(id);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Xóa tài khoản thất bại: " + e.getMessage(), "success", false));
        }

        return ResponseEntity.ok(Map.of("message", "Xóa tài khoản thành công!", "success", true));
    }


    @PostMapping("/internal/staff/{staffId}/role/{roleId}")
    public void changeStaffRole(@PathVariable Long staffId, @PathVariable Long roleId) {
        accountService.changeStaffRole(staffId, roleId);
    }

    @GetMapping("/internal/staffs")
    public Map<Long, String> getStaffsRole(@RequestParam List<Long> staffIds) {
        return accountService.getStaffsRole(staffIds);
    }

    @GetMapping("/internal/accounts/{id}/isVerified")
    public ResponseEntity<?> checkAccountIsVerified(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(accountService.checkAccountIsVerified(id));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Kiểm tra thất bại: " + e.getMessage(), "success", false));
        }
    }

    @PostMapping("/internal/accounts/{ownerId}/{roleId}/active")
    public ResponseEntity<?> changeAccountActive(@PathVariable Long ownerId, @PathVariable Long roleId) {
        try {
            accountService.changeAccountActiveByOwnerIdAndRole(ownerId, roleId);
            return ResponseEntity.ok(null);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Kiểm tra thất bại: " + e.getMessage(), "success", false));
        }
    }


    private ResponseEntity<Map<String, Object>> errorResponse(ResponseStatusException ex) {
        Map<String, Object> error = new HashMap<>();
        error.put("message", ex.getReason());
        error.put("success", false);
        return ResponseEntity.status(ex.getStatusCode()).body(error);
    }
}
