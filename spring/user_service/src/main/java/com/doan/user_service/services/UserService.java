package com.doan.user_service.services;

import com.doan.user_service.dtos.UserRequest;
import com.doan.user_service.models.User;
import com.doan.user_service.repositories.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@AllArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    public User createUser(UserRequest userRequest){
        User user=new User(userRequest.getFullName(), userRequest.getPhone(),userRequest.getEmail());
        userRepository.save(user);
        return user;
    }
    public List<User> getAllUsers(){
        return userRepository.findAll();
    }
    public void deleteUser(Long id){
        User user=userRepository.findById(id)
                .orElseThrow(()->new RuntimeException("User not found with id: "+id));
        userRepository.delete(user);
    }
    public void checkRegisterRequest(UserRequest request){
        if(request.getEmail() != null && !request.getEmail().isEmpty()
                && userRepository.existsByEmail(request.getEmail())){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Email đã được sử dụng!");
        }
        if(request.getPhone() != null && !request.getPhone().isEmpty()
                && userRepository.existsByPhone(request.getPhone())){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Phone đã được sử dụng!");
        }
    }
}
