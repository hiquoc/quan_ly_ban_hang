package com.doan.auth_service.controllers;

import com.doan.auth_service.clients.CustomerServiceClient;
import com.doan.auth_service.clients.UserServiceClient;
import com.doan.auth_service.dtos.Account.AccountResponse;
import com.doan.auth_service.dtos.Customer.CustomerRequest;
import com.doan.auth_service.dtos.Login.LoginRequest;
import com.doan.auth_service.dtos.Login.LoginResponse;
import com.doan.auth_service.dtos.Login.RegisterRequest;
import com.doan.auth_service.dtos.ApiResponse;
import com.doan.auth_service.dtos.User.UserRequest;
import com.doan.auth_service.dtos.User.OwnerIdResponse;
import com.doan.auth_service.mappers.AccountMapper;
import com.doan.auth_service.models.Account;
import com.doan.auth_service.models.Role;
import com.doan.auth_service.services.AccountService;
import com.doan.auth_service.services.RoleService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;


@RestController
@RequestMapping("")
@AllArgsConstructor
public class AuthController {
    private final AccountService accountService;
    private final AccountMapper accountMapper;
    private final RoleService roleService;
    private final UserServiceClient userServiceClient;
    private final CustomerServiceClient customerServiceClient;

    @PostMapping("/public/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest loginRequest){
        LoginResponse loginResponse = accountService.login(loginRequest.getUsername(), loginRequest.getPassword());
        return new ApiResponse<>("Login successfully!",true,loginResponse);
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @PostMapping("/secure/register")
    public ApiResponse<Void> user_register(@Valid @RequestBody RegisterRequest registerRequest ){
        accountService.checkRegisterRequest(registerRequest);

        UserRequest body = new UserRequest(registerRequest.getFullName(), registerRequest.getPhone(),registerRequest.getEmail());
        OwnerIdResponse response = userServiceClient.createUser(body);
        Long ownerId = response.getOwnerId();
        Role role=roleService.findRoleById(3L);
         accountService.createAccount(
                        registerRequest.getUsername(),
                        registerRequest.getPassword(),
                        "USER",
                        ownerId,
                        role
        );
         return new ApiResponse<>("Tạo tài khoản thành công!",true,null);
    }
    @PostMapping("/public/register")
    public ApiResponse<Void> customer_register(@Valid @RequestBody RegisterRequest registerRequest){
        System.out.println("register");
        accountService.checkRegisterRequest(registerRequest);

        CustomerRequest body = new CustomerRequest(registerRequest.getFullName(), registerRequest.getPhone(), registerRequest.getEmail());
        OwnerIdResponse response = customerServiceClient.createCustomer(body);
        Long ownerId = response.getOwnerId();
        Role role=roleService.findRoleById(4L);
        accountService.createAccount(
                registerRequest.getUsername(),
                registerRequest.getPassword(),
                "CUSTOMER",
                ownerId,
                role
        );
        return new ApiResponse<>("Đăng kí thành công!\n Vui lòng đăng nhập.",true,null);
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @GetMapping("/secure/accounts")
    public List<AccountResponse> getAllAccounts(){
        return accountService.getAllAccounts().stream()
                .map(account->new AccountResponse(
                        account.getId(),
                        account.getUsername(),
                        account.getRole().getName(),
                        account.getCreatedAt()
                ))
                .collect(Collectors.toList());
    }
    @GetMapping("/roles")
    public List<Role> getRoles(){
        return roleService.getAllRoles();
    }
}
