package com.vectoreditor.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Entity
@Table(name = "canvases")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Canvas {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(name = "canvas_width", nullable = false)
    private Integer canvasWidth;

    @Column(name = "canvas_height", nullable = false)
    private Integer canvasHeight;

    @Column(name = "background_color", nullable = false, length = 32)
    private String backgroundColor;

    /** GraphElement[] JSON 序列化 */
    @Column(columnDefinition = "LONGTEXT", nullable = false)
    private String elements;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** 画室 UUID（协同邀请码），为 null 表示未创建画室 */
    @Column(name = "room_id", unique = true, length = 36)
    private String roomId;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (backgroundColor == null) backgroundColor = "#ffffff";
        if (canvasWidth == null) canvasWidth = 1200;
        if (canvasHeight == null) canvasHeight = 800;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
