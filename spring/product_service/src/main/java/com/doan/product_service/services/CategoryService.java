package com.doan.product_service.services;

import com.doan.product_service.dtos.category.CategoryRequest;
import com.doan.product_service.models.Brand;
import com.doan.product_service.models.Category;
import com.doan.product_service.repositories.CategoryRepository;
import com.doan.product_service.repositories.ProductRepository;
import com.doan.product_service.services.cloud.CloudinaryService;
import jakarta.persistence.criteria.Predicate;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
@AllArgsConstructor
public class CategoryService {
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final CloudinaryService cloudinaryService;

    public void createCategory(CategoryRequest categoryRequest, MultipartFile image){
        if(categoryRepository.existsByName(categoryRequest.getName())){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên doanh mục đã tồn tại!");
        }
        if(categoryRepository.existsBySlug(categoryRequest.getSlug())){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Slug của doanh mục đã tồn tại!");
        }
        String imgUrl=null;
        try{
            if(image!=null && !image.isEmpty())
                imgUrl=cloudinaryService.uploadFile(image);
        }catch (IOException ex){
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Upload image thất bại", ex);
        }
        Category category=new Category(
                categoryRequest.getName(),
                categoryRequest.getSlug(),
                imgUrl
        );
        categoryRepository.save(category);
    }
    @Transactional
    public void updateCategory(Long id,CategoryRequest categoryRequest,MultipartFile image){
        Category category = categoryRepository.findById(id)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found with id: "+id));
        if(categoryRepository.existsByNameAndIdNot(categoryRequest.getName(),id)){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Tên doanh mục đã tồn tại!");
        }
        if(categoryRepository.existsBySlugAndIdNot(categoryRequest.getSlug(),id)){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Slug của doanh mục đã tồn tại!");
        }
        if (categoryRequest.getName() != null
                && !categoryRequest.getName().isEmpty()
                && !categoryRequest.getName().equals(category.getName())) {
            category.setName(categoryRequest.getName());
        }
        if (categoryRequest.getSlug() != null
                && !categoryRequest.getSlug().isEmpty()
                && !categoryRequest.getSlug().equals(category.getSlug())) {
            category.setSlug(categoryRequest.getSlug());
        }
        try{
            if(image!=null && !image.isEmpty()){
                if(category.getImageUrl()!=null)
                    cloudinaryService.deleteFile(category.getImageUrl());
                String imgUrl=cloudinaryService.uploadFile(image);
                category.setImageUrl(imgUrl);
            }

        }catch (IOException ex){
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Có lỗi khi cập nhật hình ảnh", ex);
        }
        categoryRepository.save(category);
    }
    public Page<Category> getAllCategories(Integer page, Integer size, String keyword, Boolean active){
        Pageable pageable;
        if (page == null || size == null) {
            pageable = Pageable.unpaged();
        } else {
            if (page < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số trang phải lớn hơn 0");
            if (size < 0)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số lượng dữ liệu mỗi trang phải lớn hơn 0");
            pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        }

        Specification<Category> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (keyword != null && !keyword.isBlank()) {
                String likeKeyword = "%" + keyword.trim().toLowerCase() + "%";
                predicates.add(
                        cb.like(
                                cb.function("unaccent", String.class, cb.lower(root.get("name"))),
                                cb.function("unaccent", String.class, cb.literal(likeKeyword))
                        )
                );
            }

            if (active != null) {
                predicates.add(cb.equal(root.get("isActive"), active));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return categoryRepository.findAll(spec,pageable);
    }
    public void changeCategoryActive(Long id){
        Category category = categoryRepository.findById(id)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Category not found with id: "+id));
        if(category.getIsActive() && productRepository.existsByCategoryIdAndIsActiveIsTrue(id)){
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Có sản phẩm đang hoạt động thuộc doanh mục này!");
        }
        category.setIsActive(!category.getIsActive());
        categoryRepository.save(category);
    }
    public void deleteCategory(Long id){
        if(productRepository.existsByCategoryIdAndIsActiveIsTrue(id)){
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Có sản phẩm đang hoạt động thuộc doanh mục này!");
        }
        Category category = categoryRepository.findById(id)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Category not found with id: "+id));
        categoryRepository.delete(category);
    }

    public List<Category> getCategoriesByIds(List<Long> ids) {
        return categoryRepository.findAllById(ids);
    }
}
