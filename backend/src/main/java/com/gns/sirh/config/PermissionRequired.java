package com.gns.sirh.config;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Exige une permission métier (matrice de contrôle d'accès) en plus du rôle.
 * Vérifié par {@link PermissionAspect} avant l'exécution de la méthode.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface PermissionRequired {
    String value();
}
