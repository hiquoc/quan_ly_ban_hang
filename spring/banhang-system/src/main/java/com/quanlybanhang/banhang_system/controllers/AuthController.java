package com.quanlybanhang.banhang_system.controllers;

import com.quanlybanhang.banhang_system.dtos.Account.AccountRequest;
import com.quanlybanhang.banhang_system.dtos.Account.AccountResponse;
import com.quanlybanhang.banhang_system.dtos.ApiResponse;
import com.quanlybanhang.banhang_system.mappers.AccountMapper;
import com.quanlybanhang.banhang_system.services.AccountService;
import lombok.AllArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/auth")
@AllArgsConstructor
public class AuthController {
    private final AccountService accountService;
    private final AccountMapper accountMapper;
    private final AuthenticationManager authenticationManager;

    @PostMapping("/login")
    public AccountResponse login(@RequestBody AccountRequest accountRequest){
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        accountRequest.getUsername(),
                        accountRequest.getPassword()
                )
        );
        /// return error when sending wrong credentials
        AccountResponse accountResponse= accountService.login(accountRequest.getUsername(),accountRequest.getPassword());
        accountResponse.setMessage("Login successfully");
        System.out.println(accountResponse);
        return accountResponse;
    }
    @PostMapping("/register")
    public ApiResponse register(@RequestBody AccountRequest accountRequest){
         accountService.createAccount(
                        accountRequest.getUsername(),
                        accountRequest.getPassword(),
                        "USER"
        );
         return new ApiResponse("Register successfully. Please login.",true);
    }
}
