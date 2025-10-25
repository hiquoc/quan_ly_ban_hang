package com.doan.auth_service;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableFeignClients
public class AuthServiceApplication {
	public static void main(String[] args) {
        Dotenv dotenv = Dotenv.load();
		SpringApplication.run(AuthServiceApplication.class, args);
	}
}
