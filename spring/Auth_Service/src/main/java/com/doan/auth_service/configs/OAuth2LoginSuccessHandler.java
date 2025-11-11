package com.doan.auth_service.configs;

import com.doan.auth_service.dtos.Customer.CustomerRequest;
import com.doan.auth_service.dtos.Login.LoginResponse;
import com.doan.auth_service.dtos.Staff.OwnerIdResponse;
import com.doan.auth_service.models.Account;
import com.doan.auth_service.models.SocialAccount;
import com.doan.auth_service.models.UserPrincipal;
import com.doan.auth_service.repositories.AccountRepository;
import com.doan.auth_service.repositories.RoleRepository;
import com.doan.auth_service.repositories.SocialAccountRepository;
import com.doan.auth_service.repositories.PendingActionRepository;
import com.doan.auth_service.services.CustomerServiceClient;
import com.doan.auth_service.utils.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final JwtUtil jwtUtil;
    private final AccountRepository accountRepository;
    private final RoleRepository roleRepository;
    private final SocialAccountRepository socialAccountRepository;
    private final CustomerServiceClient customerServiceClient;
    private final ObjectMapper objectMapper;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Override
    @Transactional
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        UserPrincipal principal;

        if (authentication.getPrincipal() instanceof UserPrincipal up) {
            principal = up; // normal login
        } else if (authentication.getPrincipal() instanceof OAuth2User oauthUser) {
            // OAuth2 login
            String provider = oauthUser.getAttribute("sub") != null ? "google" : "facebook";
            String providerId = provider.equals("google") ? oauthUser.getAttribute("sub") : oauthUser.getAttribute("id");

            String email = oauthUser.getAttribute("email");
            if (email == null || email.isEmpty()) email = provider + "_" + providerId;

            Optional<SocialAccount> saOpt = socialAccountRepository.findByProviderAndProviderId(provider, providerId);
            Account account;

            if (saOpt.isPresent()) {
                account = saOpt.get().getAccount();
            } else {
                // check existing customer by email
                Long ownerId;
                try {
                    ownerId = customerServiceClient.getCustomerIdByEmail(email).getOwnerId();
                    Long finalOwnerId = ownerId;
                    String finalEmail = email;
                    account = accountRepository.findByOwnerIdAndRole_Id(ownerId,4L)
                            .orElseGet(() -> createNewAccount( finalOwnerId, finalEmail));
                } catch (ResponseStatusException ex) {
                    if (ex.getStatusCode().value() == 404) {
                        // customer not exist → create new customer & account
                        ownerId = customerServiceClient.createCustomer(new CustomerRequest(null, null, email)).getOwnerId();
                        account = createNewAccount(ownerId,email);
                    } else throw ex;
                }

                // link social account
                SocialAccount sa = new SocialAccount();
                sa.setAccount(account);
                sa.setProvider(provider);
                sa.setProviderId(providerId);
                socialAccountRepository.save(sa);
            }

            principal = new UserPrincipal(account);
        } else {
            throw new IllegalStateException("Unexpected principal type");
        }

        // Generate token
        String token = jwtUtil.generateToken(
                principal.getUsername(),
                principal.getAccount().getId(),
                principal.getAccount().getRole().getName(),
                principal.getAccount().getOwnerId()
        );

        LoginResponse loginResponse = new LoginResponse();
        loginResponse.setUsername(principal.getUsername());
        loginResponse.setRole(principal.getAccount().getRole().getName());
        loginResponse.setToken(token);

        String redirectUrl = "http://localhost:5173/login?token=" + token;
        response.sendRedirect(redirectUrl);
    }

    private Account createNewAccount(Long ownerId, String email) {
        Account account = new Account();
        account.setUsername(email); // use email as username
        account.setOwnerId(ownerId);
        account.setIsActive(true);
        account.setIsVerified(true);
        account.setRole(roleRepository.findById(4L).orElseThrow());
        account.setPassword(passwordEncoder.encode(UUID.randomUUID().toString())); // random password
        return accountRepository.save(account);
    }

}

