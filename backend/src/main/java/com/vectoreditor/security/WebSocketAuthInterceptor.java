package com.vectoreditor.security;

import com.vectoreditor.model.User;
import com.vectoreditor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null) {
            return message;
        }

        log.debug("[WS认证] 收到 STOMP 命令: {}", accessor.getCommand());

        // 只在 CONNECT 帧时验证 token
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String token = extractToken(accessor);
            log.debug("[WS认证] 从 CONNECT 帧中提取到 token: {}", token != null ? "present" : "missing");
            
            if (token != null && !token.isEmpty()) {
                User user = authenticate(token);
                if (user != null) {
                    log.info("[WS认证] 用户 {} (id={}) 已通过 WebSocket 认证", user.getUsername(), user.getId());
                } else {
                    log.warn("[WS认证] CONNECT 帧中 token 无效, sessionId={}", accessor.getSessionId());
                    throw new IllegalArgumentException("无效的 JWT token");
                }
            } else {
                log.warn("[WS认证] CONNECT 帧中未找到 token, sessionId={}", accessor.getSessionId());
                // 认证失败，抛出异常拒绝连接
                throw new IllegalArgumentException("WebSocket connection requires JWT token");
            }
        }

        return message;
    }

    /**
     * 从 STOMP CONNECT frame 中提取 JWT token
     * 优先级：Authorization Bearer header > "token" header
     */
    private String extractToken(StompHeaderAccessor accessor) {
        // 路径 1：Authorization: Bearer xxx（前端 @stomp/stompjs connectHeaders 标准方式）
        List<String> authHeaders = accessor.getNativeHeader("Authorization");
        if (authHeaders != null && !authHeaders.isEmpty()) {
            String auth = authHeaders.get(0);
            if (auth.startsWith("Bearer ")) {
                return auth.substring(7);
            }
        }

        // 路径 2：自定义 "token" header（备用方式）
        List<String> tokenHeaders = accessor.getNativeHeader("token");
        if (tokenHeaders != null && !tokenHeaders.isEmpty()) {
            return tokenHeaders.get(0);
        }

        return null;
    }

    public User authenticate(String token) {
        try {
            String username = jwtUtil.getUsernameFromToken(token);
            if (username != null) {
                User user = userRepository.findByUsername(username).orElse(null);
                if (user == null) {
                    log.warn("[WS认证] 用户不存在: {}", username);
                    return null;
                }
                return user;
            }
        } catch (Exception e) {
            log.error("[WS认证] Token 解析失败", e);
        }
        return null;
    }
}
