-- Dump of empty SBS database, alembic revision e3c5852cb374 (head)

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `alembic_version`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alembic_version` (
  `version_num` varchar(32) NOT NULL,
  PRIMARY KEY (`version_num`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `alembic_version` WRITE;
/*!40000 ALTER TABLE `alembic_version` DISABLE KEYS */;
INSERT INTO `alembic_version` VALUES ('e3c5852cb374');
/*!40000 ALTER TABLE `alembic_version` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `api_key_units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `api_key_units` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `api_key_id` int(11) NOT NULL,
  `unit_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `api_key_id` (`api_key_id`),
  KEY `unit_id` (`unit_id`),
  CONSTRAINT `api_key_units_ibfk_1` FOREIGN KEY (`api_key_id`) REFERENCES `api_keys` (`id`) ON DELETE CASCADE,
  CONSTRAINT `api_key_units_ibfk_2` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `api_key_units` WRITE;
/*!40000 ALTER TABLE `api_key_units` DISABLE KEYS */;
/*!40000 ALTER TABLE `api_key_units` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `api_keys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `api_keys` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `hashed_secret` varchar(255) NOT NULL,
  `organisation_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` varchar(255) NOT NULL,
  `updated_by` varchar(255) NOT NULL,
  `description` text NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_unique_hashed_secret` (`hashed_secret`),
  KEY `organisation_id` (`organisation_id`),
  CONSTRAINT `api_keys_ibfk_1` FOREIGN KEY (`organisation_id`) REFERENCES `organisations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `api_keys` WRITE;
/*!40000 ALTER TABLE `api_keys` DISABLE KEYS */;
/*!40000 ALTER TABLE `api_keys` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `subject_id` int(11) DEFAULT NULL,
  `target_type` varchar(255) DEFAULT NULL,
  `target_id` int(11) DEFAULT NULL,
  `action` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `state_before` text,
  `state_after` text,
  `parent_name` varchar(100) DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `target_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `aups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `aups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `au_version` varchar(255) NOT NULL,
  `user_id` int(11) NOT NULL,
  `agreed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `aups_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `aups` WRITE;
/*!40000 ALTER TABLE `aups` DISABLE KEYS */;
/*!40000 ALTER TABLE `aups` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `automatic_connection_allowed_organisations_services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `automatic_connection_allowed_organisations_services` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `service_id` int(11) NOT NULL,
  `organisation_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `service_id` (`service_id`),
  KEY `organisation_id` (`organisation_id`),
  CONSTRAINT `automatic_connection_allowed_organisations_services_ibfk_1` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE,
  CONSTRAINT `automatic_connection_allowed_organisations_services_ibfk_2` FOREIGN KEY (`organisation_id`) REFERENCES `organisations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `automatic_connection_allowed_organisations_services` WRITE;
/*!40000 ALTER TABLE `automatic_connection_allowed_organisations_services` DISABLE KEYS */;
/*!40000 ALTER TABLE `automatic_connection_allowed_organisations_services` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `collaboration_memberships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collaboration_memberships` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `collaboration_id` int(11) NOT NULL,
  `role` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` varchar(255) NOT NULL,
  `updated_by` varchar(255) NOT NULL,
  `invitation_id` int(11) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `expiry_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_members` (`user_id`,`collaboration_id`),
  KEY `collaboration_id` (`collaboration_id`),
  KEY `col_membership_invitation` (`invitation_id`),
  CONSTRAINT `col_membership_invitation` FOREIGN KEY (`invitation_id`) REFERENCES `invitations` (`id`),
  CONSTRAINT `collaboration_memberships_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `collaboration_memberships_ibfk_2` FOREIGN KEY (`collaboration_id`) REFERENCES `collaborations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `collaboration_memberships_ibfk_3` FOREIGN KEY (`invitation_id`) REFERENCES `invitations` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `collaboration_memberships` WRITE;
/*!40000 ALTER TABLE `collaboration_memberships` DISABLE KEYS */;
/*!40000 ALTER TABLE `collaboration_memberships` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `collaboration_memberships_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collaboration_memberships_groups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `collaboration_membership_id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `collaboration_membership_id` (`collaboration_membership_id`),
  KEY `group_id` (`group_id`),
  CONSTRAINT `collaboration_memberships_groups_ibfk_1` FOREIGN KEY (`collaboration_membership_id`) REFERENCES `collaboration_memberships` (`id`) ON DELETE CASCADE,
  CONSTRAINT `collaboration_memberships_groups_ibfk_2` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `collaboration_memberships_groups` WRITE;
/*!40000 ALTER TABLE `collaboration_memberships_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `collaboration_memberships_groups` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`sbs`@`localhost`*/ /*!50003 TRIGGER collaboration_memberships_groups_collaboration_id        BEFORE INSERT ON collaboration_memberships_groups FOR EACH ROW        BEGIN            IF (SELECT cm.collaboration_id FROM collaboration_memberships cm WHERE cm.id = NEW.collaboration_membership_id)             <>            (SELECT g.collaboration_id FROM `groups` g WHERE g.id = NEW.group_id)            THEN                SIGNAL SQLSTATE '45000'                SET MESSAGE_TEXT = 'The collaboration ID must be equal for collaboration_memberships_groups';            END IF ;        END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
DROP TABLE IF EXISTS `collaboration_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collaboration_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `short_name` varchar(255) NOT NULL,
  `description` text,
  `message` text,
  `accepted_user_policy` varchar(255) DEFAULT NULL,
  `organisation_id` int(11) NOT NULL,
  `requester_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` varchar(255) NOT NULL,
  `updated_by` varchar(255) NOT NULL,
  `website_url` varchar(512) DEFAULT NULL,
  `logo` mediumtext,
  `status` varchar(255) NOT NULL,
  `rejection_reason` text,
  `uuid4` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `collaboration_requests_uuid4` (`uuid4`),
  KEY `organisation_id` (`organisation_id`),
  KEY `requester_id` (`requester_id`),
  CONSTRAINT `collaboration_requests_ibfk_1` FOREIGN KEY (`organisation_id`) REFERENCES `organisations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `collaboration_requests_ibfk_2` FOREIGN KEY (`requester_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `collaboration_requests` WRITE;
/*!40000 ALTER TABLE `collaboration_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `collaboration_requests` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `collaboration_requests_units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collaboration_requests_units` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `collaboration_request_id` int(11) NOT NULL,
  `unit_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `collaboration_request_id` (`collaboration_request_id`),
  KEY `unit_id` (`unit_id`),
  CONSTRAINT `collaboration_requests_units_ibfk_1` FOREIGN KEY (`collaboration_request_id`) REFERENCES `collaboration_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `collaboration_requests_units_ibfk_2` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `collaboration_requests_units` WRITE;
/*!40000 ALTER TABLE `collaboration_requests_units` DISABLE KEYS */;
/*!40000 ALTER TABLE `collaboration_requests_units` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `collaboration_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collaboration_tags` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `collaboration_id` int(11) NOT NULL,
  `tag_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `collaboration_tags_unique` (`collaboration_id`,`tag_id`),
  KEY `tag_id` (`tag_id`),
  CONSTRAINT `collaboration_tags_ibfk_1` FOREIGN KEY (`collaboration_id`) REFERENCES `collaborations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `collaboration_tags_ibfk_2` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `collaboration_tags` WRITE;
/*!40000 ALTER TABLE `collaboration_tags` DISABLE KEYS */;
/*!40000 ALTER TABLE `collaboration_tags` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`sbs`@`%`*/ /*!50003 TRIGGER collaboration_organisation_id_tags        BEFORE INSERT ON collaboration_tags FOR EACH ROW        BEGIN            IF (SELECT c.organisation_id FROM collaborations c WHERE c.id = NEW.collaboration_id)             <>            (SELECT t.organisation_id FROM `tags` t WHERE t.id = NEW.tag_id)            THEN                SIGNAL SQLSTATE '45000'                SET MESSAGE_TEXT = 'The collaboration must be part of the organisation';            END IF ;        END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`sbs`@`%`*/ /*!50003 TRIGGER collaboration_organisation_id_tags_before_update        BEFORE UPDATE ON collaboration_tags FOR EACH ROW        BEGIN            IF (SELECT c.organisation_id FROM collaborations c WHERE c.id = NEW.collaboration_id)             <>            (SELECT t.organisation_id FROM `tags` t WHERE t.id = NEW.tag_id)            THEN                SIGNAL SQLSTATE '45000'                SET MESSAGE_TEXT = 'The collaboration must be part of the organisation';            END IF ;        END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
DROP TABLE IF EXISTS `collaboration_units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collaboration_units` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `collaboration_id` int(11) NOT NULL,
  `unit_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `collaboration_id` (`collaboration_id`),
  KEY `unit_id` (`unit_id`),
  CONSTRAINT `collaboration_units_ibfk_1` FOREIGN KEY (`collaboration_id`) REFERENCES `collaborations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `collaboration_units_ibfk_2` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `collaboration_units` WRITE;
/*!40000 ALTER TABLE `collaboration_units` DISABLE KEYS */;
/*!40000 ALTER TABLE `collaboration_units` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `collaborations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collaborations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `identifier` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `accepted_user_policy` mediumtext,
  `organisation_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` varchar(255) NOT NULL,
  `updated_by` varchar(255) NOT NULL,
  `short_name` varchar(255) NOT NULL,
  `global_urn` text NOT NULL,
  `disable_join_requests` tinyint(1) DEFAULT '0',
  `disclose_member_information` tinyint(1) DEFAULT '0',
  `disclose_email_information` tinyint(1) DEFAULT '0',
  `logo` mediumtext,
  `website_url` varchar(512) DEFAULT NULL,
  `uuid4` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `last_activity_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `expiry_date` datetime DEFAULT NULL,
  `support_email` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `collaborations_unique_name` (`name`,`organisation_id`),
  UNIQUE KEY `collaborations_unique_short_name` (`short_name`,`organisation_id`),
  UNIQUE KEY `collaborations_uuid4` (`uuid4`),
  UNIQUE KEY `collaborations_unique_identifier` (`identifier`),
  KEY `organisation_id` (`organisation_id`),
  FULLTEXT KEY `ft_collaborations_search` (`name`,`description`),
  CONSTRAINT `collaborations_ibfk_1` FOREIGN KEY (`organisation_id`) REFERENCES `organisations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `collaborations` WRITE;
/*!40000 ALTER TABLE `collaborations` DISABLE KEYS */;
/*!40000 ALTER TABLE `collaborations` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `groups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `short_name` varchar(255) NOT NULL,
  `global_urn` text NOT NULL,
  `description` text,
  `auto_provision_members` tinyint(1) DEFAULT NULL,
  `collaboration_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` varchar(255) NOT NULL,
  `updated_by` varchar(255) NOT NULL,
  `identifier` varchar(255) NOT NULL,
  `service_group_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `group_short_name` (`short_name`,`collaboration_id`),
  UNIQUE KEY `groups_unique_identifier` (`identifier`),
  UNIQUE KEY `groups_unique_name_service` (`name`,`collaboration_id`,`service_group_id`),
  KEY `collaboration_id` (`collaboration_id`),
  KEY `groups_ibfk_2` (`service_group_id`),
  CONSTRAINT `groups_ibfk_1` FOREIGN KEY (`collaboration_id`) REFERENCES `collaborations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `groups_ibfk_2` FOREIGN KEY (`service_group_id`) REFERENCES `service_groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `groups` WRITE;
/*!40000 ALTER TABLE `groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `groups` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `groups_invitations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `groups_invitations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `invitation_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `group_id` (`group_id`),
  KEY `invitation_id` (`invitation_id`),
  CONSTRAINT `groups_invitations_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `groups_invitations_ibfk_2` FOREIGN KEY (`invitation_id`) REFERENCES `invitations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `groups_invitations` WRITE;
/*!40000 ALTER TABLE `groups_invitations` DISABLE KEYS */;
/*!40000 ALTER TABLE `groups_invitations` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `invitations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invitations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `hash` varchar(255) NOT NULL,
  `message` text,
  `invitee_email` varchar(255) NOT NULL,
  `collaboration_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `intended_role` varchar(255) NOT NULL,
  `expiry_date` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(255) NOT NULL,
  `membership_expiry_date` datetime DEFAULT NULL,
  `external_identifier` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL,
  `reminder_send` tinyint(1) DEFAULT '0',
  `sender_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `collaboration_id` (`collaboration_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `invitations_ibfk_1` FOREIGN KEY (`collaboration_id`) REFERENCES `collaborations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `invitations_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `invitations` WRITE;
/*!40000 ALTER TABLE `invitations` DISABLE KEYS */;
/*!40000 ALTER TABLE `invitations` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `ip_networks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ip_networks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `network_value` text NOT NULL,
  `service_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` varchar(255) NOT NULL,
  `updated_by` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `service_id` (`service_id`),
  CONSTRAINT `ip_networks_ibfk_1` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `ip_networks` WRITE;
/*!40000 ALTER TABLE `ip_networks` DISABLE KEYS */;
/*!40000 ALTER TABLE `ip_networks` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `join_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `join_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `reference` text,
  `message` text,
  `user_id` int(11) NOT NULL,
  `collaboration_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `hash` varchar(512) DEFAULT NULL,
  `status` varchar(255) NOT NULL,
  `rejection_reason` text,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `collaboration_id` (`collaboration_id`),
  CONSTRAINT `join_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `join_requests_ibfk_2` FOREIGN KEY (`collaboration_id`) REFERENCES `collaborations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `join_requests` WRITE;
/*!40000 ALTER TABLE `join_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `join_requests` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `organisation_aups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organisation_aups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `aup_url` varchar(255) NOT NULL,
  `user_id` int(11) NOT NULL,
  `organisation_id` int(11) NOT NULL,
  `agreed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `organisation_id` (`organisation_id`),
  CONSTRAINT `organisation_aups_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `organisation_aups_ibfk_2` FOREIGN KEY (`organisation_id`) REFERENCES `organisations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `organisation_aups` WRITE;
/*!40000 ALTER TABLE `organisation_aups` DISABLE KEYS */;
/*!40000 ALTER TABLE `organisation_aups` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `organisation_invitations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organisation_invitations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `hash` varchar(255) NOT NULL,
  `message` text,
  `invitee_email` varchar(255) NOT NULL,
  `organisation_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `expiry_date` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(255) NOT NULL,
  `intended_role` varchar(255) NOT NULL,
  `reminder_send` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `organisation_id` (`organisation_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `organisation_invitations_ibfk_1` FOREIGN KEY (`organisation_id`) REFERENCES `organisations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `organisation_invitations_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `organisation_invitations` WRITE;
/*!40000 ALTER TABLE `organisation_invitations` DISABLE KEYS */;
/*!40000 ALTER TABLE `organisation_invitations` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `organisation_membership_units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organisation_membership_units` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organisation_membership_id` int(11) NOT NULL,
  `unit_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `organisation_membership_id` (`organisation_membership_id`),
  KEY `unit_id` (`unit_id`),
  CONSTRAINT `organisation_membership_units_ibfk_1` FOREIGN KEY (`organisation_membership_id`) REFERENCES `organisation_memberships` (`id`) ON DELETE CASCADE,
  CONSTRAINT `organisation_membership_units_ibfk_2` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `organisation_membership_units` WRITE;
/*!40000 ALTER TABLE `organisation_membership_units` DISABLE KEYS */;
/*!40000 ALTER TABLE `organisation_membership_units` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `organisation_memberships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organisation_memberships` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `organisation_id` int(11) NOT NULL,
  `role` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` varchar(255) NOT NULL,
  `updated_by` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_members` (`user_id`,`organisation_id`),
  KEY `organisation_id` (`organisation_id`),
  CONSTRAINT `organisation_memberships_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `organisation_memberships_ibfk_2` FOREIGN KEY (`organisation_id`) REFERENCES `organisations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `organisation_memberships` WRITE;
/*!40000 ALTER TABLE `organisation_memberships` DISABLE KEYS */;
/*!40000 ALTER TABLE `organisation_memberships` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `organisations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organisations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` varchar(255) NOT NULL,
  `updated_by` varchar(255) NOT NULL,
  `short_name` varchar(255) NOT NULL,
  `collaboration_creation_allowed` tinyint(1) DEFAULT '0',
  `identifier` varchar(255) NOT NULL,
  `logo` mediumtext,
  `category` varchar(255) DEFAULT NULL,
  `on_boarding_msg` mediumtext,
  `services_restricted` tinyint(1) DEFAULT '0',
  `uuid4` varchar(255) NOT NULL,
  `service_connection_requires_approval` tinyint(1) DEFAULT '0',
  `accepted_user_policy` varchar(255) DEFAULT NULL,
  `crm_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `organisations_unique_name` (`name`),
  UNIQUE KEY `organisations_uuid4` (`uuid4`),
  UNIQUE KEY `organisations_unique_short_name` (`short_name`),
  FULLTEXT KEY `ft_organisations_search` (`name`,`description`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `organisations` WRITE;
/*!40000 ALTER TABLE `organisations` DISABLE KEYS */;
/*!40000 ALTER TABLE `organisations` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `organisations_services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organisations_services` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organisation_id` int(11) NOT NULL,
  `service_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `organisation_id` (`organisation_id`),
  KEY `service_id` (`service_id`),
  CONSTRAINT `organisations_services_ibfk_1` FOREIGN KEY (`organisation_id`) REFERENCES `organisations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `organisations_services_ibfk_2` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `organisations_services` WRITE;
/*!40000 ALTER TABLE `organisations_services` DISABLE KEYS */;
/*!40000 ALTER TABLE `organisations_services` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `pam_sso_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pam_sso_sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `session_id` varchar(255) NOT NULL,
  `attribute` varchar(255) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `service_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `pin` char(4) DEFAULT NULL,
  `pin_shown` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `service_id` (`service_id`),
  CONSTRAINT `pam_sso_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pam_sso_sessions_ibfk_2` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `pam_sso_sessions` WRITE;
/*!40000 ALTER TABLE `pam_sso_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `pam_sso_sessions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `schac_home_organisations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schac_home_organisations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `organisation_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` varchar(255) NOT NULL,
  `updated_by` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `schac_home_organisation_name_unique` (`name`),
  KEY `organisation_id` (`organisation_id`),
  CONSTRAINT `schac_home_organisations_ibfk_1` FOREIGN KEY (`organisation_id`) REFERENCES `organisations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `schac_home_organisations` WRITE;
/*!40000 ALTER TABLE `schac_home_organisations` DISABLE KEYS */;
/*!40000 ALTER TABLE `schac_home_organisations` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `service_aups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_aups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `aup_url` varchar(255) NOT NULL,
  `user_id` int(11) NOT NULL,
  `service_id` int(11) NOT NULL,
  `agreed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `service_id` (`service_id`),
  CONSTRAINT `service_aups_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `service_aups_ibfk_2` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `service_aups` WRITE;
/*!40000 ALTER TABLE `service_aups` DISABLE KEYS */;
/*!40000 ALTER TABLE `service_aups` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `service_connection_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_connection_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `message` text,
  `requester_id` int(11) NOT NULL,
  `service_id` int(11) NOT NULL,
  `collaboration_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` varchar(255) NOT NULL,
  `updated_by` varchar(255) NOT NULL,
  `hash` varchar(512) DEFAULT NULL,
  `pending_organisation_approval` tinyint(1) DEFAULT '0',
  `status` varchar(255) NOT NULL,
  `rejection_reason` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `service_connection_requests_unique_hash` (`hash`),
  KEY `requester_id` (`requester_id`),
  KEY `service_id` (`service_id`),
  KEY `collaboration_id` (`collaboration_id`),
  CONSTRAINT `service_connection_requests_ibfk_1` FOREIGN KEY (`requester_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `service_connection_requests_ibfk_2` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE,
  CONSTRAINT `service_connection_requests_ibfk_3` FOREIGN KEY (`collaboration_id`) REFERENCES `collaborations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `service_connection_requests` WRITE;
/*!40000 ALTER TABLE `service_connection_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `service_connection_requests` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `service_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_groups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `short_name` varchar(255) NOT NULL,
  `description` text,
  `auto_provision_members` tinyint(1) DEFAULT NULL,
  `service_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` varchar(255) NOT NULL,
  `updated_by` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `service_groups_unique_name` (`name`,`service_id`),
  UNIQUE KEY `service_groups_unique_short_name` (`short_name`,`service_id`),
  KEY `service_id` (`service_id`),
  CONSTRAINT `service_groups_ibfk_1` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `service_groups` WRITE;
/*!40000 ALTER TABLE `service_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `service_groups` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `service_invitations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_invitations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `hash` varchar(255) NOT NULL,
  `message` text,
  `invitee_email` varchar(255) NOT NULL,
  `intended_role` varchar(255) NOT NULL,
  `service_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `expiry_date` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(255) NOT NULL,
  `reminder_send` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `service_id` (`service_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `service_invitations_ibfk_1` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE,
  CONSTRAINT `service_invitations_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `service_invitations` WRITE;
/*!40000 ALTER TABLE `service_invitations` DISABLE KEYS */;
/*!40000 ALTER TABLE `service_invitations` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `service_memberships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_memberships` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `service_id` int(11) NOT NULL,
  `role` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` varchar(255) NOT NULL,
  `updated_by` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_members` (`user_id`,`service_id`),
  KEY `service_id` (`service_id`),
  CONSTRAINT `service_memberships_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `service_memberships_ibfk_2` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `service_memberships` WRITE;
/*!40000 ALTER TABLE `service_memberships` DISABLE KEYS */;
/*!40000 ALTER TABLE `service_memberships` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `service_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `abbreviation` varchar(255) NOT NULL,
  `description` text,
  `logo` mediumtext,
  `providing_organisation` varchar(255) NOT NULL,
  `uri` varchar(255) DEFAULT NULL,
  `uri_info` varchar(255) DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `support_email` varchar(255) DEFAULT NULL,
  `security_email` varchar(255) DEFAULT NULL,
  `privacy_policy` varchar(255) DEFAULT NULL,
  `accepted_user_policy` varchar(255) DEFAULT NULL,
  `connection_type` varchar(255) DEFAULT NULL,
  `redirect_urls` text,
  `saml_metadata` text,
  `saml_metadata_url` varchar(255) DEFAULT NULL,
  `comments` text,
  `requester_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(255) DEFAULT NULL,
  `uuid4` varchar(255) NOT NULL,
  `rejection_reason` text,
  `grants` text,
  `is_public_client` tinyint(1) DEFAULT '0',
  `oidc_client_secret` varchar(255) DEFAULT NULL,
  `entity_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `service_requests_uuid4` (`uuid4`),
  KEY `requester_id` (`requester_id`),
  CONSTRAINT `service_requests_ibfk_1` FOREIGN KEY (`requester_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `service_requests` WRITE;
/*!40000 ALTER TABLE `service_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `service_requests` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `service_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `hashed_token` varchar(512) NOT NULL,
  `description` text NOT NULL,
  `service_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` varchar(255) NOT NULL,
  `updated_by` varchar(255) NOT NULL,
  `token_type` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `service_id` (`service_id`),
  CONSTRAINT `service_tokens_ibfk_1` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `service_tokens` WRITE;
/*!40000 ALTER TABLE `service_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `service_tokens` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `services` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `entity_id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `uri` varchar(255) DEFAULT NULL,
  `accepted_user_policy` varchar(255) DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` varchar(255) NOT NULL,
  `updated_by` varchar(255) NOT NULL,
  `automatic_connection_allowed` tinyint(1) DEFAULT '1',
  `allow_restricted_orgs` tinyint(1) DEFAULT NULL,
  `logo` mediumtext,
  `access_allowed_for_all` tinyint(1) DEFAULT '0',
  `uuid4` varchar(255) NOT NULL,
  `non_member_users_access_allowed` tinyint(1) DEFAULT '0',
  `abbreviation` varchar(255) NOT NULL,
  `privacy_policy` varchar(255) DEFAULT NULL,
  `ldap_password` varchar(255) DEFAULT NULL,
  `support_email` varchar(255) DEFAULT NULL,
  `security_email` varchar(255) DEFAULT NULL,
  `token_enabled` tinyint(1) DEFAULT '0',
  `token_validity_days` int(11) DEFAULT '1',
  `pam_web_sso_enabled` tinyint(1) DEFAULT '0',
  `uri_info` varchar(255) DEFAULT NULL,
  `scim_enabled` tinyint(1) DEFAULT '0',
  `scim_url` varchar(255) DEFAULT NULL,
  `scim_bearer_token` mediumtext,
  `sweep_scim_enabled` tinyint(1) DEFAULT '0',
  `sweep_scim_daily_rate` int(11) DEFAULT '1',
  `sweep_scim_last_run` datetime DEFAULT NULL,
  `sweep_remove_orphans` tinyint(1) DEFAULT '0',
  `scim_client_enabled` tinyint(1) DEFAULT '0',
  `ldap_enabled` tinyint(1) DEFAULT '1',
  `connection_setting` varchar(255) DEFAULT NULL,
  `override_access_allowed_all_connections` tinyint(1) DEFAULT '0',
  `ldap_identifier` varchar(255) NOT NULL,
  `redirect_urls` text,
  `saml_metadata` text,
  `saml_metadata_url` varchar(255) DEFAULT NULL,
  `oidc_client_secret` varchar(255) DEFAULT NULL,
  `providing_organisation` varchar(255) DEFAULT NULL,
  `grants` text,
  `is_public_client` tinyint(1) DEFAULT '0',
  `saml_enabled` tinyint(1) DEFAULT '0',
  `oidc_enabled` tinyint(1) DEFAULT '0',
  `export_successful` tinyint(1) DEFAULT '0',
  `exported_at` datetime DEFAULT NULL,
  `export_external_identifier` varchar(255) DEFAULT NULL,
  `export_external_version` int(11) DEFAULT NULL,
  `crm_organisation_id` int(11) DEFAULT NULL,
  `support_email_unauthorized_users` tinyint(1) DEFAULT '0',
  `access_allowed_for_crm_organisation` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `services_unique_entity_id` (`entity_id`),
  UNIQUE KEY `services_uuid4` (`uuid4`),
  UNIQUE KEY `services_unique_abbreviation` (`abbreviation`),
  KEY `services_ibfk_1` (`crm_organisation_id`),
  FULLTEXT KEY `ft_services_search` (`name`,`entity_id`,`description`),
  CONSTRAINT `services_ibfk_1` FOREIGN KEY (`crm_organisation_id`) REFERENCES `organisations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `services` WRITE;
/*!40000 ALTER TABLE `services` DISABLE KEYS */;
/*!40000 ALTER TABLE `services` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `services_collaborations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `services_collaborations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `service_id` int(11) NOT NULL,
  `collaboration_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `services_collaborations_unique` (`collaboration_id`,`service_id`),
  KEY `service_id` (`service_id`),
  KEY `collaboration_id` (`collaboration_id`),
  CONSTRAINT `services_collaborations_ibfk_1` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE,
  CONSTRAINT `services_collaborations_ibfk_2` FOREIGN KEY (`collaboration_id`) REFERENCES `collaborations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `services_collaborations` WRITE;
/*!40000 ALTER TABLE `services_collaborations` DISABLE KEYS */;
/*!40000 ALTER TABLE `services_collaborations` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `services_organisations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `services_organisations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `service_id` int(11) NOT NULL,
  `organisation_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `service_id` (`service_id`),
  KEY `organisation_id` (`organisation_id`),
  CONSTRAINT `services_organisations_ibfk_1` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE,
  CONSTRAINT `services_organisations_ibfk_2` FOREIGN KEY (`organisation_id`) REFERENCES `organisations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `services_organisations` WRITE;
/*!40000 ALTER TABLE `services_organisations` DISABLE KEYS */;
/*!40000 ALTER TABLE `services_organisations` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `ssh_keys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ssh_keys` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ssh_value` text NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `ssh_keys_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `ssh_keys` WRITE;
/*!40000 ALTER TABLE `ssh_keys` DISABLE KEYS */;
/*!40000 ALTER TABLE `ssh_keys` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `suspend_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suspend_notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `sent_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_suspension` tinyint(1) DEFAULT '0',
  `is_warning` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `suspend_notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `suspend_notifications` WRITE;
/*!40000 ALTER TABLE `suspend_notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `suspend_notifications` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tags` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tag_value` varchar(255) NOT NULL,
  `organisation_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tag_organisation_unique_tag` (`tag_value`,`organisation_id`),
  KEY `tags_ibfk_1` (`organisation_id`),
  CONSTRAINT `tags_ibfk_1` FOREIGN KEY (`organisation_id`) REFERENCES `organisations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `tags` WRITE;
/*!40000 ALTER TABLE `tags` DISABLE KEYS */;
/*!40000 ALTER TABLE `tags` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `units` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `organisation_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `organisation_units_unique` (`organisation_id`,`name`),
  CONSTRAINT `units_ibfk_1` FOREIGN KEY (`organisation_id`) REFERENCES `organisations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `units` WRITE;
/*!40000 ALTER TABLE `units` DISABLE KEYS */;
/*!40000 ALTER TABLE `units` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `units_organisation_invitations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `units_organisation_invitations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `organisation_invitation_id` int(11) NOT NULL,
  `unit_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `organisation_invitation_id` (`organisation_invitation_id`),
  KEY `unit_id` (`unit_id`),
  CONSTRAINT `units_organisation_invitations_ibfk_1` FOREIGN KEY (`organisation_invitation_id`) REFERENCES `organisation_invitations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `units_organisation_invitations_ibfk_2` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `units_organisation_invitations` WRITE;
/*!40000 ALTER TABLE `units_organisation_invitations` DISABLE KEYS */;
/*!40000 ALTER TABLE `units_organisation_invitations` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `user_logins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_logins` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `login_type` varchar(255) NOT NULL,
  `succeeded` tinyint(1) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `user_uid` varchar(512) DEFAULT NULL,
  `service_id` int(11) DEFAULT NULL,
  `service_entity_id` varchar(512) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `service_id` (`service_id`),
  CONSTRAINT `user_logins_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `user_logins_ibfk_2` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `user_logins` WRITE;
/*!40000 ALTER TABLE `user_logins` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_logins` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `user_mails`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_mails` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `recipient` mediumtext,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_mails_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `user_mails` WRITE;
/*!40000 ALTER TABLE `user_mails` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_mails` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `user_names_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_names_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_names_history_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `user_names_history` WRITE;
/*!40000 ALTER TABLE `user_names_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_names_history` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `user_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `hashed_token` varchar(255) NOT NULL,
  `user_id` int(11) NOT NULL,
  `service_id` int(11) NOT NULL,
  `last_used_date` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `service_id` (`service_id`),
  CONSTRAINT `user_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_tokens_ibfk_2` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `user_tokens` WRITE;
/*!40000 ALTER TABLE `user_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_tokens` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` varchar(255) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `nick_name` varchar(255) DEFAULT NULL,
  `edu_members` text,
  `affiliation` text,
  `schac_home_organisation` varchar(255) DEFAULT NULL,
  `family_name` varchar(255) DEFAULT NULL,
  `given_name` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` varchar(255) NOT NULL,
  `updated_by` varchar(255) NOT NULL,
  `scoped_affiliation` text,
  `entitlement` text,
  `address` varchar(255) DEFAULT NULL,
  `username` varchar(255) DEFAULT NULL,
  `confirmed_super_user` tinyint(1) DEFAULT '0',
  `application_uid` varchar(255) DEFAULT NULL,
  `eduperson_principal_name` varchar(255) DEFAULT NULL,
  `last_login_date` datetime DEFAULT NULL,
  `last_accessed_date` datetime DEFAULT NULL,
  `suspended` tinyint(1) DEFAULT '0',
  `second_factor_auth` varchar(255) DEFAULT NULL,
  `mfa_reset_token` varchar(512) DEFAULT NULL,
  `home_organisation_uid` varchar(512) DEFAULT NULL,
  `pam_last_login_date` datetime DEFAULT NULL,
  `external_id` varchar(255) NOT NULL,
  `rate_limited` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_unique_uid` (`uid`),
  UNIQUE KEY `users_unique_external_id` (`external_id`),
  UNIQUE KEY `users_username` (`username`),
  FULLTEXT KEY `ft_users_search` (`name`,`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

