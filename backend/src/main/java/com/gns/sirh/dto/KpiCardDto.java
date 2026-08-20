package com.gns.sirh.dto;

public record KpiCardDto(
        String key,
        String label,
        String value,
        String change,
        boolean up
) {
}
