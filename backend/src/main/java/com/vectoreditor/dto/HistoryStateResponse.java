package com.vectoreditor.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HistoryStateResponse {
    private List<String> history;
    private int currentIndex;
    private boolean canUndo;
}
