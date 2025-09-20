package com.quanlybanhang.banhang_system.utils;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class JwtUtil {
    private final Key key= Keys.secretKeyFor(SignatureAlgorithm.HS256);

    public String generateToken(String username,String role){
        long expiration = 1000 * 60 * 60;
        return Jwts.builder()
                .setSubject(username)
                .claim("role",role)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis()+ expiration))
                .signWith(key)
                .compact();
    }
    public String getUsernameFromToken(String token){
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }
}
