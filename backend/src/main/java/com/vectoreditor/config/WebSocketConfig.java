package com.vectoreditor.config;

import com.vectoreditor.security.WebSocketAuthInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketAuthInterceptor webSocketAuthInterceptor;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // SockJS 回退端点，客户端通过 /ws 连接
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")  // 开发阶段允许所有 origin
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // 启用简单内存消息代理，前缀 /topic 和 /queue
        registry.enableSimpleBroker("/topic", "/queue");
        // 客户端发送消息的前缀（对应 @MessageMapping）
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // 添加认证拦截器（仅验证 CONNECT 帧）
        registration.interceptors(webSocketAuthInterceptor);
    }
}
