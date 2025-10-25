package com.datn.cart_service.exception;

import feign.FeignException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    //Xử lý lỗi không tìm thấy giỏ hàng hoặc item trong giỏ
    @ExceptionHandler(CartNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleCartNotFound(CartNotFoundException ex) {
        log.error("CartNotFoundException: {}", ex.getMessage());
        Map<String, Object> response = new HashMap<>();
        response.put("message", ex.getMessage());
        response.put("success", false);
        response.put("data", null);
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    //Xử lý lỗi không tìm thấy variant/sản phẩm
    @ExceptionHandler(ProductNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleProductNotFound(ProductNotFoundException ex) {
        log.error("ProductNotFoundException: {}", ex.getMessage());
        Map<String, Object> response = new HashMap<>();
        response.put("message", ex.getMessage());
        response.put("success", false);
        response.put("data", null);
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    //Xử lý lỗi sản phẩm không khả dụng (isAvailable = false)
    @ExceptionHandler(ProductNotAvailableException.class)
    public ResponseEntity<Map<String, Object>> handleProductNotAvailable(ProductNotAvailableException ex) {
        log.error("ProductNotAvailableException: {}", ex.getMessage());
        Map<String, Object> response = new HashMap<>();
        response.put("message", ex.getMessage());
        response.put("success", false);
        response.put("data", null);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    //Xử lý lỗi tham số không hợp lệ
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        log.error("IllegalArgumentException: {}", ex.getMessage());
        Map<String, Object> response = new HashMap<>();
        response.put("message", ex.getMessage());
        response.put("success", false);
        response.put("data", null);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    //Xử lý lỗi validation (@Valid)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(
            MethodArgumentNotValidException ex) {

        String validationMessage = ex.getBindingResult().getAllErrors().stream()
                .map(error -> {
                    String fieldName = ((FieldError) error).getField();
                    String errorMessage = error.getDefaultMessage();
                    return fieldName + ": " + errorMessage;
                })
                .collect(Collectors.joining(", "));

        log.error("Validation error: {}", validationMessage);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Dữ liệu không hợp lệ - " + validationMessage);
        response.put("success", false);
        response.put("data", null);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    //Xử lý lỗi Feign Client (khi gọi Product Service)
    @ExceptionHandler(FeignException.class)
    public ResponseEntity<Map<String, Object>> handleFeignException(FeignException ex) {
        log.error("FeignException: Status {}, Message: {}", ex.status(), ex.getMessage());

        String message;
        HttpStatus status;

        switch (ex.status()) {
            case 404:
                message = "Không tìm thấy sản phẩm trong hệ thống";
                status = HttpStatus.NOT_FOUND;
                break;
            case 503:
                message = "Service tạm thời không khả dụng, vui lòng thử lại sau";
                status = HttpStatus.SERVICE_UNAVAILABLE;
                break;
            case 500:
                message = "Lỗi hệ thống khi lấy thông tin sản phẩm";
                status = HttpStatus.INTERNAL_SERVER_ERROR;
                break;
            default:
                message = "Không thể kết nối đến dịch vụ sản phẩm";
                status = HttpStatus.BAD_GATEWAY;
        }

        Map<String, Object> response = new HashMap<>();
        response.put("message", message);
        response.put("success", false);
        response.put("data", null);

        return ResponseEntity.status(status).body(response);
    }

    //Xử lý các lỗi không mong đợi
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex) {
        log.error("Unhandled exception: ", ex);
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Đã xảy ra lỗi: " + ex.getMessage());
        response.put("success", false);
        response.put("data", null);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}