package com.doan.gateway_service.utils;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.security.Key;
import java.util.Objects;

@Component
public class JwtAuthFilter implements GatewayFilter {
    private final Key key;
    public JwtAuthFilter(@Value("${JWT_SECRET}") String secret) {
        byte[] decodedKey = java.util.Base64.getDecoder().decode(secret);
        this.key = Keys.hmacShaKeyFor(decodedKey);
    }
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String token = null;

        String authHeader = exchange.getRequest().getHeaders().getFirst("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        }

        if (token == null && exchange.getRequest().getCookies().containsKey("jwt")) {
            token = Objects.requireNonNull(exchange.getRequest().getCookies().getFirst("jwt")).getValue();
        }
        if (token == null && exchange.getRequest().getQueryParams().containsKey("token")) {
            token = exchange.getRequest().getQueryParams().getFirst("token");
            authHeader = "Bearer " + token;
        }

        if (token == null) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

            String username = claims.getSubject();
            String role = claims.get("role", String.class);
            Long id = claims.get("id", Long.class);
            Long ownerId = claims.get("ownerId", Long.class);
            Long warehouseId = claims.get("warehouseId", Long.class);

            ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                    .header("X-User-Name", username)
                    .header("X-User-Role", role)
                    .header("X-Account-Id", String.valueOf(id))
                    .header("X-Owner-Id", String.valueOf(ownerId))
                    .header("X-Warehouse-Id", String.valueOf(warehouseId))
                    .header("Authorization", authHeader)
                    .build();

            ServerWebExchange mutatedExchange = exchange.mutate()
                    .request(mutatedRequest)
                    .build();

            return chain.filter(mutatedExchange);

        } catch (ExpiredJwtException e) {
            System.out.println("JWT expired: " + e.getMessage());
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }
        catch (Exception e) {
            System.out.println("JWT parsing failed: "+ e.getMessage());
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }
    }
}
