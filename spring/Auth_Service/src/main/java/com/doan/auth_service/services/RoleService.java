package com.doan.auth_service.services;

import com.doan.auth_service.models.Role;
import com.doan.auth_service.repositories.RoleRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@AllArgsConstructor
public class RoleService {
    private final RoleRepository roleRepository;
    public Role findRoleById(Long id){
        return roleRepository.findById(id)
                .orElseThrow(()->new RuntimeException("Role not found with id: "+id));
    }
    public List<Role> getAllRoles(){
        return roleRepository.findAll();
    }
}
