package com.gns.sirh.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public record PointageDto(
        Long id,
        String employeNom,
        LocalDate date,
        LocalTime heureArrivee,
        LocalTime heureDepart,
        String duree
) {
}
