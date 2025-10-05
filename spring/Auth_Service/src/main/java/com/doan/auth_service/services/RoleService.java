package com.doan.auth_service.services;

import com.doan.auth_service.models.Role;
import com.doan.auth_service.repositories.RoleRepository;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@AllArgsConstructor
public class RoleService {
    private final RoleRepository roleRepository;
    public Role getRoleById(Long id){
        return roleRepository.findById(id)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Khong tim thay role voi id: "+id));
    }
}
