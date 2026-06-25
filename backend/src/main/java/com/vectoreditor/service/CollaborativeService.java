package com.vectoreditor.service;

import com.vectoreditor.dto.CanvasMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

/**
 * 协同绘图服务
 * 负责消息转发到画布房间
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CollaborativeService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * 广播消息到指定画布房间
     * 目标地址: /topic/canvas/{canvasId}
     */
    public void broadcastToCanvas(CanvasMessage message) {
        String destination = "/topic/canvas/" + message.getCanvasId();
        log.debug("[协同] 广播消息 type={} canvas={} user={}",
                message.getType(), message.getCanvasId(), message.getUserId());
        messagingTemplate.convertAndSend(destination, message);
    }
}
