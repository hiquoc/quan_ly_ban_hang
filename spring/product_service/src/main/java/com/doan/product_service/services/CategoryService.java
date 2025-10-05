package com.doan.product_service.services;

import com.doan.product_service.dtos.category.CategoryRequest;
import com.doan.product_service.models.Category;
import com.doan.product_service.repositories.CategoryRepository;
import com.doan.product_service.repositories.ProductRepository;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@AllArgsConstructor
public class CategoryService {
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    public void createCategory(CategoryRequest categoryRequest){
        if(categoryRepository.existsByName(categoryRequest.getName())){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên doanh mục đã tồn tại!");
        }
        if(categoryRepository.existsBySlug(categoryRequest.getSlug())){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Slug của doanh mục đã tồn tại!");
        }
        Category category=new Category(
                categoryRequest.getName(),
                categoryRequest.getSlug(),
                categoryRequest.getImageUrl()
        );
        categoryRepository.save(category);
    }
    public void updateCategory(Long id,CategoryRequest categoryRequest){
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
        if (categoryRequest.getImageUrl() != null
                && !categoryRequest.getImageUrl().isEmpty()
                && !categoryRequest.getImageUrl().equals(category.getImageUrl())) {
            category.setImageUrl(categoryRequest.getImageUrl());
        }
        categoryRepository.save(category);
    }
    public List<Category> getAllCategories(){
        return categoryRepository.findAll();
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
}
