Je développe une application web RH (SIRH) nommée GNS, destinée à deux profils d'utilisateurs : les collaborateurs (self-service RH) et les RH / managers (pilotage et validation). Avant de commencer le développement, je veux que tu dessines les maquettes haute-fidélité (wireframes UI) de toutes les interfaces listées ci-dessous, en respectant strictement le système de design et les spécifications fonctionnelles fournies.




SYSTÈME DE DESIGN




- Style : SaaS moderne, épuré, professionnel, inspiré des dashboards type Notion/Linear/Workday.

- Palette :

  -  NOIRE principal (actions, boutons primaires, badges positifs) : 

  - Bleu marine foncé (sidebar alternative, KPI cards) : `#0F1E3D`

  - Fond général : blanc / gris très clair `#F7F8FA`

  - Badges de statut : orange/jaune = "En attente", vert = "Accepté/Remboursé", rouge = "Refusé"

- Typographie : sans-serif moderne (type Inter/Sans Serif), titres en gras, hiérarchie claire (H1 dashboard > titres de cartes > labels).

- Layout : sidebar de navigation fixe à gauche (icônes + libellés), header supérieur avec barre de recherche, icônes notifications/messagerie, avatar + nom utilisateur à droite.

- Composants récurrents : cartes KPI (icône + chiffre + variation), graphiques (barres, donuts, courbes), tableaux avec avatars, badges de statut, boutons d'action (accepter ✅ / refuser ❌), modales de formulaire, bouton principal "+ Nouvelle demande" en haut à droite.

- Responsive : prévoir une version desktop (priorité) et une version mobile simplifiée.




---




LISTE DES ÉCRANS À GÉNÉRER




A — Dashboard RH

Vue globale des indicateurs RH.

- KPI cards : Effectif total, Nouveaux recrutements, Taux d'absentéisme, Engagement moyen, Congés en attente, Absences aujourd'hui, Postes ouverts, Formations ce mois.

- Graphiques : jours d'absence par mois (barres), effectifs par département (donut).

- Blocs : "Actions en attente" (liste avec boutons Accepter/Refuser), "Activité récente" (flux d'événements horodatés).




B — Dashboard Collaborateur

- Header : recherche, notifications, messagerie, avatar, bouton "+ Nouvelle demande" (menu : Congés/Notes de frais/Documents/Interventions).

- Carte profil : photo, nom, poste, ville, date de naissance + raccourcis (Profil/Calendrier/Tâches/Documents).

- Carte temps : heure/date, bouton pointage arrivée/départ, temps de travail.

- Onglets "Suivi des demandes" : Vacances / Note de frais / Documents / Interventions, avec tableau (avatar, type, période, montant/durée, statut badge, actions).

- Widgets secondaires : calendrier d'équipe, sondage du jour, mon équipe, prochains événements (formation, séminaire, réunion).




C — Congés (Vue Collaborateur)

- Onglets fiche collaborateur (Personnel/Emploi/Paie/Congés/Documents/Note de frais/Matériel/Notes/Formation).

- Carte profil + compteurs KPI : solde au 31/12, solde à ce jour, jours pris, récapitulatif par type (congés payés/absence justifiée/non justifiée).

- Calendrier mensuel interactif (navigation mois précédent/suivant, bascule vue Mensuel/Liste).

- Modale "Demander un congé/absence" : type de demande (liste déroulante), solde affiché, sélecteur de période (double calendrier), total jours calculé, upload justificatif, remarque, boutons Annuler/Enregistrer.




D — Congés (Vue RH — Calendrier collectif)

- Onglets : Calendrier des congés / Collaborateurs en congé (compteur).

- Recherche, filtres, export, bouton "Réserver un congé".

- Grille planning : lignes = collaborateurs (avatar+nom), colonnes = jours, cellules = blocs colorés par type d'absence (légende couleur), ligne "Effectif" (ratio présents/total).

- Popup détail demande : collaborateur, total jours, type, statut (badge), période, description, historique de validation (timeline).




E — Note de frais (Vue Collaborateur)

- Modale de création : titre/motif, devise (MAD/USD/EUR), date, priorité/remarque, upload justificatif, ajout ordre de mission, boutons Annuler/Demander.




F — Note de frais (Vue RH)

- Cartes indicateurs : En attente d'approbation / En attente de remboursement / Remboursé / Refusé (nombre + montant).

- Recherche, filtres, tableau (case à cocher, titre, nb dépenses, collaborateur, date création, statut badge, total, action Ouvrir).




G — Notifications

- Toast de confirmation collaborateur : "Votre note de frais a été remboursée" (icône pouce levé, confettis).

- Toast RH avec boutons accepter/refuser.




H — Documents (Vue Collaborateur)

- Modale "Demander un document" : type (liste déroulante : attestation travail, attestation travail+salaire, domiciliation salaire, attestation IR, bulletin de paie), format souhaité (case à cocher digital/papier), remarques.

- Onglet profil "Documents" : bloc "Documents récents" (cartes avec icône, nom, indicateur nouveauté, boutons Télécharger/Aperçu), bloc "Statut des demandes" (tableau).

- Aperçu document généré (ex. Attestation de travail) avec cachet et signature électronique.




I — Documents (Vue RH)

- Boutons "Demander un document" / "Dossiers d'entreprise".

- Bloc "Demandes à traiter" (compteur KPI), recherche, filtres.

- Tableau : référence, employé (avatar+nom), type, date demande, statut badge, menu action (valider/refuser/détail).




J — Planning / Shifts (Vue RH)

- Vue "Suivi des shifts" : sélecteur jour/semaine/mois, bouton Publier.

- Grille type Gantt : lignes = fonctions/postes (serveur, chef pâtissier, chef cuisinier, télé-conseiller, responsable qualité, chef d'atelier, superviseur, gestionnaire de paie), colonnes = jours de la semaine, cellules = blocs shift colorés (horaires + collaborateur).

- Ligne récapitulative "Heures travaillées" par jour.

- Modale "Ajouter un shift de travail" : nom collaborateur, heure début/fin, durée pause, sélecteurs fonction/position, sélection jours (Lun-Dim), boutons Annuler/Enregistrer.




K — Planning (Vue Collaborateur)

- "Mes shifts" : tableau (date, début, fin, pause, fonction, position, action : remplacer un shift / modifier le shift).

- Notification mobile "Votre shift a été publié".




L — Messagerie

- Liste des conversations (avatars, +50 autres personnes), zone de chat, champ d'envoi de message + GIF.

- Vue conversation 1-to-1 et vue groupe ("Équipe IT" avec plusieurs participants).

- Notification d'invitation à rejoindre un groupe.




M — Recrutement

- Vue "Postes" : liste des offres (titre, type, statut publié/brouillon/ouvert, compteurs boîte réception/en cours/embauché/rejetée/total), bouton "+ Ajouter offre d'emploi".

- Modale "Ajouter le poste" avec onglets : Détails du poste / Questionnaire / Processus de recrutement / Équipe de recrutement.

  - Détails : titre, secteur, pays, adresse société, niveau d'expérience, type de contrat, département, type (sur place/remote), horaires, nombre de postes, date de clôture, description (éditeur riche + option "Régénérer avec IA").

  - Questionnaire : champs obligatoires (nom, prénom, email, téléphone) + champs optionnels (LinkedIn, photo) avec toggle visibilité.

  - Processus de recrutement : étapes personnalisables (Pré-sélection, Entretien téléphonique, Entretien physique, Tests techniques...).

- Vue pipeline candidats : colonnes Kanban par étape avec cartes candidats (nom, note étoiles, date).




N — Tâches

- Sélection de catégorie (Projet de digitalisation, Tâches administratives, Recrutement, Onboarding, Offboarding).

- Vue Kanban : colonnes "À faire / En cours / Terminé" avec compteurs, bouton "+" par colonne.

- Modale "Nouveau tâche" : nom, statut (liste déroulante), description (éditeur riche).

- Cartes tâches avec titre, description courte, date, avatar assigné, icônes (commentaires, pièces jointes).




O — Annuaire d'entreprise

- Barre de recherche (nom, service, poste, compétence, ancienneté).

- Fiches contact (photo, nom, poste, téléphone, email, bureau, manager).

- Organigramme interactif / trombinoscope.




P — Événements d'entreprise

- Cartes KPI : événements à venir, participants inscrits, ce mois, mes inscriptions.

- Filtres par catégorie (Réunion, Formation, Séminaire, Atelier, Célébration, Team Building, Conférence, Événement sportif).

- Cartes événement : badge catégorie, statut inscription, titre, date/heure, lieu, jauge participants, boutons Détails/S'inscrire.

- Bouton "+ Créer un événement".




Q — KPI & Reporting (Direction/RH)

- Cartes KPI globales : effectif total, taux de rétention, taux d'absentéisme, score d'engagement (avec variation vs période précédente).

- Onglets : Vue globale / Effectifs / Congés / Formation / Recrutement / Engagement.

- Graphiques : évolution des effectifs (Hommes/Femmes en barres), entrées/sorties mensuelles (courbes), salaire moyen par département (barres horizontales), répartition par tranche d'âge (donut), types de contrats (donut).

- Bloc "Export & Envoi programmé" (Rapport RH complet PDF, Données effectifs Excel, KPI Dashboard PDF).




R — Contrôle d'accès (Admin)

- Gestion des rôles et permissions (RBAC), authentification multi-facteurs (MFA), journal d'audit des accès/actions sensibles, gestion des sessions.




---




INSTRUCTIONS DE GÉNÉRATION




1. Génère un écran à la fois, en haute fidélité (pas de wireframe basse-fidélité), avec des données factices réalistes (noms marocains/français, dates 2026, montants en MAD/EUR/USD).

2. Respecte la cohérence visuelle entre tous les écrans (même sidebar, même header, mêmes composants de badge/carte/tableau).

3. Pour chaque écran, propose une version desktop (1440px) puis, si possible, une version mobile (390px).

4. Indique clairement les zones cliquables/interactives et les états (hover, actif, désactivé) pour les boutons clés.

5. Fournis les maquettes dans l'ordre suivant : Dashboard RH → Dashboard Collaborateur → Congés (Collaborateur puis RH) → Notes de frais → Documents → Planning/Shifts → Messagerie → Recrutement → Tâches → Annuaire → Événements → KPI/Reporting → Contrôle d'accès.




FORMAT DE SORTIE

[À adapter selon l'outil : fichiers / images PNG haute résolution / code HTML-CSS / composants React]              , UTILISER LES COULEURS EXISTE DANS LE LOGO , ESSAYER DE FONCTIONNER TOUS LES PAGES LES BOUTON ...