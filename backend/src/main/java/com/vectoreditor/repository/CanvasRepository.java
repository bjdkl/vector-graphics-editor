package com.vectoreditor.repository;

import com.vectoreditor.model.Canvas;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CanvasRepository extends JpaRepository<Canvas, Long> {

    /** 查询某用户的所有画布（按更新时间倒序） */
    List<Canvas> findByUserIdOrderByUpdatedAtDesc(Long userId);

    /** 查询指定用户的指定画布 */
    Optional<Canvas> findByIdAndUserId(Long id, Long userId);

    /** 通过画室 UUID 查找画布 */
    Optional<Canvas> findByRoomId(String roomId);

    /** 校验画布归属权（轻量级存在性检查） */
    boolean existsByIdAndUserId(Long id, Long userId);
}
