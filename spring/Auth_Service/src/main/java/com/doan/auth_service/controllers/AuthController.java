package com.doan.auth_service.controllers;

import com.doan.auth_service.dtos.Account.AccountResponse;
import com.doan.auth_service.dtos.Account.ChangePasswordRequest;
import com.doan.auth_service.dtos.Customer.CustomerRequest;
import com.doan.auth_service.dtos.Login.LoginRequest;
import com.doan.auth_service.dtos.Login.LoginResponse;
import com.doan.auth_service.dtos.Login.RegisterRequest;
import com.doan.auth_service.dtos.ApiResponse;
import com.doan.auth_service.dtos.Staff.StaffRequest;
import com.doan.auth_service.dtos.Staff.OwnerIdResponse;
import com.doan.auth_service.models.Account;
import com.doan.auth_service.models.PendingAction;
import com.doan.auth_service.models.Role;
import com.doan.auth_service.repositories.PendingActionRepository;
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

import java.util.*;
import java.util.stream.Collectors;


@RestController
@RequestMapping("")
@AllArgsConstructor
public class AuthController {
    private final AccountService accountService;
    private final RoleService roleService;
    private final PendingActionRepository pendingActionRepository;
    private final StaffServiceClient staffServiceClient;
    private final CustomerServiceClient customerServiceClient;

    @PostMapping("/public/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest){
        try{
            LoginResponse loginResponse = accountService.login(loginRequest.getUsername(), loginRequest.getPassword());
            return ResponseEntity.ok(loginResponse);
        }catch (ResponseStatusException ex) {
            Map<String, Object> error = new HashMap<>();
            error.put("message", ex.getReason());
            error.put("success", false);
            return ResponseEntity.status(ex.getStatusCode()).body(error);
        }
    }

    @PostMapping("/public/register")
    public ResponseEntity<Map<String, Object>> customerRegister(
            @Valid @RequestBody RegisterRequest registerRequest) {

        accountService.checkRegisterRequest(registerRequest);

        CustomerRequest body = new CustomerRequest(
                registerRequest.getFullName(),
                registerRequest.getPhone(),
                registerRequest.getEmail()
        );

        OwnerIdResponse response = null;
        Long ownerId = null;

        try {
            response = customerServiceClient.createCustomer(body);
            ownerId = response.getOwnerId();

            Role role = roleService.getRoleById(4L);
            accountService.createAccount(
                    registerRequest.getUsername(),
                    registerRequest.getPassword(),
                    ownerId,
                    role
            );

            Map<String, Object> responseBody = new HashMap<>();
            responseBody.put("message", "Đăng kí thành công!\nVui lòng đăng nhập.");
            responseBody.put("success", true);
            responseBody.put("data", null);
            return ResponseEntity.ok(responseBody);

        } catch (Exception ex) {
            if (ownerId != null) {
                PendingAction pending = new PendingAction();
                pending.setService("CUSTOMER_SERVICE");
                pending.setEntityId(ownerId);
                pending.setActionType("DELETE");
                pendingActionRepository.save(pending);
            }

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

        accountService.checkRegisterRequest(registerRequest);

        StaffRequest body = new StaffRequest(
                registerRequest.getFullName(),
                registerRequest.getPhone(),
                registerRequest.getEmail()
        );

        OwnerIdResponse response = null;
        Long ownerId = null;

        try {
            response = staffServiceClient.createStaff(body);
            ownerId = response.getOwnerId();

            Role role = roleService.getRoleById(3L);
            accountService.createAccount(
                    registerRequest.getUsername(),
                    registerRequest.getPassword(),
                    ownerId,
                    role
            );

            Map<String, Object> responseBody = new HashMap<>();
            responseBody.put("message", "Đăng kí thành công!\nVui lòng đăng nhập.");
            responseBody.put("success", true);
            responseBody.put("data", null);
            return ResponseEntity.ok(responseBody);

        } catch (Exception ex) {
            if (ownerId != null) {
                PendingAction pending = new PendingAction();
                pending.setService("STAFF_SERVICE");
                pending.setEntityId(ownerId);
                pending.setActionType("DELETE");
                pendingActionRepository.save(pending);
            }

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
                                            @RequestHeader("X-Account-Id")Long accountId){
        try{
            accountService.changePassword(accountId,request);
            return ResponseEntity.ok(new ApiResponse<>("Thay đổi mật khẩu thành công!",true,null));
        }catch(ResponseStatusException ex){
            return errorResponse(ex);
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @GetMapping("/secure/accounts")
    public Page<AccountResponse> getAllAccounts(@RequestParam(required = false) Integer page,
                                                @RequestParam(required = false) Integer size,
                                                @RequestParam(required = false) String keyword,
                                                @RequestParam(required = false) String type,
                                                @RequestParam(required = false) Boolean active,
                                                @RequestParam(required = false) Long roleId){
        return accountService.getAllAccounts(page, size, keyword, type, active,roleId);
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @PatchMapping("/secure/accounts/{accountId}/role/{roleId}")
    public ApiResponse<Void> changeAccountRole(
            @PathVariable Long accountId,
            @PathVariable Long roleId,
            @RequestHeader("X-Account-Id") Long tokenAccountId,
            @RequestHeader("X-User-Role") String tokenRole) {
        if (accountId.equals(tokenAccountId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không thể thay đổi quyền của chính mình!");
        }
        Role role=roleService.getRoleById(roleId);
        if(role.getId()==4L){
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không thể thay đổi quyền thành CUSTOMER!");
        }
        if(Objects.equals(tokenRole, "MANAGER") ){
            if(Objects.equals(role.getName(), "ADMIN")){
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không thể thay đổi quyền lên mức ADMIN!");
            }
            Account account=accountService.getAccountById(accountId);
            if(Objects.equals(account.getRole().getName(), "ADMIN")){
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không thể thay đổi quyền của tài khoản này!");
            }
        }
        accountService.changeAccountRole(accountId, role);
        return new ApiResponse<>("Cập nhật quyền thành công!", true, null);
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @PatchMapping("/secure/accounts/active/{id}")
    public ApiResponse<Void> changeAccountActive(
            @PathVariable Long id,
            @RequestHeader("X-Account-Id") Long tokenAccountId,
            @RequestHeader("X-User-Role") String tokenRole) {
        if (id.equals(tokenAccountId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không thể thay đổi trạng thái của chính mình!");
        }
        if(Objects.equals(tokenRole, "MANAGER") ){
            Account account=accountService.getAccountById(id);
            if(Objects.equals(account.getRole().getName(), "ADMIN")){
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền khóa tài khoản này!");
            }
        }
        accountService.changeAccountActive(id);
        return new ApiResponse<>("Cập nhật trạng thái thành công!",true,null);
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @DeleteMapping("/secure/accounts/{id}")
    public ResponseEntity<?> deleteAccount(
            @PathVariable Long id,
            @RequestHeader("X-Account-Id") Long tokenAccountId,
            @RequestHeader("X-User-Role") String tokenRole) {

        if (id.equals(tokenAccountId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không thể xóa tài khoản của chính mình!");
        }

        Account account = accountService.getAccountById(id);

        if ("MANAGER".equals(tokenRole) && "ADMIN".equals(account.getRole().getName())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền xóa tài khoản này!");
        }

        try {
            accountService.deleteAccount(id);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Xóa tài khoản thất bại: " + e.getMessage(), "success", false));
        }

        PendingAction pending = new PendingAction();
        pending.setService(account.getRole().getId() != 4L ? "STAFF_SERVICE" : "CUSTOMER_SERVICE");
        pending.setEntityId(account.getOwnerId());
        pending.setActionType("DELETE");
        pendingActionRepository.save(pending);

        return ResponseEntity.ok(Map.of("message", "Xóa tài khoản thành công!", "success", true));
    }

    private ResponseEntity<Map<String, Object>> errorResponse(ResponseStatusException ex) {
        Map<String, Object> error = new HashMap<>();
        error.put("message", ex.getReason());
        error.put("success", false);
        return ResponseEntity.status(ex.getStatusCode()).body(error);
    }
}
