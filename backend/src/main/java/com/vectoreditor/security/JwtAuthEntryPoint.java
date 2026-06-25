package com.vectoreditor.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vectoreditor.dto.ApiResult;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * JWT 认证入口点
 * 当未认证的请求访问受保护资源时，返回 401 JSON 而非默认的 403
 *
 * 前端响应拦截器捕获 401 时自动清除 token 并跳转登录页
 */
@Component
public class JwtAuthEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());

        String body = objectMapper.writeValueAsString(
                ApiResult.error(401, "未认证或认证已过期，请重新登录")
        );
        response.getWriter().write(body);
    }
}
