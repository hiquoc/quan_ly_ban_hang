package com.doan.auth_service.configs;

import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.util.SerializationUtils;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class HttpCookieOAuth2AuthorizationRequestRepository implements AuthorizationRequestRepository<OAuth2AuthorizationRequest> {

    public static final String OAUTH2_AUTH_REQUEST_COOKIE_NAME = "oauth2_auth_request";

    @Override
    public OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest request) {
        Cookie cookie = getCookie(request, OAUTH2_AUTH_REQUEST_COOKIE_NAME);
        if (cookie == null) return null;
        return (OAuth2AuthorizationRequest) SerializationUtils.deserialize(fromBase64(cookie.getValue()));
    }

    @Override
    public void saveAuthorizationRequest(OAuth2AuthorizationRequest authorizationRequest,
                                         HttpServletRequest request, HttpServletResponse response) {
        if (authorizationRequest == null) {
            removeAuthorizationRequestCookies(response);
            return;
        }
        Cookie cookie = new Cookie(OAUTH2_AUTH_REQUEST_COOKIE_NAME, toBase64(SerializationUtils.serialize(authorizationRequest)));
        cookie.setPath("/");
        cookie.setHttpOnly(true);
        int cookieExpireSeconds = 180;
        cookie.setMaxAge(cookieExpireSeconds);
        cookie.setDomain("localhost"); // key fix: cookie domain = gateway
        response.addCookie(cookie);
    }

    @Override
    public OAuth2AuthorizationRequest removeAuthorizationRequest(HttpServletRequest request, HttpServletResponse response) {
        return null;
    }


    private void removeAuthorizationRequestCookies(HttpServletResponse response) {
        Cookie cookie = new Cookie(OAUTH2_AUTH_REQUEST_COOKIE_NAME, "");
        cookie.setPath("/");
        cookie.setMaxAge(0);
        cookie.setDomain("localhost");
        response.addCookie(cookie);
    }

    private Cookie getCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) {
            if (cookie.getName().equals(name)) return cookie;
        }
        return null;
    }

    private String toBase64(byte[] bytes) {
        return java.util.Base64.getUrlEncoder().encodeToString(bytes);
    }

    private byte[] fromBase64(String value) {
        return java.util.Base64.getUrlDecoder().decode(value);
    }
}
