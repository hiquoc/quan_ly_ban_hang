package com.quanlybanhang.banhang_system.services;

import com.quanlybanhang.banhang_system.models.Address;
import com.quanlybanhang.banhang_system.models.Customer;
import com.quanlybanhang.banhang_system.repositories.CustomerRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CustomerService {
    private final CustomerRepository customerRepository;
    private final AddressService addressService;

    public CustomerService(CustomerRepository customerRepository, AddressService addressService) {
        this.customerRepository = customerRepository;
        this.addressService = addressService;
    }
    public List<Customer> getAllCustomer(){
        return customerRepository.findAll();
    }
    public Customer getCustomerById(Long id){
        return customerRepository.findById(id)
                .orElseThrow(()->new RuntimeException("Customer not found with id: "+id));
    }
    public Customer createCustomer(Customer customer){
        return customerRepository.save(customer);
    }
    public Customer updateCustomer(Long id,Customer customerDetails){
        return customerRepository.findById(id)
                .map(customer -> {
                    customer.setName(customerDetails.getName());
                    customer.setPhone(customerDetails.getPhone());
                    customer.setEmail(customerDetails.getEmail());
                    return customerRepository.save(customer);
                })
                .orElseThrow(()->new RuntimeException("Customer not found with id: "+id));
    }
    public void deleteCustomer(Long id){
        customerRepository.deleteById(id);
    }

    public List<Address> getAllCustomerAddresses(Long id){
        return customerRepository.findById(id)
                .map(Customer::getAddress)
                .orElseThrow(()->new RuntimeException("Customer not found with id: "+id));
    }
    public Address getCustomerAddressById(Long id,Long addressId){
        Customer customer = customerRepository.findById(id)
                .orElseThrow(()->new RuntimeException("Customer not found with id: "+id));
        Address address= addressService.getAddressById(addressId);
        boolean belong=customer.getAddress()
                .stream()
                .anyMatch(a->a.getId().equals(addressId));
        if(!belong){
            throw new RuntimeException("Address does not belong to this customer");
        }
        return address;
    }
    public Address addAddressToCustomer(Long id,Address address){
        Customer customer=customerRepository.findById(id)
                .orElseThrow(()-> new RuntimeException("Customer not found with id: "+id));
        Address newAddress =addressService.createAddress(address);
        newAddress.setCustomer(customer);
        customer.getAddress().add(newAddress);
        if(customer.getAddress().size()==1)
            changeMainAddress(id,newAddress.getId());
        customerRepository.save(customer);
        return newAddress;
    }
    public Address updateCustomerAddress(Long id,Long addressId,Address addressDetails){
        Customer customer=customerRepository.findById(id)
                .orElseThrow(()->new RuntimeException("Customer not found with id: "+id));
        Address address=customer.getAddress().stream()
                .filter(a->a.getId().equals(addressId))
                .findFirst()
                .orElseThrow(()->new RuntimeException("Address not found for this customer;"));
        address.setTinh(addressDetails.getTinh());
        address.setQuan(addressDetails.getQuan());
        address.setHuyen(addressDetails.getHuyen());
        address.setSonha(addressDetails.getSonha());
        customerRepository.save(customer);
        return address;
    }
    public void changeMainAddress(Long id,Long addressId){
        Customer customer=customerRepository.findById(id)
                .orElseThrow(()->new RuntimeException("Customer not found with id: "+id));
        customer.getAddress()
                .forEach(a -> a.setIsMain(a.getId().equals(addressId)));
        customerRepository.save(customer);
    }
}
