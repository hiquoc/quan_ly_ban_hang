package com.doan.staff_service.controllers;

import com.doan.staff_service.dtos.*;
import com.doan.staff_service.models.Staff;
import com.doan.staff_service.services.StaffService;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

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
    public ResponseEntity<?> getAllStaffs(@RequestParam(required = false) Integer page,
                                            @RequestParam(required = false) Integer size,
                                            @RequestParam(required = false) String keyword,
                                            @RequestParam(required = false) Long warehouseId,
                                            @RequestParam(required = false) Boolean active){
        Page<StaffDetailsResponse> staff= staffService.getAllStaffs(page,size,keyword,warehouseId,active);
        return ResponseEntity.ok(new ApiResponse<>("Lấy thông tin staff thành công!",true, staff));
    }
    @GetMapping("/secure/staffs/{id}")
    public ResponseEntity<?> getStaffInfo(@PathVariable Long id,
                                          @RequestHeader("X-Owner-Id") Long staffId,
                                          @RequestHeader("X-User-Role") String role){
        try{
           if(!Objects.equals(id, staffId) && (!role.equals("ADMIN") && !role.equals("MANAGER"))){
               throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Bạn không có quyền truy vấn dữ liệu này!");
           }
           return ResponseEntity.ok(new ApiResponse<>("Lấy thông tin staff thành công!",true, staffService.getStaffById(id)));
        }catch (ResponseStatusException ex){
            return errorResponse(ex);
        }
    }

    @PutMapping("/secure/staffs/{id}")
    public ResponseEntity<?> updateStaffInfo(@PathVariable Long id,
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
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @PutMapping("/secure/staffs/{id}/active/role/{role}")
    public ResponseEntity<?> updateStaffActive(@PathVariable Long id,@PathVariable String role,
                                               @RequestHeader("X-User-Role")String staffRole,
                                               @RequestHeader("X-Owner-Id")Long staffId){
        try{
            if (Objects.equals(staffId, id)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không thể khóa chính mình!");
            }
            if (Objects.equals(staffRole, "ADMIN")) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không thể thay đổi trạng thái của ADMIN!");
            }
            if (!canChangeRole(staffRole, role)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền thay đổi trạng thái nhân viên này!");
            }
            staffService.updateStaffActive(id,true);
            return ResponseEntity.ok(new ApiResponse<>("Cập nhật trạng thái staff thành công!",true,null));
        }catch (ResponseStatusException ex){
            return errorResponse(ex);
        }
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @PatchMapping("/secure/staffs/{id}/role/{roleId}")
    public ResponseEntity<?> updateStaffRole(@PathVariable Long id,@PathVariable Long roleId,
                                             @RequestHeader("X-Owner-Id")Long staffId){
        try{
            if (staffId.equals(id)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không thể thay đổi quyền của chính mình!");
            }
            staffService.updateStaffRole(id,roleId);
            return ResponseEntity.ok(new ApiResponse<>("Cập nhật trạng thái staff thành công!",true,null));
        }catch (ResponseStatusException ex){
            return errorResponse(ex);
        }
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @PatchMapping("/secure/staffs/{id}/warehouse/{warehouseId}")
    public ResponseEntity<?> updateStaffWarehouse(@PathVariable Long id,@PathVariable Long warehouseId){
        try{
            staffService.updateStaffWarehouse(id,warehouseId);
            return ResponseEntity.ok(new ApiResponse<>("Cập nhật kho staff thành công!",true,null));
        }catch (ResponseStatusException ex){
            return errorResponse(ex);
        }
    }
    @GetMapping("/internal/staffs/{id}")
    public ResponseEntity<?> getStaffByIdLike(@PathVariable Long id) {
        try {
            List <StaffResponse> list = staffService.getStaffByIdLike(id);
            return ResponseEntity.ok(list);
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @GetMapping("/internal/staffs/ids")
    public ResponseEntity<?> getStaffByIds(@RequestParam List<Long> ids) {
        try {
            List <StaffResponse> list = staffService.getStaffByIds(ids).stream().map(staff ->
                    new StaffResponse(staff.getId(),staff.getFullName(),staff.getEmail(),staff.getPhone(),staff.getCreatedAt(),staff.getWarehouseId())).toList();
            return ResponseEntity.ok(list);
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @GetMapping("/internal/staffs/keyword")
    public ResponseEntity<?> getCustomerByKeyword(@RequestParam String keyword,
                                                  @RequestParam String type,
                                                  @RequestParam Integer page,
                                                  @RequestParam Integer size) {
        try {
            List <StaffResponse> list = staffService.getStaffByKeyword(keyword,type,page,size).stream().map(staff ->
                    new StaffResponse(staff.getId(),staff.getFullName(),staff.getEmail(),staff.getPhone(),staff.getCreatedAt(), staff.getWarehouseId())).toList();
            return ResponseEntity.ok(list);
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @GetMapping("/internal/staffs")
    public ResponseEntity<?> getStaffIdByEmail(@RequestParam String email){
        try{
            Staff staff = staffService.getUserByEmail(email);
            OwnerIdResponse response=new OwnerIdResponse();
            response.setOwnerId(staff.getId());
            return ResponseEntity.ok(response);
        }catch (ResponseStatusException ex){
            return errorResponse(ex);
        }
    }
    @PostMapping("/internal/staffs/{id}/active")
    public ResponseEntity<?> updateStaffActiveInternal(@PathVariable Long id){
        try{
            staffService.updateStaffActive(id,false);
            return ResponseEntity.ok(new ApiResponse<>("Cập nhật trạng thái staff thành công!",true,null));
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
    private boolean canChangeRole(String userRole, String targetRole) {
        return switch (userRole) {
            case "ADMIN" -> true; // Admin can change anyone except ADMIN itself
            case "MANAGER" -> !Objects.equals(targetRole, "ADMIN") && !Objects.equals(targetRole, "MANAGER"); // cannot change ADMIN or MANAGER
            default -> false; // Staff cannot change anyone
        };
    }
}
