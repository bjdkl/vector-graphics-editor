package com.vectoreditor.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vectoreditor.dto.CanvasMessage;
import com.vectoreditor.dto.HistoryOperationRequest;
import com.vectoreditor.dto.HistoryOperationResponse;
import com.vectoreditor.dto.PushHistoryRequest;
import com.vectoreditor.model.User;
import com.vectoreditor.security.WebSocketAuthInterceptor;
import com.vectoreditor.service.CollaborativeService;
import com.vectoreditor.service.RoomHistoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.util.List;
import java.util.Map;

/**
 * 协同绘图 WebSocket 控制器
 * 处理前端发送的绘图消息，通过 CollaborativeService 广播给房间内其他用户
 *
 * STOMP 消息路由：
 * 客户端发送 → /app/canvas/{canvasId}/draw → @MessageMapping → broadcast
 * 客户端发送 → /app/canvas/{canvasId}/history → @MessageMapping → 历史操作
 * 客户端订阅 → /topic/canvas/{canvasId} ← 接收广播消息
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class CanvasWSController {

    private final CollaborativeService collaborativeService;
    private final RoomHistoryService roomHistoryService;
    private final WebSocketAuthInterceptor authInterceptor;
    private final ObjectMapper objectMapper;

    /**
     * 处理协同绘图消息
     * 前端通过 /app/canvas/{canvasId}/draw 发送 CanvasMessage
     * 服务端校验后转发到 /topic/canvas/{canvasId} 广播
     */
    @MessageMapping("/canvas/{canvasId}/draw")
    public void handleDrawMessage(
            @DestinationVariable Long canvasId,
            @Payload CanvasMessage message,
            @Header(name = "nativeHeaders", required = false) Map<String, List<String>> nativeHeaders) {

        // 从 nativeHeaders 提取并验证 JWT
        User user = extractUserFromHeaders(nativeHeaders);
        if (user == null) {
            log.warn("[协同] 未认证的绘制请求 canvas={}", canvasId);
            return;
        }

        Long userId = user.getId();
        String username = user.getUsername();

        // 补全消息字段
        message.setCanvasId(canvasId);
        message.setUserId(userId);
        message.setUsername(username);
        if (message.getTimestamp() == null) {
            message.setTimestamp(java.time.Instant.now());
        }

        log.info("[协同] 收到绘制消息 type={} canvas={} user={}",
                message.getType(), canvasId, userId);

        // 广播到画布房间
        collaborativeService.broadcastToCanvas(message);

        // 注意：元素增删改查的持久化由前端在关键节点主动调用 REST API 完成，
        // 此处仅做实时同步广播，避免频繁写库造成性能问题
    }

    /**
     * 处理历史操作：撤销
     * 前端通过 /app/canvas/{canvasId}/history 发送操作
     * 服务端使用公平锁同步处理，然后广播给所有用户
     */
    @MessageMapping("/canvas/{canvasId}/history")
    @SendTo("/topic/canvas/{canvasId}")
    public CanvasMessage handleHistoryOperation(
            @DestinationVariable Long canvasId,
            @Payload HistoryOperationRequest request,
            @Header(name = "nativeHeaders", required = false) Map<String, List<String>> nativeHeaders) {

        // 从 nativeHeaders 提取并验证 JWT
        User user = extractUserFromHeaders(nativeHeaders);
        if (user == null) {
            log.warn("[历史] 未认证的历史操作请求 canvas={}", canvasId);
            return null;
        }

        String operation = request.getOperation(); // UNDO
        log.info("[历史] 收到操作 canvasId={} operation={} user={}", canvasId, operation, user.getUsername());

        // 仅支持撤销操作
        if (!"UNDO".equals(operation)) {
            log.warn("[历史] 不支持的操作类型 canvasId={} operation={}", canvasId, operation);
            return null;
        }

        // 执行撤销操作（已上锁）
        String newElements = roomHistoryService.doUndo(canvasId);
        if (newElements == null) {
            log.warn("[历史] 撤销失败 canvasId={} operation={}", canvasId, operation);
            return null;
        }

        // 构造历史同步消息
        HistoryOperationResponse historyResponse = HistoryOperationResponse.builder()
                .success(true)
                .operation(operation)
                .elements(newElements)
                .currentIndex(roomHistoryService.getCurrentIndex(canvasId))
                .historySize(roomHistoryService.getHistorySize(canvasId))
                .canUndo(roomHistoryService.canUndo(canvasId))
                .build();

        // 将 HistoryOperationResponse 转换为 Map
        @SuppressWarnings("unchecked")
        Map<String, Object> msgPayload = objectMapper.convertValue(historyResponse, Map.class);

        CanvasMessage syncMessage = CanvasMessage.builder()
                .type("HISTORY_UNDO")
                .canvasId(canvasId)
                .userId(user.getId())
                .username(user.getUsername())
                .timestamp(java.time.Instant.now())
                .payload(msgPayload)
                .build();

        log.info("[历史] 操作完成 canvasId={} operation={} broadcasting...", canvasId, operation);
        return syncMessage;
    }

    /**
     * 推入新快照到历史栈
     * 前端通过 /app/canvas/{canvasId}/push-history 调用
     */
    @MessageMapping("/canvas/{canvasId}/push-history")
    public void pushHistory(
            @DestinationVariable Long canvasId,
            @Payload PushHistoryRequest request,
            @Header(name = "nativeHeaders", required = false) Map<String, List<String>> nativeHeaders) {

        // 从 nativeHeaders 提取并验证 JWT
        User user = extractUserFromHeaders(nativeHeaders);
        if (user == null) {
            log.warn("[历史] 未认证的推入请求 canvas={}", canvasId);
            return;
        }

        String elementsJson = request.getElements();
        log.debug("[历史] 推入新快照 canvasId={} user={}", canvasId, user.getUsername());

        roomHistoryService.pushHistorySnapshot(canvasId, elementsJson);
    }

    /**
     * 从 nativeHeaders 中提取用户信息
     */
    private User extractUserFromHeaders(Map<String, List<String>> nativeHeaders) {
        if (nativeHeaders == null) return null;

        // 优先从 Authorization 头获取 token
        List<String> authHeaders = nativeHeaders.get("Authorization");
        if (authHeaders != null && !authHeaders.isEmpty()) {
            String auth = authHeaders.get(0);
            if (auth.startsWith("Bearer ")) {
                return authInterceptor.authenticate(auth.substring(7));
            }
        }

        // 备选：从 token 头获取
        List<String> tokenHeaders = nativeHeaders.get("token");
        if (tokenHeaders != null && !tokenHeaders.isEmpty()) {
            return authInterceptor.authenticate(tokenHeaders.get(0));
        }

        return null;
    }
}
