package com.doan.staff_service.services;

import com.doan.staff_service.dtos.StaffRequest;
import com.doan.staff_service.models.Staff;
import com.doan.staff_service.repositories.StaffRepository;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

@Service
@AllArgsConstructor
public class StaffService {
    private final StaffRepository staffRepository;
    public Staff createStaff(StaffRequest staffRequest){
        Staff staff =new Staff(staffRequest.getFullName().trim(),
                staffRequest.getPhone().trim(), staffRequest.getEmail().trim());
        staffRepository.save(staff);
        return staff;
    }
    public Staff getStaffById(Long id){
        return staffRepository.findById(id)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy staff với id:"+id));
    }
    public List<Staff> getStaffByIds(List<Long> ids){
        return staffRepository.findAllByIdIn(ids);
    }

    public Page<Staff> getStaffByKeyword(String keyword, String type, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);

        if (keyword == null || keyword.isEmpty()) {
            return staffRepository.findAll(pageable);
        }

        switch (type) {
            case "name":
                return staffRepository.findByFullNameContainingIgnoreCase(keyword, pageable);
            case "email":
                return staffRepository.findByEmailContainingIgnoreCase(keyword, pageable);
            case "phone":
                return staffRepository.findByPhoneContaining(keyword, pageable);
            default:
                List<Staff> result = new ArrayList<>();
                result.addAll(staffRepository.findByFullNameContainingIgnoreCase(keyword, pageable).getContent());
                result.addAll(staffRepository.findByEmailContainingIgnoreCase(keyword, pageable).getContent());
                result.addAll(staffRepository.findByPhoneContaining(keyword, pageable).getContent());
                return new PageImpl<>(result, pageable, result.size());
        }
    }

    @Transactional
    public void updateStaff(Long id,StaffRequest request){
         Staff staff= staffRepository.findById(id)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy staff với id:"+id));
         if(!Objects.equals(request.getFullName(), "") && !Objects.equals(staff.getFullName(), request.getFullName())){
             staff.setFullName(request.getFullName());
         }
         if(!Objects.equals(request.getPhone(), "") && !Objects.equals(staff.getPhone(), request.getPhone())){
             if(staffRepository.existsByPhoneAndIdNot(request.getPhone(),id)){
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Số điện thoại đã được sử dụng!");
             }
             staff.setPhone(request.getPhone());
         }
         if(!Objects.equals(request.getEmail(), "") && !Objects.equals(staff.getEmail(), request.getEmail())){
            if(staffRepository.existsByEmailAndIdNot(request.getEmail(),id)){
               throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Email đã được sử dụng!");
            }                                                                                                 
            staff.setEmail(request.getEmail());
         }
    }
    public List<Staff> getAllStaffs(){
        return staffRepository.findAll();
    }
    public Staff getUserByEmail(String email){
        return staffRepository.getStaffByEmail(email)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy Email!"));
    }
    public void deleteStaff(Long id){
        Staff staff = staffRepository.findById(id)
                .orElseThrow(()->new RuntimeException("Staff not found with id: "+id));
        staffRepository.delete(staff);
    }
    public void checkRegisterRequest(StaffRequest request){
        if(request.getEmail() != null && !request.getEmail().isEmpty()
                && staffRepository.existsByEmail(request.getEmail().trim())){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Email đã được sử dụng!");
        }
        if(request.getPhone() != null && !request.getPhone().isEmpty()
                && staffRepository.existsByPhone(request.getPhone().trim())){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Số điện thoại đã được sử dụng!");
        }
    }

}
