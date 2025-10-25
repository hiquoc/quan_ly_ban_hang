package com.doan.auth_service.utils;

import org.springframework.context.support.DefaultMessageSourceResolvable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Field;
import java.util.*;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // Handle validation errors
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(
            MethodArgumentNotValidException ex) {

        Map<String, Object> body = new HashMap<>();
        body.put("success", false);

        Class<?> dtoClass = Objects.requireNonNull(ex.getBindingResult().getTarget()).getClass();

        List<String> fieldOrder = Arrays.stream(dtoClass.getDeclaredFields())
                .map(Field::getName)
                .toList();

        String firstMessage = ex.getBindingResult().getFieldErrors().stream().min(Comparator.comparingInt(e -> {
                    int index = fieldOrder.indexOf(e.getField());
                    return index >= 0 ? index : Integer.MAX_VALUE;
                }))
                .map(DefaultMessageSourceResolvable::getDefaultMessage)
                .orElse("Xác thực thất bại!");

        body.put("message", firstMessage);

        return ResponseEntity.badRequest().body(body);
    }

    // Handle ResponseStatusException (404, 400, etc.)
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatusException(ResponseStatusException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("success", false);
        body.put("message", ex.getReason());
        body.put("status", ex.getStatusCode().value());
        return ResponseEntity.status(ex.getStatusCode()).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleOtherExceptions(Exception ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("success", false);
        body.put("message", "Đã xảy ra lỗi hệ thống");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}
