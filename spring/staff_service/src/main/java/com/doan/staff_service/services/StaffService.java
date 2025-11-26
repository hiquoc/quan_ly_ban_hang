package com.doan.staff_service.services;

import com.doan.staff_service.dtos.StaffRequest;
import com.doan.staff_service.dtos.StaffResponse;
import com.doan.staff_service.dtos.StaffDetailsResponse;
import com.doan.staff_service.models.Staff;
import com.doan.staff_service.repositories.AuthRepositoryClient;
import com.doan.staff_service.repositories.InventoryRepositoryClient;
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
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@AllArgsConstructor
public class StaffService {
    private final StaffRepository staffRepository;
    private final AuthRepositoryClient authRepositoryClient;
    private final InventoryRepositoryClient inventoryRepositoryClient;

    public Staff createStaff(StaffRequest request) {
        try {
            if (!inventoryRepositoryClient.checkWarehouseId(request.getWarehouseId()))
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Mã kho không tồn tại!");
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi hệ thống khi kiểm tra kho!");
        }
        Staff staff = new Staff(request.getFullName() != null ? request.getFullName().trim() : null
                , request.getEmail() != null ? request.getEmail().trim() : null,
                request.getPhone() != null ? request.getPhone().trim() : null,
                request.getWarehouseId());
        staffRepository.save(staff);
        return staff;
    }

    public Staff getStaffById(Long id) {
        return staffRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy staff với id:" + id));
    }

    public List<Staff> getStaffByIds(List<Long> ids) {
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
    public void updateStaff(Long id, StaffRequest request) {
        Staff staff = staffRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy staff với id:" + id));
        if (!Objects.equals(request.getFullName(), "") && !Objects.equals(staff.getFullName(), request.getFullName())) {
            staff.setFullName(request.getFullName());
        }
        if (!Objects.equals(request.getPhone(), "") && !Objects.equals(staff.getPhone(), request.getPhone())) {
            if (staffRepository.existsByPhoneAndIdNot(request.getPhone(), id)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điện thoại đã được sử dụng!");
            }
            staff.setPhone(request.getPhone());
        }
        if (!Objects.equals(request.getEmail(), "") && !Objects.equals(staff.getEmail(), request.getEmail())) {
            if (staffRepository.existsByEmailAndIdNot(request.getEmail(), id)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email đã được sử dụng!");
            }
            staff.setEmail(request.getEmail());
        }
    }

    public List<Staff> getAllStaffs() {
        return staffRepository.findAll();
    }

    public Page<StaffDetailsResponse> getAllStaffs(Integer page, Integer size, String keyword, Long warehouseId, Boolean active) {
        int pageNumber = page != null && page > 0 ? page : 0;
        int pageSize = size != null && size > 0 ? size : 10;
        Page<Staff> staffPage = staffRepository.findAllByKeywordAndStatusAndWarehouseId(
                (keyword != null && !keyword.isBlank()) ? keyword : null,
                (warehouseId != null && warehouseId > 0) ? warehouseId : null,
                active,
                PageRequest.of(pageNumber, pageSize)
        );
        try {
            Map<Long, String> roleResponse = authRepositoryClient.getStaffsRole(staffPage.getContent().stream().map(Staff::getId).toList());
            return staffPage.map(staff -> new StaffDetailsResponse(staff.getId()
                    ,staff.getFullName(),staff.getEmail(),staff.getPhone()
                    ,staff.getWarehouseId(),staff.getIsActive(),roleResponse.get(staff.getId()),staff.getCreatedAt()));
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi hệ thống khi lấy thông tin quyền của nhân viên!");
        }
    }

    public Staff getUserByEmail(String email) {
        return staffRepository.getStaffByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy Email!"));
    }

    public void deleteStaff(Long id) {
        Staff staff = staffRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Staff not found with id: " + id));
        staffRepository.delete(staff);
    }

    public void checkRegisterRequest(StaffRequest request) {
        if (request.getEmail() != null && !request.getEmail().isEmpty()
                && staffRepository.existsByEmail(request.getEmail().trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email đã được sử dụng!");
        }
        if (request.getPhone() != null && !request.getPhone().isEmpty()
                && staffRepository.existsByPhone(request.getPhone().trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điện thoại đã được sử dụng!");
        }
    }

    public List<StaffResponse> getStaffByIdLike(Long id) {
        String idPart = String.valueOf(id);
        List<Staff> staffList = staffRepository.findByIdLike(idPart);
        return staffList.stream().map(staff ->
                new StaffResponse(staff.getId(), staff.getFullName(), staff.getEmail(), staff.getPhone(), staff.getCreatedAt(), staff.getWarehouseId())).toList();
    }


    public void updateStaffActive(Long id, boolean callToAuth) {
        Staff staff = staffRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Staff not found with id: " + id));
        staff.setIsActive(!staff.getIsActive());
        if (callToAuth) {
            try {
                authRepositoryClient.changeAccountActive(id, 3L);
            } catch (Exception e) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi hệ thống!");
            }
        }
        staffRepository.save(staff);
    }

    public void updateStaffWarehouse(Long id, Long warehouseId) {
        if (warehouseId == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng nhập mã kho");
        Staff staff = staffRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Staff not found with id: " + id));
        try {
            if (!inventoryRepositoryClient.checkWarehouseId(warehouseId))
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Mã kho không tồn tại!");
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi hệ thống khi kiểm tra kho!");
        }
        staff.setWarehouseId(warehouseId);
        staffRepository.save(staff);
    }

    public void updateStaffRole(Long id, Long roleId) {
        if (!staffRepository.existsById(id))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhân viên!");
        try {
            authRepositoryClient.changeStaffRole(id, roleId);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi hệ thống!");
        }
    }
}
