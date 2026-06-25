package com.vectoreditor.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


/**
 * 撤销/重做操作响应
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HistoryOperationResponse {

    /** 操作是否成功 */
    private boolean success;

    /** 操作类型：UNDO */
    private String operation;

    /** 操作后的元素 JSON 字符串 */
    private String elements;

    /** 当前历史索引 */
    private int currentIndex;

    /** 历史栈大小 */
    private int historySize;

    /** 是否还能继续撤销 */
    private boolean canUndo;
}

