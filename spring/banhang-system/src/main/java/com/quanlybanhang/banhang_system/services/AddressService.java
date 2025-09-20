package com.quanlybanhang.banhang_system.services;

import com.quanlybanhang.banhang_system.models.Address;
import com.quanlybanhang.banhang_system.repositories.AddressRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AddressService {
    private final AddressRepository addressRepository;
    public AddressService(AddressRepository addressRepository){
        this.addressRepository=addressRepository;
    }
    public Address getAddressById(Long id){
          return addressRepository.findById(id)
                  .orElseThrow(()->new RuntimeException("Address not found with id: "+id));
    }
    public Address createAddress(Address address){
        return addressRepository.save(address);
    }
}
