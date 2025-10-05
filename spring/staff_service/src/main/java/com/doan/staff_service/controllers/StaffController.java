package com.doan.staff_service.controllers;

import com.doan.staff_service.dtos.ApiResponse;
import com.doan.staff_service.dtos.StaffRequest;
import com.doan.staff_service.dtos.OwnerIdResponse;
import com.doan.staff_service.dtos.StaffResponse;
import com.doan.staff_service.models.Staff;
import com.doan.staff_service.services.StaffService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@RestController
@RequestMapping("")
@AllArgsConstructor
public class StaffController {
    private final StaffService staffService;

    @PostMapping("/internal/staffs")
    public ResponseEntity<?> createStaff(@RequestBody StaffRequest staffRequest){
        try{
            staffService.checkRegisterRequest(staffRequest);
            Staff staff = staffService.createStaff(staffRequest);

            OwnerIdResponse response=new OwnerIdResponse();
            response.setOwnerId(staff.getId());
            return ResponseEntity.ok(response);
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @GetMapping("/secure/staffs")
    public List<StaffResponse> getAllStaffs(){
        List<Staff> staffsList= staffService.getAllStaffs();
        return staffsList.stream()
                .map(staff ->new StaffResponse(
                        staff.getId(),
                        staff.getFullName(),
                        staff.getEmail(),
                        staff.getPhone(),
                        staff.getCreatedAt()
                ))
                .collect(Collectors.toList());
    }
    @GetMapping("/secure/staffs/{id}")
    public ResponseEntity<?> getStaffInfo(@PathVariable Long id,
                                          @RequestHeader("X-Owner-Id") Long staffId){
        try{
           if(!Objects.equals(id, staffId)){
               throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Bạn không có quyền truy vấn dữ liệu này!");
           }
           return ResponseEntity.ok(new ApiResponse<>("Lấy thông tin staff thành công!",true, staffService.getStaffById(id)));
        }catch (ResponseStatusException ex){
            return errorResponse(ex);
        }
    }

    @PutMapping("/secure/staffs/{id}")
    public ResponseEntity<?> udpateStaffInfo(@PathVariable Long id,
                                          @RequestBody StaffRequest request,
                                          @RequestHeader("X-Owner-Id") Long staffId){
        try{
            if(!Objects.equals(id, staffId)){
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Bạn không có quyền truy vấn dữ liệu này!");
            }
            staffService.updateStaff(id,request);
            return ResponseEntity.ok(new ApiResponse<>("Cập nhật thông tin staff thành công!",true,null));
        }catch (ResponseStatusException ex){
            return errorResponse(ex);
        }
    }

    @GetMapping("/internal/staffs")
    public ResponseEntity<?> getUserIdByEmail(@RequestParam String email){
        try{
            Staff staff = staffService.getUserByEmail(email);
            OwnerIdResponse response=new OwnerIdResponse();
            response.setOwnerId(staff.getId());
            return ResponseEntity.ok(response);
        }catch (ResponseStatusException ex){
            return errorResponse(ex);
        }
    }
    @DeleteMapping("/internal/staffs/{id}")
    public ResponseEntity<?> deleteStaff(@PathVariable Long id){
        try{
            staffService.deleteStaff(id);
            return ResponseEntity.noContent().build();
        }catch (ResponseStatusException ex){
            return errorResponse(ex);
        }
    }
    private ResponseEntity<Map<String, Object>> errorResponse(ResponseStatusException ex) {
        Map<String, Object> error = new HashMap<>();
        error.put("message", ex.getReason());
        error.put("success", false);
        return ResponseEntity.status(ex.getStatusCode()).body(error);
    }
}
