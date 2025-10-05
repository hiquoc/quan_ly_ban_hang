package com.doan.auth_service.mappers;

import com.doan.auth_service.dtos.Login.LoginResponse;
import com.doan.auth_service.models.Account;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface AccountMapper {
    @Mapping(target="token",ignore = true)
    @Mapping(target="role", ignore = true)
    LoginResponse toResponse(Account account);

    List<LoginResponse> toResponseList(List<Account> accounts);
    @Mapping(target="role", ignore = true)
    Account toEntity(LoginResponse loginResponse);
}
