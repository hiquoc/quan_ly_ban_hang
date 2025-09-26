package com.doan.auth_service.services;

import com.doan.auth_service.dtos.Account.AccountResponse;
import com.doan.auth_service.dtos.Login.LoginResponse;
import com.doan.auth_service.dtos.Login.RegisterRequest;
import com.doan.auth_service.models.Account;
import com.doan.auth_service.models.Role;
import com.doan.auth_service.repositories.AccountRepository;
import com.doan.auth_service.utils.JwtUtil;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;


@Service
@AllArgsConstructor
public class AccountService {
    private final AccountRepository accountRepository;
    private final RoleService roleService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public void createAccount(String username, String rawPassword,String accountType,Long ownerId, Role role){
        String hashedPassword=passwordEncoder.encode(rawPassword);
        Account account=new Account(username,hashedPassword,accountType,ownerId,role);
        accountRepository.save(account);
    }
    public LoginResponse login(String username, String password){
        Account account = accountRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Account not found"));

        if (!passwordEncoder.matches(password, account.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sai tên tài khoản hoặc mật khẩu!");
        }

        String roleName = account.getRole().getName();

        String token = jwtUtil.generateToken(account.getUsername(), roleName);

        LoginResponse response = new LoginResponse();
        response.setUsername(account.getUsername());
        response.setRole(roleName);
        response.setToken(token);

        return response;
    }

    public List<Account> getAllAccounts(){
        return accountRepository.findAll();
    }
    public Account updateAccount(Long id,Account accountDetails){
        return accountRepository.findById(id)
                .map(account -> {
                    account.setPassword(accountDetails.getPassword());
                    account.setRole(accountDetails.getRole());
                    return accountRepository.save(account);
                })
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found with id: "+id));
    }
    public void deleteAccount(Long id){
        accountRepository.deleteById(id);
    }
    public void checkRegisterRequest(RegisterRequest request){
        boolean account=accountRepository.existsByUsername(request.getUsername());
        if(account){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Tên tài khoản đã tồn tại!");
        }
    }
}
