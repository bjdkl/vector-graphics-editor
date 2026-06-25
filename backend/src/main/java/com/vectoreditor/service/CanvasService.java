package com.vectoreditor.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vectoreditor.dto.CanvasResponse;
import com.vectoreditor.dto.CanvasSaveRequest;
import com.vectoreditor.model.Canvas;
import com.vectoreditor.repository.CanvasRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CanvasService {

    private final CanvasRepository canvasRepository;
    private final ObjectMapper objectMapper;

    /** 查询用户所有画布（列表视图） */
    public List<CanvasResponse> listByUser(Long userId) {
        return canvasRepository.findByUserIdOrderByUpdatedAtDesc(userId)
            .stream()
            .map(this::toMeta)
            .collect(Collectors.toList());
    }

    /** 加载单个画布（包含完整 elements） */
    public CanvasResponse getById(Long id, Long userId) {
        Canvas canvas = canvasRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new IllegalArgumentException("画布不存在或无权访问"));
        return toFull(canvas);
    }

    /** 新建画布 */
    @Transactional
    public CanvasResponse create(CanvasSaveRequest req, Long userId) {
        Canvas canvas = Canvas.builder()
            .userId(userId)
            .name(req.getName() != null ? req.getName() : "未命名图形")
            .canvasWidth(req.getCanvasWidth() != null ? req.getCanvasWidth() : 1200)
            .canvasHeight(req.getCanvasHeight() != null ? req.getCanvasHeight() : 800)
            .backgroundColor(req.getBackgroundColor() != null ? req.getBackgroundColor() : "#ffffff")
            .elements(req.getElements() != null ? req.getElements() : "[]")
            .build();
        return toFull(canvasRepository.save(canvas));
    }

    /** 更新画布 */
    @Transactional
    public CanvasResponse update(Long id, CanvasSaveRequest req, Long userId) {
        Canvas canvas = canvasRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new IllegalArgumentException("画布不存在或无权访问"));
        if (req.getName() != null) canvas.setName(req.getName());
        if (req.getCanvasWidth() != null) canvas.setCanvasWidth(req.getCanvasWidth());
        if (req.getCanvasHeight() != null) canvas.setCanvasHeight(req.getCanvasHeight());
        if (req.getBackgroundColor() != null) canvas.setBackgroundColor(req.getBackgroundColor());
        if (req.getElements() != null) canvas.setElements(req.getElements());
        return toFull(canvasRepository.save(canvas));
    }

    /** 删除画布 */
    @Transactional
    public void delete(Long id, Long userId) {
        Canvas canvas = canvasRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new IllegalArgumentException("画布不存在或无权访问"));
        canvasRepository.delete(canvas);
    }

    /** 创建画室：为指定画布生成 UUID 邀请码 */
    @Transactional
    public CanvasResponse createRoom(Long canvasId, Long userId) {
        Canvas canvas = canvasRepository.findByIdAndUserId(canvasId, userId)
            .orElseThrow(() -> new IllegalArgumentException("画布不存在或无权访问"));
        if (canvas.getRoomId() == null || canvas.getRoomId().isBlank()) {
            canvas.setRoomId(UUID.randomUUID().toString());
            canvas = canvasRepository.save(canvas);
        }
        return toFull(canvas);
    }

    /** 通过画室 UUID 加入：返回对应画布完整数据（含 elements） */
    public CanvasResponse joinByRoomId(String roomId, Long userId) {
        Optional<Canvas> opt = canvasRepository.findByRoomId(roomId);
        if (opt.isEmpty()) {
            throw new IllegalArgumentException("画室不存在，请检查邀请码是否正确");
        }
        return toFull(opt.get());
    }

    /** 验证画布归属权（不做完整查询，仅检查存在性） */
    public void verifyOwnership(Long canvasId, Long userId) {
        if (!canvasRepository.existsByIdAndUserId(canvasId, userId)) {
            throw new IllegalArgumentException("画布不存在或无权访问");
        }
    }

    // ── 转换方法 ──

    /** 列表视图（不含完整 elements，只含数量） */
    private CanvasResponse toMeta(Canvas c) {
        int count = 0;
        if (c.getElements() != null && !c.getElements().isBlank()) {
            try {
                count = objectMapper.readTree(c.getElements()).size();
            } catch (JsonProcessingException ignored) {}
        }
        return CanvasResponse.builder()
            .id(c.getId())
            .name(c.getName())
            .canvasWidth(c.getCanvasWidth())
            .canvasHeight(c.getCanvasHeight())
            .backgroundColor(c.getBackgroundColor())
            .elementCount(count)
            .roomId(c.getRoomId())
            .createdAt(c.getCreatedAt())
            .updatedAt(c.getUpdatedAt())
            .build();
    }

    /** 完整视图（含 elements） */
    private CanvasResponse toFull(Canvas c) {
        return CanvasResponse.builder()
            .id(c.getId())
            .name(c.getName())
            .canvasWidth(c.getCanvasWidth())
            .canvasHeight(c.getCanvasHeight())
            .backgroundColor(c.getBackgroundColor())
            .elements(c.getElements())
            .roomId(c.getRoomId())
            .createdAt(c.getCreatedAt())
            .updatedAt(c.getUpdatedAt())
            .build();
    }
}
