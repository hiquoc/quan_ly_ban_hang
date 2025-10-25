package com.doan.customer_service.services;

import com.doan.customer_service.dtos.AddressRequest;
import com.doan.customer_service.models.Address;
import com.doan.customer_service.models.Customer;
import com.doan.customer_service.repositories.AddressRepository;
import com.doan.customer_service.repositories.CustomerRepository;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Objects;

@Service
@AllArgsConstructor
public class AddressService {
    private final CustomerRepository customerRepository;
    private final AddressRepository addressRepository;

    public Address createAddress(AddressRequest request){
        Customer customer=customerRepository.findById(request.getCustomerId())
                .orElseThrow(()->new RuntimeException("Không tìm thấy customer với id: "+request.getCustomerId()));
        if(request.getName()==null || request.getPhone()==null ||request.getStreet()==null || request.getWard()==null || request.getDistrict()==null ||request.getCity()==null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Vui lòng điền đầy đủ thông tin!");
        Address address=new Address(customer,request.getName(),request.getPhone(),request.getStreet(),request.getWard(),request.getDistrict(),request.getCity());
        return addressRepository.save(address);
    }
    public Address getAddress(Long id){
        return addressRepository.findById(id)
                .orElseThrow(()->new RuntimeException("Không tìm thấy địa chỉ với id: "+id));
    }
    public List<Address> getAllAddressesOfACustomer(Long id){
        return addressRepository.findByCustomerId(id);
    }

    @Transactional
    public void updateAddress(Long id, AddressRequest request,Long customerId){
        Address address=addressRepository.findById(id)
                .orElseThrow(()->new RuntimeException("Không tìm thấy địa chỉ với id: "+id));
        if(!Objects.equals(address.getCustomer().getId(), customerId)){
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Bạn không có quyền chỉnh sửa dữ liệu!");
        }
        if(request.getName()==null ||request.getPhone()==null ||request.getStreet()==null || request.getWard()==null || request.getDistrict()==null ||request.getCity()==null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Vui lòng điền đầy đủ thông tin!");
        address.setName((request.getName()));
        address.setPhone(request.getPhone());
        address.setStreet(request.getStreet());
        address.setWard(request.getWard());
        address.setDistrict(request.getDistrict());
        address.setCity(request.getCity());
    }
    @Transactional
    public void changeMainAddress(Long id,Long customerId){
        Address address=addressRepository.findById(id)
                .orElseThrow(()->new RuntimeException("Không tìm thấy địa chỉ với id: "+id));
        if(!Objects.equals(address.getCustomer().getId(), customerId)){
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Bạn không có quyền chỉnh sửa dữ liệu!");
        }
        addressRepository.findByCustomerIdAndIsMainIsTrue(customerId)
                .ifPresent(mainAddress -> mainAddress.setIsMain(false));

        address.setIsMain(true);
    }
    public void deleteAddress(Long id,Long customerId){
        Address address=addressRepository.findById(id)
                .orElseThrow(()->new RuntimeException("Không tìm thấy địa chỉ với id: "+id));
        if(!Objects.equals(address.getCustomer().getId(), customerId)){
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Bạn không có quyền chỉnh sửa dữ liệu!");
        }
        addressRepository.delete(address);
    }
}
