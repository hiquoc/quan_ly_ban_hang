package com.doan.auth_service.services;

import com.doan.auth_service.dtos.Customer.CustomerRequest;
import com.doan.auth_service.dtos.Staff.OwnerIdResponse;
import com.doan.auth_service.models.Account;
import com.doan.auth_service.models.PendingAction;
import com.doan.auth_service.models.SocialAccount;
import com.doan.auth_service.models.UserPrincipal;
import com.doan.auth_service.repositories.AccountRepository;
import com.doan.auth_service.repositories.PendingActionRepository;
import com.doan.auth_service.repositories.RoleRepository;
import com.doan.auth_service.repositories.SocialAccountRepository;
import lombok.AllArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;

@Service
@AllArgsConstructor
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    private final SocialAccountRepository socialAccountRepository;
    private final AccountRepository accountRepository;
    private final RoleRepository roleRepository;
    private final CustomerServiceClient customerServiceClient;
    private final PendingActionRepository pendingActionRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    @Transactional
    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = new DefaultOAuth2UserService().loadUser(userRequest);

        String provider = userRequest.getClientRegistration().getRegistrationId();
        String providerId;
        if ("google".equals(provider)) {
            providerId = oAuth2User.getAttribute("sub");
        } else if ("facebook".equals(provider)) {
            providerId = oAuth2User.getAttribute("id");
        } else {
            throw new OAuth2AuthenticationException("Unknown provider: " + provider);
        }

        String email = oAuth2User.getAttribute("email");
        if (email == null || email.isEmpty()) {
            email = provider + "_" + providerId;
        }

        Optional<SocialAccount> saOpt = socialAccountRepository.findByProviderAndProviderId(provider, providerId);
        Account account;

        if (saOpt.isPresent()) {
            account = saOpt.get().getAccount();
        } else {
            CustomerRequest customerRequest = new CustomerRequest(null, null, email);
            Long ownerId = null;

            try {
                OwnerIdResponse response = customerServiceClient.createCustomer(customerRequest);
                ownerId = response.getOwnerId();

                account = new Account();
                account.setUsername(email);
                account.setOwnerId(ownerId);
                account.setIsVerified(true);
                account.setIsActive(true);
                account.setRole(roleRepository.findById(4L).orElseThrow());
                String randomPassword = passwordEncoder.encode(java.util.UUID.randomUUID().toString());
                account.setPassword(randomPassword);
                accountRepository.save(account);

                SocialAccount sa = new SocialAccount();
                sa.setAccount(account);
                sa.setProvider(provider);
                sa.setProviderId(providerId);
                socialAccountRepository.save(sa);

            } catch (Exception ex) {
                if (ownerId != null) {
                    PendingAction pending = new PendingAction();
                    pending.setService("CUSTOMER_SERVICE");
                    pending.setEntityId(ownerId);
                    pending.setActionType("DELETE");
                    pendingActionRepository.save(pending);
                }
                throw new ResponseStatusException(500, "Failed to create account for social login provider: " + provider, ex);
            }
        }

        return new UserPrincipal(account);
    }
}
