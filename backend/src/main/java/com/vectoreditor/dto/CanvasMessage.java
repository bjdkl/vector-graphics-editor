package com.vectoreditor.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

/**
 * 协同绘图 WebSocket 消息 DTO
 * 统一所有协同操作的通信格式
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CanvasMessage {

    /** 消息类型：ELEMENT_ADD / ELEMENT_UPDATE / ELEMENT_DELETE / CURSOR_MOVE */
    private String type;

    /** 画布 ID（房间标识） */
    private Long canvasId;

    /** 发送者用户 ID */
    private Long userId;

    /** 发送者用户名（用于光标显示等） */
    private String username;

    /** 消息时间戳，用于冲突解决（Last-Writer-Wins） */
    private Instant timestamp;

    /**
     * 消息载荷，根据 type 不同含义不同：
     * - ELEMENT_ADD/UPDATE: GraphElement JSON 对象（id, type, 坐标, 样式等）
     * - ELEMENT_DELETE: {"elementId": "xxx"}
     * - CURSOR_MOVE: {"x": 100, "y": 200}
     */
    private Map<String, Object> payload;
}
