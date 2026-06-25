package com.vectoreditor.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CanvasResponse {
    private Long id;
    private String name;
    private Integer canvasWidth;
    private Integer canvasHeight;
    private String backgroundColor;
    /** 完整元素 JSON（单个加载时返回） */
    private String elements;
    /** 列表展示时元素数量 */
    private Integer elementCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    /** 画室邀请码（UUID） */
    private String roomId;
}
