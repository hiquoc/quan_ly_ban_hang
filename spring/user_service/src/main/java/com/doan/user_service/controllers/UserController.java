package com.doan.user_service.controllers;

import com.doan.user_service.dtos.UserRequest;
import com.doan.user_service.dtos.OwnerIdResponse;
import com.doan.user_service.dtos.UserResponse;
import com.doan.user_service.models.User;
import com.doan.user_service.services.UserService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("")
@AllArgsConstructor
public class UserController {
    private final UserService userService;

    @PostMapping("/internal/users")
    public ResponseEntity<?> createUser(@RequestBody UserRequest userRequest){
        try{
            userService.checkRegisterRequest(userRequest);
            User user=userService.createUser(userRequest);
            System.out.println("Created User: " + userRequest.getFullName());

            OwnerIdResponse response=new OwnerIdResponse();
            response.setOwnerId(user.getId());
            return ResponseEntity.ok(response);
        } catch (ResponseStatusException ex) {
            Map<String,Object> error = new HashMap<>();
            error.put("message", ex.getReason());
            error.put("success", false);
            return ResponseEntity.status(ex.getStatusCode()).body(error);
        }
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @GetMapping("/secure/users")
    public List<UserResponse> getAllUsers(){
        List<User> usersList=userService.getAllUsers();
        return usersList.stream()
                .map(user->new UserResponse(
                        user.getId(),
                        user.getFullName(),
                        user.getEmail(),
                        user.getPhone(),
                        user.getCreatedAt()
                ))
                .collect(Collectors.toList());
    }
    @DeleteMapping("")
    public void deleteUser(Long id){
        userService.deleteUser(id);
    }
}
