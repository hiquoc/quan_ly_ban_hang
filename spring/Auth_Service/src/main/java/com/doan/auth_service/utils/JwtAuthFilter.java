package com.doan.auth_service.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    public JwtAuthFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        // 1. Try JWT cookie first
        boolean authenticated = false;
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("jwt".equals(cookie.getName())) {
                    String token = cookie.getValue();
                    try {
                        Claims claims = jwtUtil.parseClaims(token);
                        String username = claims.getSubject();
                        String role = claims.get("role", String.class);

                        UsernamePasswordAuthenticationToken auth =
                                new UsernamePasswordAuthenticationToken(
                                        username,
                                        null,
                                        List.of(new SimpleGrantedAuthority("ROLE_" + role))
                                );
                        SecurityContextHolder.getContext().setAuthentication(auth);
                        authenticated = true;
                        break;
                    } catch (JwtException ex) {
                        // invalid token, continue to check headers
                    }
                }
            }
        }

        // 2. Fallback to headers
        if (!authenticated) {
            String username = request.getHeader("X-User-Name");
            String role = request.getHeader("X-User-Role");
            String accountId = request.getHeader("X-Account-Id");
            String ownerId = request.getHeader("X-Owner-Id");
            if (username != null && role != null) {
                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(
                                username,
                                null,
                                List.of(new SimpleGrantedAuthority("ROLE_" + role))
                        );
                auth.setDetails(Map.of(
                        "accountId", accountId,
                        "ownerId", ownerId
                ));
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        filterChain.doFilter(request, response);
    }
}
