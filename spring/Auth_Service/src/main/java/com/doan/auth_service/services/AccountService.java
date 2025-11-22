package com.doan.auth_service.services;

import com.doan.auth_service.dtos.Account.AccountResponse;
import com.doan.auth_service.dtos.Account.ChangePasswordRequest;
import com.doan.auth_service.dtos.Customer.CustomerRequest;
import com.doan.auth_service.dtos.Customer.CustomerResponse;
import com.doan.auth_service.dtos.Login.LoginResponse;
import com.doan.auth_service.dtos.Login.RegisterRequest;
import com.doan.auth_service.dtos.Staff.OwnerIdResponse;
import com.doan.auth_service.dtos.Staff.StaffRequest;
import com.doan.auth_service.dtos.Staff.StaffResponse;
import com.doan.auth_service.models.Account;
import com.doan.auth_service.models.PendingAction;
import com.doan.auth_service.models.Role;
import com.doan.auth_service.repositories.AccountRepository;
import com.doan.auth_service.repositories.PendingActionRepository;
import com.doan.auth_service.repositories.VerificationCodeRepository;
import com.doan.auth_service.utils.JwtUtil;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;


@Service
@AllArgsConstructor
public class AccountService {
    private final RoleService roleService;

    private final AccountRepository accountRepository;
    private final VerificationCodeRepository verificationCodeRepository;
    private final PendingActionRepository pendingActionRepository;
    private final CustomerServiceClient customerServiceClient;
    private final StaffServiceClient staffServiceClient;
    private final DeliveryServiceClient deliveryServiceClient;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;


    public void createAccount(String username, String rawPassword, Long ownerId, Role role, boolean isVerified) {
        String hashedPassword = passwordEncoder.encode(rawPassword);
        Account account = new Account(username, hashedPassword, ownerId, role);
        if (isVerified)
            account.setIsVerified(true);
        accountRepository.save(account);
    }

    public LoginResponse login(String username, String password) {
        Account account = accountRepository.findByUsername(username)
                .or(() -> {
                    if (username.contains("@")) {
                        try {
                            Optional<Account> optionalAccount = accountRepository
                                    .findByOwnerIdAndRole_Id(
                                            customerServiceClient.getCustomerIdByEmail(username)
                                                    .getOwnerId(), 4L);
                            if (optionalAccount.isPresent()) return optionalAccount;

                        } catch (Exception ex) {
                            System.out.println("Customer not found with email: " + username);
                        }

                        try {
                            Long ownerId = staffServiceClient.getStaffIdByEmail(username).getOwnerId();
                            return accountRepository.findByOwnerIdAndRole_IdNot(ownerId, 4L);
                        } catch (Exception ignored) {
                            System.out.println("Staff not found with email: " + username);
                        }
                    }
                    return Optional.empty();
                })
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sai tên tài khoản hoặc mật khẩu! "));
        if (!passwordEncoder.matches(password, account.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sai tên tài khoản hoặc mật khẩu!");
        }
        if (!account.getIsActive())
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tài khoản đã bị khóa!");


        String token = jwtUtil.generateToken(account.getUsername(), account.getId(), account.getRole().getName(), account.getOwnerId());

        LoginResponse response = new LoginResponse();
        response.setUsername(account.getUsername());
        response.setRole(account.getRole().getName());
        response.setToken(token);

        return response;
    }

    public Account getAccountById(Long id) {
        return accountRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản với id: " + id));
    }

    public Page<AccountResponse> getAllAccounts(
            Integer page, Integer size, String keyword, String type, Boolean active, Long roleId
    ) {
        int currentPage = page != null ? page : 0;
        int pageSize = size != null ? size : 10;
        Pageable pageable = PageRequest.of(currentPage, pageSize, Sort.by("createdAt").descending());

        List<Account> accountsList = new ArrayList<>();
        long totalElements = 0;

        boolean hasKeyword = keyword != null && !keyword.isBlank();
        boolean hasType = type != null && !type.isBlank();
        String numericPart = hasKeyword ? keyword.replaceAll("\\D", "") : null;
        Long number = (numericPart != null && !numericPart.isEmpty()) ? Long.parseLong(numericPart) : null;

        if (hasKeyword && hasType) {
            switch (type.toLowerCase()) {
                case "account":
                    if (number != null) {
                        String numberStr = number.toString();
                        Page<Account> accounts = accountRepository.findByIdLikeAndRole(numberStr, roleId, pageable);
                        accountsList.addAll(accounts.getContent());
                        totalElements = accounts.getTotalElements();
                    }
                    break;

                case "nv": // staff
                    List<Long> staffIds = staffServiceClient.getStaffByIdLike(number)
                            .stream().map(StaffResponse::getId).toList();
                    if (!staffIds.isEmpty()) {
                        Page<Account> staffAccounts = accountRepository.findStaffAccounts(
                                staffIds,
                                active,
                                roleId,
                                pageable
                        );
                        accountsList.addAll(staffAccounts.getContent());
                        totalElements = staffAccounts.getTotalElements();
                    }
                    break;

                case "kh": // customer
                    List<Long> customerIds = customerServiceClient.getCustomerByIdLike(number)
                            .stream().map(CustomerResponse::getId).toList();
                    if (!customerIds.isEmpty()) {
                        Page<Account> customerAccounts = accountRepository.findCustomerAccounts(
                                customerIds,
                                active,
                                4L,
                                pageable
                        );
                        accountsList.addAll(customerAccounts.getContent());
                        totalElements = customerAccounts.getTotalElements();
                    }
                    break;

                case "sp":
                    List<Long> shipperIds = deliveryServiceClient.getShipperByIdLike(number)
                            .stream().map(StaffResponse::getId).toList();
                    if (!shipperIds.isEmpty()) {
                        Page<Account> shipperAccounts = accountRepository.findShipperAccounts(
                                shipperIds,
                                active,
                                5L,
                                pageable
                        );
                        accountsList.addAll(shipperAccounts.getContent());
                        totalElements = shipperAccounts.getTotalElements();
                    }
                    break;

                case "username":
                    Page<Account> usernameAccounts;
                    if (active != null && roleId != null)
                        usernameAccounts = accountRepository.findByUsernameContainingAndIsActiveAndRole_Id(keyword, active, roleId, pageable);
                    else if (active != null)
                        usernameAccounts = accountRepository.findByUsernameContainingAndIsActive(keyword, active, pageable);
                    else if (roleId != null)
                        usernameAccounts = accountRepository.findByUsernameContainingAndRole_Id(keyword, roleId, pageable);
                    else
                        usernameAccounts = accountRepository.findByUsernameContaining(keyword, pageable);
                    accountsList.addAll(usernameAccounts.getContent());
                    totalElements = usernameAccounts.getTotalElements();
                    break;

                case "fullname":
                case "email":
                case "phone":
                    List<Long> custIdsByKeyword = customerServiceClient.getCustomerByKeyword(keyword, type, currentPage, pageSize)
                            .stream().map(CustomerResponse::getId).toList();
                    List<Long> staffIdsByKeyword = staffServiceClient.getStaffByKeyword(keyword, type, currentPage, pageSize)
                            .stream().map(StaffResponse::getId).toList();
                    List<Long> shipperIdsByKeyword = deliveryServiceClient.getShipperByKeyword(keyword, type, currentPage, pageSize)
                            .stream().map(StaffResponse::getId).toList();

                    long custTotal = 0;
                    long staffTotal = 0;
                    long shipperTotal = 0;

                    if ((roleId == null || roleId == 4L) && !custIdsByKeyword.isEmpty()) {
                        Page<Account> custAccounts = accountRepository.findCustomerAccounts(
                                custIdsByKeyword,
                                active,
                                4L,
                                pageable
                        );
                        accountsList.addAll(custAccounts.getContent());
                        custTotal = custAccounts.getTotalElements();
                    }

                    if ((roleId == null || (roleId != 4L && roleId != 5L)) && !staffIdsByKeyword.isEmpty()) {
                        Page<Account> staffAccounts = accountRepository.findStaffAccounts(
                                staffIdsByKeyword,
                                active,
                                roleId,
                                pageable
                        );
                        accountsList.addAll(staffAccounts.getContent());
                        staffTotal = staffAccounts.getTotalElements();
                    }

                    if ((roleId == null || roleId == 5L) && !shipperIdsByKeyword.isEmpty()) {
                        Page<Account> shipperAccounts = accountRepository.findShipperAccounts(
                                shipperIdsByKeyword,
                                active,
                                5L,
                                pageable
                        );
                        accountsList.addAll(shipperAccounts.getContent());
                        shipperTotal = shipperAccounts.getTotalElements();
                    }

                    totalElements = custTotal + staffTotal + shipperTotal;
                    break;

                default:
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Loại tìm kiếm không hợp lệ: " + type);
            }
        } else {
            Page<Account> accounts;
            if (active != null && roleId != null)
                accounts = accountRepository.findByIsActiveAndRole_Id(active, roleId, pageable);
            else if (active != null)
                accounts = accountRepository.findByIsActive(active, pageable);
            else if (roleId != null)
                accounts = accountRepository.findByRole_Id(roleId, pageable);
            else
                accounts = accountRepository.findAll(pageable);

            accountsList.addAll(accounts.getContent());
            totalElements = accounts.getTotalElements();
        }

        List<AccountResponse> accountResponses = accountsList.stream()
                .map(this::toAccountResponse)
                .toList();

        List<Long> custIds = accountResponses.stream()
                .filter(acc -> "CUSTOMER".equals(acc.getRole()) && acc.getOwnerId() != null)
                .map(AccountResponse::getOwnerId)
                .toList();
        if (!custIds.isEmpty()) {
            Map<Long, CustomerResponse> customerMap = customerServiceClient.getCustomerByIds(custIds)
                    .stream().collect(Collectors.toMap(CustomerResponse::getId, c -> c));
            accountResponses.forEach(acc -> {
                if ("CUSTOMER".equals(acc.getRole()) && acc.getOwnerId() != null) {
                    CustomerResponse c = customerMap.get(acc.getOwnerId());
                    if (c != null) {
                        acc.setFullName(c.getFullName());
                        acc.setEmail(c.getEmail());
                        acc.setPhone(c.getPhone());
                    }
                }
            });
        }

        List<Long> shpIds = accountResponses.stream()
                .filter(acc -> "SHIPPER".equals(acc.getRole()) && acc.getOwnerId() != null)
                .map(AccountResponse::getOwnerId)
                .toList();
        if (!shpIds.isEmpty()) {
            Map<Long, StaffResponse> shipperMap = deliveryServiceClient.getShipperByIds(shpIds)
                    .stream().collect(Collectors.toMap(StaffResponse::getId, s -> s));
            accountResponses.forEach(acc -> {
                if ("SHIPPER".equals(acc.getRole()) && acc.getOwnerId() != null) {
                    StaffResponse  s = shipperMap.get(acc.getOwnerId());
                    if (s != null) {
                        acc.setFullName(s.getFullName());
                        acc.setEmail(s.getEmail());
                        acc.setPhone(s.getPhone());
                    }
                }
            });
        }

        List<Long> stfIds = accountResponses.stream()
                .filter(acc -> !"CUSTOMER".equals(acc.getRole()) && !"SHIPPER".equals(acc.getRole()) && acc.getOwnerId() != null)
                .map(AccountResponse::getOwnerId)
                .toList();
        if (!stfIds.isEmpty()) {
            Map<Long, StaffResponse> staffMap = staffServiceClient.getStaffByIds(stfIds)
                    .stream().collect(Collectors.toMap(StaffResponse::getId, s -> s));
            accountResponses.forEach(acc -> {
                if (!"CUSTOMER".equals(acc.getRole()) && !"SHIPPER".equals(acc.getRole()) && acc.getOwnerId() != null) {
                    StaffResponse s = staffMap.get(acc.getOwnerId());
                    if (s != null) {
                        acc.setFullName(s.getFullName());
                        acc.setEmail(s.getEmail());
                        acc.setPhone(s.getPhone());
                    }
                }
            });
        }

        return new PageImpl<>(accountResponses, pageable, totalElements);
    }


    public Account updateAccount(Long id, Account accountDetails) {
        return accountRepository.findById(id)
                .map(account -> {
                    account.setPassword(accountDetails.getPassword());
                    account.setRole(accountDetails.getRole());
                    return accountRepository.save(account);
                })
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản với id: " + id));
    }

    public void changeAccountRole(Long accountId, Role role) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản với id: " + accountId));
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

    public void deleteAccount(Long id) {
        accountRepository.deleteById(id);
    }

    public void changeAccountActive(Long id) {
        Account account = accountRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản với id: " + id));
        account.setIsActive(!account.getIsActive());
        accountRepository.save(account);
    }

    @Transactional
    public void createCustomer(RegisterRequest request){
        checkRegisterRequest(request);
        CustomerRequest body = new CustomerRequest(
                request.getFullName().trim(),
                request.getPhone().trim(),
                null
        );
        boolean emailVerified = false;
        if(request.getEmail() != null && !request.getEmail().isBlank()) {
            if(!verificationCodeRepository.existsByEmailAndIsVerified(request.getEmail(), true)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email chưa được xác thực!");
            }
            body.setEmail(request.getEmail().trim());
            emailVerified = true;
        }

        OwnerIdResponse response = null;
        Long ownerId = null;

        try {
            response = customerServiceClient.createCustomer(body);
            ownerId = response.getOwnerId();

            Role role = roleService.getRoleById(4L);
            createAccount(
                    request.getUsername().trim(),
                    request.getPassword().trim(),
                    ownerId,
                    role,
                    emailVerified
            );

        } catch (Exception ex) {
            if (ownerId != null) {
                PendingAction pending = new PendingAction();
                pending.setService("CUSTOMER_SERVICE");
                pending.setEntityId(ownerId);
                pending.setActionType("DELETE");
                pendingActionRepository.save(pending);
            }
            throw ex;
        }
    }

    @Transactional
    public void createStaff(RegisterRequest request){

        checkRegisterRequest(request);

        StaffRequest body = new StaffRequest(
                request.getFullName().trim(),
                request.getPhone().trim(),
                null,
                request.getWarehouseId()
        );
        boolean emailVerified = false;
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            if (!verificationCodeRepository.existsByEmailAndIsVerified(request.getEmail(), true)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email chưa được xác thực!");
            }
            body.setEmail(request.getEmail().trim());
            emailVerified = true;
        }
        OwnerIdResponse response = null;
        Long ownerId = null;

        try {
            if (request.getWarehouseId() == null) {
                response = staffServiceClient.createStaff(body);
                ownerId = response.getOwnerId();

                Role role = roleService.getRoleById(3L);
                createAccount(
                        request.getUsername().trim(),
                        request.getPassword().trim(),
                        ownerId,
                        role,
                        emailVerified
                );
            } else {
                if (request.getPhone() == null || request.getPhone().isBlank()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng điền số điện thoại!");
                }
                response = deliveryServiceClient.createShipper(body);
                ownerId = response.getOwnerId();

                Role role = roleService.getRoleById(5L);
                createAccount(
                        request.getUsername().trim(),
                        request.getPassword().trim(),
                        ownerId,
                        role,
                        emailVerified
                );
            }


        } catch (Exception ex) {
            if (ownerId != null) {
                PendingAction pending = new PendingAction();
                pending.setService(request.getWarehouseId() == null?"STAFF_SERVICE":"DELIVERY_SERVICE");
                pending.setEntityId(ownerId);
                pending.setActionType("DELETE");
                pendingActionRepository.save(pending);
            }
            throw ex;
        }
    }

    public void checkRegisterRequest(RegisterRequest request) {
        if (request.getUsername().contains("@")
                || !request.getUsername().matches("^[a-zA-Z0-9_-]+$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên tài khoản không được chứa kí tự đặc biệt!");
        }
        if (request.getUsername().length() > 20) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên tài khoản quá dài!");
        }
        if (accountRepository.existsByUsername(request.getUsername())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên tài khoản đã tồn tại!");
        }
    }

    public boolean checkAccountIsVerified(Long id) {
        return accountRepository.existsByIdAndIsVerified(id, true);
    }

    public AccountResponse toAccountResponse(Account account) {
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
