package com.gns.sirh.common;

/**
 * Exception métier — levée pour les règles de gestion (solde insuffisant, chevauchement, etc.)
 */
public class BusinessException extends RuntimeException {

    public BusinessException(String message) {
        super(message);
    }
}
