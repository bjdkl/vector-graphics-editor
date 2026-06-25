package com.vectoreditor.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CanvasSaveRequest {
    private String name;
    private Integer canvasWidth;
    private Integer canvasHeight;
    private String backgroundColor;
    /** GraphElement[] JSON 字符串 */
    private String elements;
}
