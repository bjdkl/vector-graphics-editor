package com.vectoreditor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 推送历史快照请求 DTO
 * 用于接收前端发送的新历史快照
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PushHistoryRequest {
    
    /**
     * 元素 JSON 字符串
     */
    private String elements;
}