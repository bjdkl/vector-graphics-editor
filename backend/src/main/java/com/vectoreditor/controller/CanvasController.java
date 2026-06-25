package com.vectoreditor.controller;

import com.vectoreditor.dto.ApiResult;
import com.vectoreditor.dto.CanvasResponse;
import com.vectoreditor.dto.CanvasSaveRequest;
import com.vectoreditor.dto.HistoryStateResponse;
import com.vectoreditor.model.User;
import com.vectoreditor.service.CanvasService;
import com.vectoreditor.service.RoomHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/files")
@RequiredArgsConstructor
public class CanvasController {

    private final CanvasService canvasService;
    private final RoomHistoryService roomHistoryService;

    /** GET /api/files — 查询当前用户所有画布列表 */
    @GetMapping
    public ApiResult<List<CanvasResponse>> list(@AuthenticationPrincipal User user) {
        return ApiResult.ok(canvasService.listByUser(user.getId()));
    }

    /** GET /api/files/{id} — 加载单个画布 */
    @GetMapping("/{id}")
    public ApiResult<CanvasResponse> get(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ApiResult.ok(canvasService.getById(id, user.getId()));
    }

    /** POST /api/files — 新建画布 */
    @PostMapping
    public ApiResult<CanvasResponse> create(
            @RequestBody CanvasSaveRequest req,
            @AuthenticationPrincipal User user) {
        return ApiResult.ok(canvasService.create(req, user.getId()));
    }

    /** PUT /api/files/{id} — 更新画布 */
    @PutMapping("/{id}")
    public ApiResult<CanvasResponse> update(
            @PathVariable Long id,
            @RequestBody CanvasSaveRequest req,
            @AuthenticationPrincipal User user) {
        return ApiResult.ok(canvasService.update(id, req, user.getId()));
    }

    /** DELETE /api/files/{id} — 删除画布 */
    @DeleteMapping("/{id}")
    public ApiResult<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        canvasService.delete(id, user.getId());
        return ApiResult.ok(null);
    }

    /** POST /api/files/{id}/create-room — 创建画室（生成 UUID 邀请码） */
    @PostMapping("/{id}/create-room")
    public ApiResult<CanvasResponse> createRoom(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        CanvasResponse canvas = canvasService.createRoom(id, user.getId());
        // 初始化历史栈
        roomHistoryService.initRoomHistory(id, canvas.getElements());
        return ApiResult.ok(canvas);
    }

    /** GET /api/files/join?roomId=xxx — 通过 UUID 加入画室 */
    @GetMapping("/join")
    public ApiResult<CanvasResponse> joinRoom(
            @RequestParam String roomId,
            @AuthenticationPrincipal User user) {
        CanvasResponse canvas = canvasService.joinByRoomId(roomId, user.getId());
        // 确保历史栈已初始化
        roomHistoryService.initRoomHistory(canvas.getId(), canvas.getElements());
        return ApiResult.ok(canvas);
    }

    /** GET /api/files/{id}/history-state — 获取历史栈状态 */
    @GetMapping("/{id}/history-state")
    public ApiResult<HistoryStateResponse> getHistoryState(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        canvasService.verifyOwnership(id, user.getId());
        return ApiResult.ok(HistoryStateResponse.builder()
                .history(roomHistoryService.getHistorySnapshot(id).getHistory())
                .currentIndex(roomHistoryService.getCurrentIndex(id))
                .canUndo(roomHistoryService.canUndo(id))
                .build());
    }
}
