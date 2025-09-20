package com.quanlybanhang.banhang_system.mappers;

import com.quanlybanhang.banhang_system.dtos.Account.AccountResponse;
import com.quanlybanhang.banhang_system.models.Account;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface AccountMapper {
    @Mapping(target="message",ignore=true)
    @Mapping(target="token",ignore = true)
    AccountResponse toResponse(Account account);

    List<AccountResponse> toResponseList(List<Account> accounts);
    Account toEntity(AccountResponse accountResponse);
}
