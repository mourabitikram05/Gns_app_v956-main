package com.gns.sirh.dto;

import java.time.LocalDateTime;

public record NotificationDto(
        Long id,
        String message,
        String type,
        boolean lu,
        LocalDateTime dateEnvoi
) {
}
