package com.quanlybanhang.banhang_system.services;

import com.quanlybanhang.banhang_system.dtos.Account.AccountResponse;
import com.quanlybanhang.banhang_system.models.Account;
import com.quanlybanhang.banhang_system.repositories.AccountRepository;
import com.quanlybanhang.banhang_system.utils.JwtUtil;
import lombok.AllArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class AccountService {
    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public void createAccount(String username, String rawPassword, String role){
        String hashedPassword=passwordEncoder.encode(rawPassword);
        Account account=new Account(null,username,hashedPassword,role);
        accountRepository.save(account);
    }
    public AccountResponse login(String username, String password){
        Account account=accountRepository.findByUsername(username)
                .orElseThrow(()->new RuntimeException("User not found"));
        if(!passwordEncoder.matches(password,account.getPassword())){
            throw new RuntimeException("Incorrect password");
        }
        String token= jwtUtil.generateToken(account.getUsername(),account.getRole());
        AccountResponse response=new AccountResponse();
        response.setMessage("Login successfully");
        response.setUsername(account.getUsername());
        response.setRole(account.getRole());
        response.setToken(token);
        return response;
    }
    public Account updateAccount(Long id,Account accountDetails){
        return accountRepository.findById(id)
                .map(account -> {
                    account.setPassword(accountDetails.getPassword());
                    account.setRole(accountDetails.getRole());
                    return accountRepository.save(account);
                })
                .orElseThrow(()->new RuntimeException("Account not found with id: "+id));
    }
    public void deleteAccount(Long id){
        accountRepository.deleteById(id);
    }
}
