package com.doan.auth_service.controllers;

import com.doan.auth_service.dtos.VerificationCode.VerificationRequest;
import com.doan.auth_service.dtos.VerificationCode.VerificationResponse;
import com.doan.auth_service.services.VerificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("")
public class VerificationController {

    private final VerificationService verificationService;

    @PostMapping("/public/verify/send")
    public ResponseEntity<?> sendCodePublic(@RequestBody VerificationRequest req) {
        try {
            verificationService.sendVerificationCode(req.getEmail(),null);
            return ResponseEntity.ok(new VerificationResponse("Mã xác thực đã được gửi đến email."));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(429).body(Map.of("error", e.getMessage())); // 429 Too Many Requests
        }
    }

    @PostMapping("/public/verify/check")
    public ResponseEntity<?> checkCodePublic(@RequestBody VerificationRequest req) {
        boolean valid = verificationService.verifyCode(req.getEmail(), req.getCode(), null,null);
        if (valid) {
            return ResponseEntity.ok(new VerificationResponse("Xác thực thành công."));
        } else {
            return ResponseEntity.status(400).body(Map.of("message", "Mã không hợp lệ hoặc đã hết hạn."));
        }
    }
    @PostMapping("/secure/verify/send")
    public ResponseEntity<?> sendCodeSecure(@RequestBody VerificationRequest req,
                                            @RequestHeader(value = "X-User-Role") String role) {
        try {
            verificationService.sendVerificationCode(req.getEmail(),role);
            return ResponseEntity.ok(new VerificationResponse("Mã xác thực đã được gửi đến email."));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(429).body(Map.of("error", e.getMessage())); // 429 Too Many Requests
        }
    }
    @PostMapping("/secure/verify/check")
    public ResponseEntity<?> checkCodeSecure(@RequestBody VerificationRequest req,
                                             @RequestHeader(value = "X-Account-Id") Long accountId,
                                             @RequestHeader(value = "X-User-Role") String role) {
        boolean valid = verificationService.verifyCode(req.getEmail(), req.getCode(), accountId,role);
        if (valid) {
            return ResponseEntity.ok(new VerificationResponse("Xác thực thành công."));
        } else {
            return ResponseEntity.status(400).body(Map.of("message", "Mã không hợp lệ hoặc đã hết hạn."));
        }
    }
}
