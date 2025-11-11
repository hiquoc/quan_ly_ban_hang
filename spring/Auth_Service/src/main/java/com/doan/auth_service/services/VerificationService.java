package com.doan.auth_service.services;

import com.doan.auth_service.models.Account;
import com.doan.auth_service.models.VerificationCode;
import com.doan.auth_service.repositories.AccountRepository;
import com.doan.auth_service.repositories.SocialAccountRepository;
import com.doan.auth_service.repositories.VerificationCodeRepository;
import com.doan.auth_service.utils.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.Optional;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class VerificationService {

    private final AccountRepository accountRepository;
    private final SocialAccountRepository socialAccountRepository;
    private final VerificationCodeRepository repository;
    private final CustomerServiceClient customerServiceClient;
    private final StaffServiceClient staffServiceClient;
    private final EmailService emailService;

    @Transactional
    public void sendVerificationCode(String email, String role) {
        try {
            Long ownerId;
            if (role != null && (role.equals("ADMIN") || role.equals("MANAGER"))) {
                ownerId = staffServiceClient.getStaffIdByEmail(email).getOwnerId();
            } else {
                ownerId = customerServiceClient.getCustomerIdByEmail(email).getOwnerId();
            }
            if (ownerId != null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email đã được sử dụng!");
            }
        } catch (ResponseStatusException ex) {
            if (ex.getStatusCode().value() != 404) throw ex;
        }

        int count = repository.countByEmailAndExpiryTimeAfter(email, LocalDateTime.now());
        if (count >= 5) {
            throw new IllegalStateException("Bạn đã gửi mã quá 5 lần. Vui lòng thử lại sau.");
        }

        String code = String.format("%06d", new Random().nextInt(999999));
        LocalDateTime expiry = LocalDateTime.now().plusMinutes(10);

        VerificationCode verificationCode = new VerificationCode();
        verificationCode.setEmail(email);
        verificationCode.setCode(code);
        verificationCode.setExpiryTime(expiry);
        repository.save(verificationCode);

        String subject = "Xác thực tài khoản của bạn";
        String content = """
                <html>
                  <body style="font-family: Arial, sans-serif; color: #333;">
                    <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #f9f9f9;">
                      <h2 style="color: #2D3748;">Xác thực tài khoản</h2>
                      <p>Chào bạn,</p>
                      <p>Bạn hoặc ai đó vừa yêu cầu mã xác thực cho tài khoản của mình.</p>
                      <p>Vui lòng sử dụng mã sau để hoàn tất quá trình:</p>
                      <div style="text-align: center; margin: 20px 0;">
                        <span style="font-size: 24px; font-weight: bold; color: #2F855A; padding: 10px 20px; border: 2px dashed #2F855A; border-radius: 8px;">%s</span>
                      </div>
                      <p>Mã này sẽ hết hạn sau 10 phút.</p>
                      <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
                      <p style="margin-top: 20px;">Trân trọng,<br/>Đội ngũ Hỗ trợ</p>
                    </div>
                  </body>
                </html>
                """.formatted(code);
        emailService.sendEmail(email, subject, content, true);

    }


    @Transactional
    public boolean verifyCode(String email, String code, Long accountId, String role) {
        Optional<VerificationCode> recordOpt = repository.findByEmailAndCode(email, code);
        if (recordOpt.isEmpty()) return false;

        VerificationCode vc = recordOpt.get();
        if (vc.getExpiryTime().isBefore(LocalDateTime.now())) {
            repository.delete(vc);
            return false;
        }

        vc.setIsVerified(true);
        repository.save(vc);

        Long ownerId = null;
        try {
            if (role != null && (role.equals("ADMIN") || role.equals("MANAGER")))
                ownerId = staffServiceClient.getStaffIdByEmail(email).getOwnerId();
            else
                ownerId = customerServiceClient.getCustomerIdByEmail(email).getOwnerId();
        } catch (ResponseStatusException ex) {
            if (ex.getStatusCode().value() != 404) throw ex;
            // 404 = email not registered yet → ownerId remains null
        }
        if (accountId != null) {
            Account account = accountRepository.findById(accountId)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản với accountId: " + accountId
                    ));

            if (ownerId != null && !Objects.equals(account.getOwnerId(), ownerId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Email này đang được sử dụng bởi tài khoản khác!");
            }
            account.setIsVerified(true);
            accountRepository.save(account);
        }
        return true;
    }
}
