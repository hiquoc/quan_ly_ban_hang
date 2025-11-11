package com.doan.product_service.services;

import com.doan.product_service.dtos.brand.BrandRequest;
import com.doan.product_service.dtos.order.OrderDetailResponse;
import com.doan.product_service.dtos.product_review.ProductReviewDetailsResponse;
import com.doan.product_service.dtos.product_review.ProductReviewRequest;
import com.doan.product_service.dtos.product_review.ProductReviewResponse;
import com.doan.product_service.models.Brand;
import com.doan.product_service.models.Product;
import com.doan.product_service.models.ProductReview;
import com.doan.product_service.models.ProductVariant;
import com.doan.product_service.repositories.ProductRepository;
import com.doan.product_service.repositories.ProductReviewRepository;
import com.doan.product_service.repositories.ProductVariantRepository;
import com.doan.product_service.services.client.OrderServiceClient;
import com.doan.product_service.services.cloud.CloudinaryService;
import com.doan.product_service.utils.WebhookUtils;
import jakarta.persistence.criteria.Predicate;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class ProductReviewService {
    private final ProductReviewRepository productReviewRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ProductRepository productRepository;
    private final OrderServiceClient orderServiceClient;
    private final CloudinaryService cloudinaryService;

    @Transactional
    public ProductReviewDetailsResponse createReview(ProductReviewRequest request, List<MultipartFile> images) {
        OrderDetailResponse order = orderServiceClient.getOrder(request.getOrderId());
        if (order == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found");
        }

        if (!order.getCustomerId().equals(request.getCustomerId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot review someone else's order");
        }

        boolean hasVariant = order.getItems().stream()
                .anyMatch(item -> item.getVariantId().equals(request.getVariantId()));
        if (!hasVariant) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Variant not found in the order");
        }

        if (productReviewRepository.existsByOrderIdAndVariantId(request.getOrderId(),request.getVariantId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You have already reviewed this product");
        }
        ProductVariant variant=productVariantRepository.findById(request.getVariantId())
                .orElseThrow(()->new ResponseStatusException(HttpStatus.BAD_REQUEST, "Variant not found"));

        Map<String, String> imageUrls = new HashMap<>();
        if (images != null) {
            try {
                for (int i = 0; i < images.size(); i++) {
                    imageUrls.put("side" + i, cloudinaryService.uploadFile(images.get(i)));
                }
            } catch (Exception e) {
                imageUrls.values().forEach(url -> {
                    try { cloudinaryService.deleteFile(url); }
                    catch (Exception ex) { System.err.println("Cleanup failed: " + ex.getMessage()); }
                });
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to upload images");
            }
        }

        ProductReview review = ProductReview.builder()
                .orderId(request.getOrderId())
                .productId(variant.getProduct().getId())
                .variantId(request.getVariantId())
                .customerId(request.getCustomerId())
                .username(request.getUsername())
                .content(request.getContent())
                .rating(request.getRating())
                .isApproved(true)
                .images(imageUrls)
                .build();

        productReviewRepository.save(review);
        Product product = variant.getProduct();
        product.addRating(request.getRating());
        productRepository.save(product);
        WebhookUtils.postToWebhook(product.getId(),"update");

        return mapToDetailsResponse(review, variant.getAttributes());
    }

    public ProductReviewResponse getProductReviewsWithCounts(
            Long productId, Integer ratingFilter, Pageable pageable, Long ownerId, int page) {

        Page<ProductReview> reviews;
        if (ratingFilter != null) {
            reviews = productReviewRepository.findByProductIdAndRating(productId, ratingFilter, pageable);
        } else {
            reviews = productReviewRepository.findByProductId(productId, pageable);
        }

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

        // Get actual rating counts from DB
        List<Object[]> countsList = productReviewRepository.countRatingsByProductId(productId);
        Map<Integer, Long> ratingCounts = new HashMap<>();
        for (int i = 1; i <= 5; i++) ratingCounts.put(i, 0L); // default 0
        for (Object[] row : countsList) {
            Integer r = (Integer) row[0];
            Long c = (Long) row[1];
            ratingCounts.put(r, c);
        }

        Set<Long> variantIds = reviews.getContent().stream()
                .map(ProductReview::getVariantId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, ProductVariant> variantMap = variantIds.isEmpty() ? Collections.emptyMap()
                : productVariantRepository.findAllById(variantIds)
                .stream().collect(Collectors.toMap(ProductVariant::getId, v -> v));

        List<ProductReviewDetailsResponse> reviewList = reviews.getContent().stream()
                .map(r -> {
                    Map<String, String> attributes = r.getVariantId() != null ?
                            variantMap.getOrDefault(r.getVariantId(), new ProductVariant()).getAttributes() : null;
                    return mapToDetailsResponse(r, attributes);
                })
                .collect(Collectors.toList());

        if (page == 0 && ownerId != null && ratingFilter == null) {
            reviewList.stream()
                    .filter(r -> r.getCustomerId().equals(ownerId))
                    .findFirst()
                    .ifPresent(userReview -> {
                        reviewList.remove(userReview);
                        reviewList.add(0, userReview); // move to first
                    });
        }

        reviewList.forEach(r -> {
            if (!r.getCustomerId().equals(ownerId)) {
                String username = r.getUsername();
                if (username != null && username.contains("@")) {
                    String[] parts = username.split("@");
                    if (parts.length == 2) {
                        r.setUsername(parts[0].charAt(0) + "***@" + parts[1]);
                    }
                }
            }
        });

        return new ProductReviewResponse(
                new PageImpl<>(reviewList, pageable, reviews.getTotalElements()),
                ratingCounts
        );
    }


    @Transactional
    public void updateReviewInfo(Long id, Long customerId, String role, ProductReviewRequest request) {
        ProductReview review = productReviewRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy đánh giá với id: " + id));

        if (role.equals("CUSTOMER") && !review.getCustomerId().equals(customerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền cập nhật đánh giá sản phẩm!");
        }

        boolean ratingChanged = request.getRating() != null
                && !request.getRating().equals(review.getRating())
                && request.getRating() > 0 && request.getRating() < 6;

        if (ratingChanged) {
            int oldRating = review.getRating();
            int newRating = request.getRating();
            review.setRating(newRating);

            Product product = productRepository.findById(review.getProductId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
            product.updateRating(oldRating, newRating);
            productRepository.save(product);
            WebhookUtils.postToWebhook(product.getId(),"update");
        }

        if (request.getContent() != null && !request.getContent().equals(review.getContent()))
            review.setContent(request.getContent());

        productReviewRepository.save(review);
    }

    @Transactional
    public void updateReviewImages(Long id,Long customerId,String role, List<MultipartFile> newImages, List<String> deletedKeys) {
        ProductReview review = productReviewRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy đánh giá với id: " + id));
        if (role.equals("CUSTOMER") && !review.getCustomerId().equals(customerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền cập nhật đánh giá sản phẩm!");
        }
        Map<String, String> currentImages = new HashMap<>(review.getImages());

        try {
            if (deletedKeys != null) {
                for (String key : deletedKeys) {
                    String url = currentImages.get(key);
                    if (url != null) {
                        cloudinaryService.deleteFile(url);
                        currentImages.remove(key);
                    }
                }
            }

            if (newImages != null) {
                for (int i = 0; i < newImages.size(); i++) {
                    String key = "side" + System.currentTimeMillis() + "_" + i;
                    String url = cloudinaryService.uploadFile(newImages.get(i));
                    currentImages.put(key, url);
                }
            }

            review.setImages(currentImages);
            productReviewRepository.save(review);

        } catch (IOException io) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi khi upload/xóa hình ảnh!");
        }
    }
    public void updateReviewIsApproved(Long id){
        ProductReview review = productReviewRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy đánh giá với id: " + id));
        review.setIsApproved(!review.getIsApproved());
        productReviewRepository.save(review);
    }

    @Transactional
    public void deleteProductReview(Long id, Long customerId, String role) {
        ProductReview review = productReviewRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy đánh giá với id: " + id));

        boolean isOwner = Objects.equals(review.getCustomerId(), customerId);
        if (role.equals("CUSTOMER") && !isOwner) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không thể xóa đánh giá của người khác!");
        }
        if (role.equals("STAFF")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền xóa đánh giá!");
        }

        var product = productRepository.findById(review.getProductId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        product.removeRating(review.getRating());
        productRepository.save(product);
        WebhookUtils.postToWebhook(product.getId(),"update");

        productReviewRepository.delete(review);
    }


    public List<ProductReview> getCustomerReviews(Long customerId) {
        return productReviewRepository.findByCustomerId(customerId);
    }
    private ProductReviewDetailsResponse mapToDetailsResponse(ProductReview review, Map<String, String> attributes) {
        if (review == null) return null;

        return ProductReviewDetailsResponse.builder()
                .id(review.getId())
                .orderId(review.getOrderId())
                .productId(review.getProductId())
                .variantId(review.getVariantId())
                .customerId(review.getCustomerId())
                .username(review.getUsername())
                .rating(review.getRating())
                .content(review.getContent())
                .images(review.getImages())
                .attributes(attributes != null ? attributes : Collections.emptyMap())
                .isApproved(review.getIsApproved())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .build();
    }

    public List<ProductReview> getAllReviews(LocalDateTime startDate, LocalDateTime endDate) {
        return productReviewRepository.getAllReviews(startDate, endDate);
    }
}
