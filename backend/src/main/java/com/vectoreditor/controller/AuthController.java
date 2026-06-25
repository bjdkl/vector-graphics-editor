package com.vectoreditor.controller;

import com.vectoreditor.dto.ApiResult;
import com.vectoreditor.dto.AuthResponse;
import com.vectoreditor.dto.LoginRequest;
import com.vectoreditor.dto.RegisterRequest;
import com.vectoreditor.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /** POST /api/auth/register */
    @PostMapping("/register")
    public ResponseEntity<ApiResult<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest req) {
        AuthResponse resp = authService.register(req);
        return ResponseEntity.ok(ApiResult.ok("注册成功", resp));
    }

    /** POST /api/auth/login */
    @PostMapping("/login")
    public ResponseEntity<ApiResult<AuthResponse>> login(
            @Valid @RequestBody LoginRequest req) {
        AuthResponse resp = authService.login(req);
        return ResponseEntity.ok(ApiResult.ok("登录成功", resp));
    }

    /** GET /api/auth/me（验证 token 有效性，返回当前用户信息）*/
    @GetMapping("/me")
    public ResponseEntity<ApiResult<String>> me(
            @RequestAttribute(required = false) String username) {
        return ResponseEntity.ok(ApiResult.ok("已登录"));
    }
}
