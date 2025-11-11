package com.doan.auth_service.models;

import com.doan.auth_service.models.Account;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.Collection;
import java.util.List;
import java.util.Map;

public class UserPrincipal implements OAuth2User, UserDetails {

    private final Account account;

    public UserPrincipal(Account account) {
        this.account = account;
    }

    public Account getAccount() {
        return account;
    }

    // ----------------- UserDetails -----------------
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority(account.getRole().getName()));
    }

    @Override
    public String getPassword() {
        return account.getPassword();
    }

    @Override
    public String getUsername() {
        return account.getUsername();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return account.getIsActive();
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return account.getIsVerified();
    }

    // ----------------- OAuth2User -----------------
    @Override
    public Map<String, Object> getAttributes() {
        return Map.of(
                "username", account.getUsername(),
                "email", account.getUsername()
        );
    }

    @Override
    public String getName() {
        return account.getUsername();
    }
}
