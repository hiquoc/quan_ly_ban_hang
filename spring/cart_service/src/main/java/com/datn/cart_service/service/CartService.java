package com.datn.cart_service.service;

import com.datn.cart_service.client.InventoryServiceClient;
import com.datn.cart_service.client.ProductServiceClient;
import com.datn.cart_service.dto.VariantDTO;
import com.datn.cart_service.dto.request.AddToCartRequest;
import com.datn.cart_service.dto.request.UpdateCartRequest;
import com.datn.cart_service.dto.response.CartItemResponse;
import com.datn.cart_service.dto.response.CartResponse;
import com.datn.cart_service.entity.ShoppingCart;
import com.datn.cart_service.exception.CartNotFoundException;
import com.datn.cart_service.exception.ProductNotFoundException;
import com.datn.cart_service.exception.ProductNotAvailableException;
import com.datn.cart_service.repository.CartRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CartService {

    private final CartRepository cartRepository;
    private final ProductServiceClient productServiceClient;
    private final InventoryServiceClient inventoryServiceClient;
    @Autowired
    private CacheManager cacheManager;
    /**
     * Thêm variant vào giỏ hàng
     * CHỈ cho phép thêm variant có isAvailable = true
     */
    @CacheEvict(value = "customerCart",key = "#customerId")
    @Transactional
    public CartItemResponse addToCart(AddToCartRequest request, Long customerId) {
        log.info("Thêm vào giỏ - Khách hàng: {}, Variant: {}, Số lượng: {}",
                customerId, request.getVariantId(), request.getQuantity());

        // Kiểm tra variant có tồn tại và available không
        VariantDTO variant = validateVariantAvailable(request.getVariantId());

        // Kiểm tra variant đã có trong giỏ chưa
        Optional<ShoppingCart> existingCart = cartRepository
                .findByCustomerIdAndVariantId(customerId, request.getVariantId());

        ShoppingCart cart;
        if (existingCart.isPresent()) {
            // Cập nhật số lượng (cộng dồn)
            cart = existingCart.get();
            int newQuantity = cart.getQuantity() + request.getQuantity();
            cart.setQuantity(newQuantity);
            log.info("Cập nhật variant trong giỏ. Số lượng mới: {}", newQuantity);
        } else {
            // Tạo mới variant trong giỏ
            cart = ShoppingCart.builder()
                    .customerId(customerId)
                    .variantId(request.getVariantId())
                    .quantity(request.getQuantity())
                    .build();
            log.info("Tạo mới variant trong giỏ");
        }

        cart = cartRepository.save(cart);
        return mapToCartItemResponse(cart);
    }

    /**
     * Cập nhật số lượng variant trong giỏ
     * Không kiểm tra trạng thái available - cho phép cập nhật số lượng
     */
    @Transactional
    public CartItemResponse updateCartItem(Long cartId, UpdateCartRequest request) {
        log.info("Updating cart {} with quantity: {}", cartId, request.getQuantity());

        ShoppingCart cart = cartRepository.findById(cartId)
                .orElseThrow(() -> new CartNotFoundException("Cart item not found"));

        Integer availableQuantity;
        try {
            availableQuantity = Optional.ofNullable(
                    inventoryServiceClient.getAvailableQuantity(cart.getVariantId()).getBody()
            ).orElse(0);
        } catch (Exception e) {
            log.error("Failed to get availableQuantity for VariantId: {}", cart.getVariantId(), e);
            throw new RuntimeException("Failed to get availableQuantity for VariantId: " + cart.getVariantId(), e);
        }

        if (request.getQuantity() > availableQuantity) {
            cart.setQuantity(availableQuantity);
            throw new RuntimeException("Số lượng sản phẩm khả dụng có hạn!");
        } else {
            cart.setQuantity(request.getQuantity());
        }

        cart = cartRepository.save(cart);
        Cache cache = cacheManager.getCache("customerCart");
        if (cache != null) {
            cache.evict(cart.getCustomerId());
        }
        return mapToCartItemResponse(cart);
    }


    /**
     * Lấy giỏ hàng của khách hàng
     * Hiển thị tất cả variant kể cả không available với trạng thái tương ứng
     */
    @Cacheable(value = "customerCart",key = "#customerId")
    public CartResponse getCustomerCart(Long customerId) {
        log.info("Lấy giỏ hàng cho khách hàng: {}", customerId);

        List<ShoppingCart> cartItems = cartRepository.findByCustomerId(customerId);
        List<CartItemResponse> items = cartItems.stream()
                .map(this::mapToCartItemResponse)
                .collect(Collectors.toList());

        // Tính toán chỉ với những variant available
        List<CartItemResponse> availableItems = items.stream()
                .filter(item->!item.getStatus().equals("OUT_OF_STOCK"))
                .toList();

        Integer totalItems = availableItems.stream()
                .mapToInt(CartItemResponse::getQuantity)
                .sum();

        BigDecimal subtotal = availableItems.stream()
                .map(CartItemResponse::getTotalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return CartResponse.builder()
                .customerId(customerId)
                .items(items) // Trả về tất cả items kể cả không available
                .totalItems(totalItems) // Chỉ đếm items available
                .subtotal(subtotal) // Chỉ tính items available
                .estimatedTotal(subtotal)
                .build();
    }

    @CacheEvict(value = "customerCart",key = "#customerId")
    @Transactional
    public void removeByCustomerAndVariant(Long customerId, Long variantId) {
        log.info("Xóa variant - Khách hàng: {}, Variant: {}", customerId, variantId);
        cartRepository.deleteByCustomerIdAndVariantId(customerId, variantId);
    }

    @CacheEvict(value = "customerCart",key = "#customerId")
    @Transactional
    public void clearCart(Long customerId) {
        log.info("Xóa toàn bộ giỏ hàng của khách hàng: {}", customerId);
        cartRepository.deleteByCustomerId(customerId);
    }

    /**
     * Đếm số lượng sản phẩm trong giỏ (tất cả items)
     */
    public Long getCartItemCount(Long customerId) {
        return cartRepository.countByCustomerId(customerId);
    }

    /**
     * Validate giỏ hàng trước khi checkout
     * CHỈ trả về những variant available
     * Throw exception nếu có variant không available
     */
    public List<CartItemResponse> validateCart(Long customerId) {
        log.info("Validate giỏ hàng của khách hàng: {}", customerId);

        List<ShoppingCart> cartItems = cartRepository.findByCustomerId(customerId);

        if (cartItems.isEmpty()) {
            throw new CartNotFoundException("Giỏ hàng trống");
        }

        List<CartItemResponse> allItems = cartItems.stream()
                .map(this::mapToCartItemResponse)
                .toList();

        // Lọc những variant available
        List<CartItemResponse> availableItems = allItems.stream()
                .filter(cartItemResponse -> !cartItemResponse.getStatus().equals("OUT_OF_STOCK"))
                .collect(Collectors.toList());

        // Nếu có variant không available
        if (availableItems.size() < allItems.size()) {
            List<String> unavailableProducts = allItems.stream()
                    .filter(item -> item.getStatus().equals("OUT_OF_STOCK"))
                    .map(item -> {
                        if (item.getProductName() != null && item.getVariantName() != null) {
                            return item.getProductName() + " - " + item.getVariantName();
                        }
                        return item.getVariantName() != null ? item.getVariantName() : "Sản phẩm không xác định";
                    })
                    .collect(Collectors.toList());

            String message = String.format(
                    "Có %d sản phẩm không khả dụng: %s. Vui lòng xóa khỏi giỏ hàng.",
                    unavailableProducts.size(),
                    String.join(", ", unavailableProducts)
            );

            throw new ProductNotAvailableException(message);
        }

        if (availableItems.isEmpty()) {
            throw new ProductNotAvailableException("Tất cả sản phẩm trong giỏ không khả dụng");
        }

        return availableItems;
    }

    /**
     * Validate variant có tồn tại và available không
     */
    private VariantDTO validateVariantAvailable(Long variantId) {
        try {
            VariantDTO variant = productServiceClient.getVariant(variantId).getBody();

            if (variant == null) {
                throw new ProductNotFoundException("Không tìm thấy sản phẩm với ID: " + variantId);
            }

            if (variant.getStatus().equals("OUT_OF_STOCK")) {
                // Ưu tiên hiển thị productName nếu có
                String displayName = variant.getProductName() != null
                        ? variant.getProductName() + " - " + variant.getName()
                        : variant.getName();
                throw new ProductNotAvailableException(
                        "Sản phẩm đã hết hàng!"
                );
            }

            return variant;

        } catch (ProductNotFoundException | ProductNotAvailableException e) {
            throw e;
        } catch (Exception e) {
            log.error("Lỗi khi kiểm tra variant: {}", variantId, e);
            throw new ProductNotFoundException("Không thể lấy thông tin sản phẩm");
        }
    }

    /**
     * Chuyển ShoppingCart sang CartItemResponse
     * Lấy thông tin từ Product Service và kiểm tra trạng thái available
     */
    private CartItemResponse mapToCartItemResponse(ShoppingCart cart) {
        try {
            // Lấy thông tin variant (bao gồm cả productId)
            VariantDTO variant = productServiceClient.getVariant(cart.getVariantId()).getBody();
            if (variant == null) {
                throw new ProductNotFoundException("Không tìm thấy sản phẩm với ID: " + cart.getVariantId());
            }

            // Lấy thông tin cơ bản từ variant
            String variantName = variant.getName();
            String productName = variant.getProductName(); // Tên product từ DTO (nếu join)
            String productSlug=variant.getProductSlug();
            Long productId = variant.getProductId(); // ProductId từ variant
            BigDecimal unitPrice = variant.getSellingPrice();
            String sku = variant.getSku();


            // Kiểm tra trạng thái available
            boolean isAvailable = variant.getStatus() != null && !variant.getStatus().equals("OUT_OF_STOCK");

            // Tính tổng giá (nếu không available thì = 0)
            BigDecimal totalPrice = isAvailable
                    ? unitPrice.multiply(BigDecimal.valueOf(cart.getQuantity()))
                    : BigDecimal.ZERO;

            // Lý do không khả dụng
            String unavailableReason = null;
            if (!isAvailable) {
                unavailableReason = "Sản phẩm hiện không khả dụng";
            }

            return CartItemResponse.builder()
                    .id(cart.getId())
                    .variantId(cart.getVariantId())
                    .variantName(variantName)
                    .productId(productId)
                    .productName(productName)
                    .productSlug(productSlug)
                    .variantSku(sku)
                    .unitPrice(unitPrice)
                    .quantity(cart.getQuantity())
                    .totalPrice(totalPrice)
                    .imageUrls(variant.getImageUrls())
                    .status(variant.getStatus())
                    .unavailableReason(unavailableReason)
                    .addedAt(cart.getCreatedAt())
                    .build();

        } catch (Exception e) {
            log.error("Lỗi khi map CartItemResponse cho variantId: {}", cart.getVariantId(), e);
            throw new ProductNotFoundException("Không thể lấy thông tin sản phẩm");
        }
    }

}