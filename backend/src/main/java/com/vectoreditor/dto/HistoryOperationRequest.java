package com.vectoreditor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 历史操作请求 DTO
 * 用于接收前端发送的撤销/重做操作
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HistoryOperationRequest {
    
    /**
     * 操作类型：UNDO
     */
    private String operation;
}