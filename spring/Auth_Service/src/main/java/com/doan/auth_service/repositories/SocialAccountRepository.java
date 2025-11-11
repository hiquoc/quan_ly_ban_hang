package com.doan.auth_service.repositories;

import com.doan.auth_service.models.Account;
import com.doan.auth_service.models.SocialAccount;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SocialAccountRepository extends JpaRepository<SocialAccount,Long>{
    Optional<SocialAccount> findByProviderAndProviderId(String provider,String providerId);

    Optional<SocialAccount> findByAccountId(Long accountId);
}
