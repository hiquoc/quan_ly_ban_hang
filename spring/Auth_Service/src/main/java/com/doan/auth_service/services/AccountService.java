package com.doan.auth_service.services;

import com.doan.auth_service.clients.CustomerServiceClient;
import com.doan.auth_service.clients.StaffServiceClient;
import com.doan.auth_service.dtos.Account.ChangePasswordRequest;
import com.doan.auth_service.dtos.Login.LoginResponse;
import com.doan.auth_service.dtos.Login.RegisterRequest;
import com.doan.auth_service.models.Account;
import com.doan.auth_service.models.Role;
import com.doan.auth_service.repositories.AccountRepository;
import com.doan.auth_service.utils.JwtUtil;
import jakarta.persistence.EntityManager;
import lombok.AllArgsConstructor;
import org.hibernate.Session;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Objects;
import java.util.Optional;


@Service
@AllArgsConstructor
public class AccountService {
    private final AccountRepository accountRepository;
    private final CustomerServiceClient customerServiceClient;
    private final StaffServiceClient staffServiceClient;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;


    public Account createAccount(String username, String rawPassword,Long ownerId, Role role){
        String hashedPassword=passwordEncoder.encode(rawPassword);
        return accountRepository.save(
                new Account(username,hashedPassword,ownerId,role));
    }
    public LoginResponse login(String username, String password){
        Account account=accountRepository.findByUsername(username)
                .or(() -> {
                    if (username.contains("@")) {
                        try {
                            Optional<Account> optionalAccount = accountRepository
                                    .findByOwnerIdAndRole_Id(
                                            customerServiceClient.getCustomerIdByEmail(username)
                                                    .getOwnerId(),4L);
                            if (optionalAccount.isPresent()) return optionalAccount;

                        } catch (Exception ex) {
                            System.out.println("Customer not found with email: " + username);
                        }

                        try{
                            Long ownerId = staffServiceClient.getStaffIdByEmail(username).getOwnerId();
                            return accountRepository.findByOwnerIdAndRole_IdNot(ownerId,4L);
                        }catch (Exception ignored){
                            System.out.println("User not found with email: "+username);
                        }
                    }
                    return Optional.empty();
                })
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND, "Sai tên tài khoản hoặc mật khẩu! "));
        if (!passwordEncoder.matches(password, account.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sai tên tài khoản hoặc mật khẩu!");
        }
        if(!account.getIsActive())
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tài khoản đã bị khóa!");


        String token = jwtUtil.generateToken(account.getUsername(),account.getId(), account.getRole().getName(),account.getOwnerId());

        LoginResponse response = new LoginResponse();
        response.setUsername(account.getUsername());
        response.setRole(account.getRole().getName());
        response.setToken(token);

        return response;
    }
    public Account getAccountById(Long id){
        return accountRepository.findById(id)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy tài khoản với id: "+id))  ;
    }
    public List<Account> getAllAccounts(){
        return accountRepository.findAllAccountsIncludingDeleted();
    }
    public Account updateAccount(Long id,Account accountDetails){
        return accountRepository.findById(id)
                .map(account -> {
                    account.setPassword(accountDetails.getPassword());
                    account.setRole(accountDetails.getRole());
                    return accountRepository.save(account);
                })
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy tài khoản với id: "+id))  ;
    }
    public void changeAccountRole(Long accountId,Role role){
        Account account=accountRepository.findById(accountId)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy tài khoản với id: "+accountId));
        account.setRole(role);
        accountRepository.save(account);
    }
    public void changePassword(Long accountId, ChangePasswordRequest request) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản với id: " + accountId));

        if (!passwordEncoder.matches(request.getOldPassword(), account.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu hiện tại không đúng");
        }

        if (request.getNewPassword().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu mới không được để trống");
        }

        if (passwordEncoder.matches(request.getNewPassword(), account.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu mới không được trùng với mật khẩu hiện tại");
        }
        account.setPassword(passwordEncoder.encode(request.getNewPassword()));
        accountRepository.save(account);
    }
    public void deleteAccount(Long id){
        accountRepository.deleteById(id);
    }

    public void changeAccountActive(Long id){
        Account account=accountRepository.findById(id)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy tài khoản với id: "+id))  ;
        account.setIsActive(!account.getIsActive());
        accountRepository.save(account);
    }
    public void checkRegisterRequest(RegisterRequest request){
        if(request.getUsername().contains("@")
           || !request.getUsername().matches("^[a-zA-Z0-9_-]+$")){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Tên tài khoản không được chứa kí tự đặc biệt!");
        }
        if(accountRepository.existsByUsername(request.getUsername())){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Tên tài khoản đã tồn tại!");
        }
    }
}
