package com.gns.sirh.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record SondageRequest(
        @NotBlank(message = "La question est obligatoire")
        @Size(max = 255, message = "Question trop longue (255 caractères max)")
        String question,

        @NotEmpty(message = "Au moins deux options sont requises")
        List<@NotBlank(message = "Une option ne peut pas être vide") String> options,

        LocalDate date) {

    public SondageRequest {
        if (options != null && options.size() < 2) {
            throw new IllegalArgumentException("Au moins deux options sont requises");
        }
    }
}
