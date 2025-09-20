package com.quanlybanhang.banhang_system.services;

import com.quanlybanhang.banhang_system.models.Order;
import com.quanlybanhang.banhang_system.repositories.OrderRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class OrderService {
    private final OrderRepository orderRepository;
    public OrderService(OrderRepository orderRepository){
        this.orderRepository=orderRepository;
    }
    public List<Order> getAllOrders(){
        return orderRepository.findAll();
    }
    public Order getOrderById(Long id){
        return orderRepository.findById(id)
                .orElseThrow(()->new RuntimeException("Order not found with id: "+id));
    }
    public List<Order> getOrdersByCustomerId(Long id){
        return null;
    }
    public Order createOrder(Order order){
        return orderRepository.save(order);
    }
    public Order updateOrder(Long id,Order orderDetails){
        return orderRepository.findById(id)
                .map(order->{
                    order.setTinh(orderDetails.getTinh());
                    order.setQuan(orderDetails.getQuan());
                    order.setHuyen(orderDetails.getHuyen());
                    order.setSonha(orderDetails.getSonha());
                    order.setStatus(orderDetails.getStatus());
                    return orderRepository.save(order);
                })
                .orElseThrow(()->new RuntimeException("Order not found"));
    }
    public void deleteOrder(Long id){
        orderRepository.deleteById(id);
    }
}
