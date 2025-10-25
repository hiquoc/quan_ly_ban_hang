package com.doan.auth_service.services;

import com.doan.auth_service.dtos.Account.AccountResponse;
import com.doan.auth_service.dtos.Account.ChangePasswordRequest;
import com.doan.auth_service.dtos.Customer.CustomerResponse;
import com.doan.auth_service.dtos.Login.LoginResponse;
import com.doan.auth_service.dtos.Login.RegisterRequest;
import com.doan.auth_service.dtos.Staff.StaffResponse;
import com.doan.auth_service.models.Account;
import com.doan.auth_service.models.Role;
import com.doan.auth_service.repositories.AccountRepository;
import com.doan.auth_service.utils.JwtUtil;
import jakarta.persistence.EntityManager;
import lombok.AllArgsConstructor;
import org.hibernate.Session;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;


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
                            System.out.println("Staff not found with email: "+username);
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
    public Page<AccountResponse> getAllAccounts(
            Integer page, Integer size, String keyword, String type, Boolean active, Long roleId
    ) {
        int currentPage = page != null ? page : 0;
        int pageSize = size != null ? size : 10;
        Pageable pageable = PageRequest.of(currentPage, pageSize);

        Page<Account> accounts;

        if (keyword != null && !keyword.isEmpty() && type != null && !type.isEmpty()) {

            switch (type.toLowerCase()) {

                case "code":
                    Pattern pattern = Pattern.compile("(NV|CUS)?(\\d+)");
                    Matcher matcher = pattern.matcher(keyword);
                    if (!matcher.matches()) return Page.empty(pageable);

                    String rolePrefix = matcher.group(1);
                    Long number = Long.parseLong(matcher.group(2));

                    if (rolePrefix == null) {
                        accounts = (roleId != null) ?
                                accountRepository.findByIdAndRole_Id(number, roleId, pageable) :
                                accountRepository.findById(number, pageable);
                    } else if ("NV".equals(rolePrefix)) {
                        accounts = (roleId != null) ?
                                accountRepository.findByIdAndRole_IdNotAndRole_Id(number, 4L, roleId, pageable) :
                                accountRepository.findByIdAndRole_IdNot(number, 4L, pageable);
                    } else {
                        accounts = (roleId != null) ?
                                accountRepository.findByIdAndRole_IdAndRole_Id(number, 4L, roleId, pageable) :
                                accountRepository.findByIdAndRole_Id(number, 4L, pageable);
                    }
                    break;

                case "username":
                    if (active != null && roleId != null)
                        accounts = accountRepository.findByUsernameContainingAndIsActiveAndRole_Id(keyword, active, roleId, pageable);
                    else if (active != null)
                        accounts = accountRepository.findByUsernameContainingAndIsActive(keyword, active, pageable);
                    else if (roleId != null)
                        accounts = accountRepository.findByUsernameContainingAndRole_Id(keyword, roleId, pageable);
                    else
                        accounts = accountRepository.findByUsernameContaining(keyword, pageable);
                    break;

                case "fullname":
                case "email":
                case "phone":
                    List<Long> customerIds = customerServiceClient.getCustomerByKeyword(keyword, type, currentPage, pageSize)
                            .stream()
                            .map(CustomerResponse::getId)
                            .toList();

                    List<Long> staffIds = staffServiceClient.getStaffByKeyword(keyword, type, currentPage, pageSize)
                            .stream()
                            .map(StaffResponse::getId)
                            .toList();

                    accounts = accountRepository.findByOwnerIdsWithFilters(
                            customerIds.isEmpty() ? null : customerIds,
                            staffIds.isEmpty() ? null : staffIds,
                            active,
                            roleId,
                            pageable
                    );
                    break;

                default:
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Loại tìm kiếm không hợp lệ: " + type);
            }

        } else {
            if (active != null && roleId != null)
                accounts = accountRepository.findByIsActiveAndRole_Id(active, roleId, pageable);
            else if (active != null)
                accounts = accountRepository.findByIsActive(active, pageable);
            else if (roleId != null)
                accounts = accountRepository.findByRole_Id(roleId, pageable);
            else
                accounts = accountRepository.findAll(pageable);
        }

        Page<AccountResponse> accountResponses = accounts.map(this::toAccountResponse);

        List<Long> custIds = accountResponses.getContent().stream()
                .filter(acc -> "CUSTOMER".equals(acc.getRole()) && acc.getOwnerId() != null)
                .map(AccountResponse::getOwnerId)
                .toList();

        if (!custIds.isEmpty()) {
            List<CustomerResponse> customers = customerServiceClient.getCustomerByIds(custIds);
            Map<Long, CustomerResponse> customerMap = customers.stream()
                    .collect(Collectors.toMap(CustomerResponse::getId, c -> c));

            accountResponses.stream()
                    .filter(acc -> "CUSTOMER".equals(acc.getRole()) && acc.getOwnerId() != null)
                    .forEach(acc -> {
                        CustomerResponse c = customerMap.get(acc.getOwnerId());
                        if (c != null) {
                            acc.setFullName(c.getFullName());
                            acc.setEmail(c.getEmail());
                            acc.setPhone(c.getPhone());
                        }
                    });
        }

// --- Enrich staff data ---
        List<Long> stfIds = accountResponses.getContent().stream()
                .filter(acc -> !"CUSTOMER".equals(acc.getRole()) && acc.getOwnerId() != null)
                .map(AccountResponse::getOwnerId)
                .toList();

        if (!stfIds.isEmpty()) {
            List<StaffResponse> staffs = staffServiceClient.getStaffByIds(stfIds);
            Map<Long, StaffResponse> staffMap = staffs.stream()
                    .collect(Collectors.toMap(StaffResponse::getId, s -> s));

            accountResponses.stream()
                    .filter(acc -> !"CUSTOMER".equals(acc.getRole()) && acc.getOwnerId() != null)
                    .forEach(acc -> {
                        StaffResponse s = staffMap.get(acc.getOwnerId());
                        if (s != null) {
                            acc.setFullName(s.getFullName());
                            acc.setEmail(s.getEmail());
                            acc.setPhone(s.getPhone());
                        }
                    });
        }

        return accountResponses;
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
    public AccountResponse toAccountResponse(Account account){
        return new AccountResponse(
                account.getId(),
                account.getUsername(),
                account.getOwnerId(),
                account.getRole().getName(),
                account.getIsActive(),
                account.getCreatedAt()
        );
    }
}
