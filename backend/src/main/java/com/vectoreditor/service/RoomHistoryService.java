package com.vectoreditor.service;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

/**
 * 画室历史栈管理服务
 * 使用 ReentrantLock 公平锁保证一人操作时上锁
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RoomHistoryService {

    /**
     * 房间历史状态
     */
    @Data
    public static class RoomHistoryState {
        private List<String> history; // 历史栈，存储每个快照的 JSON 字符串
        private int currentIndex;     // 当前历史索引
        private final ReentrantLock lock; // 公平锁

        public RoomHistoryState() {
            this.history = new ArrayList<>();
            this.currentIndex = 0;
            this.lock = new ReentrantLock(true); // 公平锁
        }
    }

    /** 房间 ID -> 历史状态（线程安全） */
    private final ConcurrentHashMap<Long, RoomHistoryState> roomHistories = new ConcurrentHashMap<>();

    /**
     * 获取或创建房间的历史状态
     */
    public RoomHistoryState getOrCreateRoomHistory(Long canvasId) {
        return roomHistories.computeIfAbsent(canvasId, k -> new RoomHistoryState());
    }

    /**
     * 初始化房间历史栈（当用户打开画布时调用）
     */
    public void initRoomHistory(Long canvasId, String initialElementsJson) {
        RoomHistoryState state = getOrCreateRoomHistory(canvasId);
        state.lock.lock();
        try {
            if (state.history.isEmpty()) {
                state.history.add(initialElementsJson);
                state.currentIndex = 0;
                log.info("[历史栈] 初始化房间 canvasId={} historySize=1", canvasId);
            }
        } finally {
            state.lock.unlock();
        }
    }

    /**
     * 向历史栈添加新快照（本地操作时调用）
     */
    public void pushHistorySnapshot(Long canvasId, String elementsJson) {
        RoomHistoryState state = getOrCreateRoomHistory(canvasId);
        state.lock.lock();
        try {
            // 截断当前位置之后的历史（撤销后做新操作会丢弃后面的重做历史）
            if (state.currentIndex < state.history.size() - 1) {
                state.history = new ArrayList<>(state.history.subList(0, state.currentIndex + 1));
            }
            // 添加新快照，最多保留50步
            if (state.history.size() >= 50) {
                state.history.remove(0);
            } else {
                state.currentIndex++;
            }
            state.history.add(elementsJson);
            log.debug("[历史栈] 推入快照 canvasId={} index={} size={}", canvasId, state.currentIndex, state.history.size());
        } finally {
            state.lock.unlock();
        }
    }

    /**
     * 执行撤销操作
     * @return 撤销后的元素 JSON，null 表示无法撤销
     */
    public String doUndo(Long canvasId) {
        RoomHistoryState state = getOrCreateRoomHistory(canvasId);
        state.lock.lock();
        try {
            if (state.currentIndex <= 0) {
                log.debug("[历史栈] 无法撤销 canvasId={} index={}", canvasId, state.currentIndex);
                return null;
            }
            state.currentIndex--;
            log.info("[历史栈] 撤销 canvasId={} 新 index={}", canvasId, state.currentIndex);
            return state.history.get(state.currentIndex);
        } finally {
            state.lock.unlock();
        }
    }

    /**
     * 获取当前历史索引
     */
    public int getCurrentIndex(Long canvasId) {
        RoomHistoryState state = roomHistories.get(canvasId);
        if (state == null) return 0;
        state.lock.lock();
        try {
            return state.currentIndex;
        } finally {
            state.lock.unlock();
        }
    }

    /**
     * 获取历史栈大小
     */
    public int getHistorySize(Long canvasId) {
        RoomHistoryState state = roomHistories.get(canvasId);
        if (state == null) return 0;
        state.lock.lock();
        try {
            return state.history.size();
        } finally {
            state.lock.unlock();
        }
    }

    /**
     * 检查是否能撤销
     */
    public boolean canUndo(Long canvasId) {
        return getCurrentIndex(canvasId) > 0;
    }

    /**
     * 清理房间历史（当所有人都离开房间时调用）
     */
    public void clearRoomHistory(Long canvasId) {
        RoomHistoryState state = roomHistories.get(canvasId);
        if (state != null) {
            state.lock.lock();
            try {
                state.history.clear();
                state.currentIndex = 0;
                log.info("[历史栈] 清理房间 canvasId={}", canvasId);
            } finally {
                state.lock.unlock();
                roomHistories.remove(canvasId);
            }
        }
    }

    /**
     * 获取完整历史栈（用于同步）
     */
    public RoomHistorySnapshot getHistorySnapshot(Long canvasId) {
        RoomHistoryState state = getOrCreateRoomHistory(canvasId);
        state.lock.lock();
        try {
            return new RoomHistorySnapshot(new ArrayList<>(state.history), state.currentIndex);
        } finally {
            state.lock.unlock();
        }
    }

    /**
     * 历史快照 DTO
     */
    @Data
    public static class RoomHistorySnapshot {
        private List<String> history;
        private int currentIndex;

        public RoomHistorySnapshot(List<String> history, int currentIndex) {
            this.history = history;
            this.currentIndex = currentIndex;
        }
    }
}
