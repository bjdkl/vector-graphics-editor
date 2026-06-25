package com.vectoreditor.service;

import com.vectoreditor.dto.AuthResponse;
import com.vectoreditor.dto.LoginRequest;
import com.vectoreditor.dto.RegisterRequest;
import com.vectoreditor.model.User;
import com.vectoreditor.repository.UserRepository;
import com.vectoreditor.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    /** 注册新用户 */
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByUsername(req.getUsername())) {
            throw new IllegalArgumentException("用户名已被占用");
        }
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new IllegalArgumentException("邮箱已被注册");
        }

        User user = User.builder()
                .username(req.getUsername())
                .email(req.getEmail())
                .password(passwordEncoder.encode(req.getPassword()))
                .nickname(req.getNickname() != null && !req.getNickname().isBlank()
                        ? req.getNickname() : req.getUsername())
                .build();
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getUsername());
        return AuthResponse.builder()
                .token(token)
                .username(user.getUsername())
                .nickname(user.getNickname())
                .email(user.getEmail())
                .userId(user.getId())
                .build();
    }

    /** 用户登录 */
    public AuthResponse login(LoginRequest req) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.getUsername(), req.getPassword())
            );
        } catch (AuthenticationException e) {
            throw new IllegalArgumentException("用户名或密码错误");
        }

        User user = userRepository.findByUsername(req.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("用户不存在"));

        String token = jwtUtil.generateToken(user.getUsername());
        return AuthResponse.builder()
                .token(token)
                .username(user.getUsername())
                .nickname(user.getNickname())
                .email(user.getEmail())
                .userId(user.getId())
                .build();
    }
}
