package com.doan.auth_service.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class JwtUtil {
    private final Key key;

    public JwtUtil(@Value("${JWT_SECRET}") String secret) {
        byte[] decodedKey = java.util.Base64.getDecoder().decode(secret);
        this.key = Keys.hmacShaKeyFor(decodedKey);
    }
    public String generateToken(String username,Long id, String role,Long ownerId){
        long expiration = 1000 * 60 * 60 *24;
        return Jwts.builder()
                .setSubject(username)
                .claim("id",id)
                .claim("role",role)
                .claim("ownerId",ownerId)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis()+ expiration))
                .signWith(key)
                .compact();
    }
    public Claims parseClaims(String token) throws JwtException {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
