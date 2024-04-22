CREATE TABLE `players` (
	`playerId` INT(11) NOT NULL AUTO_INCREMENT,
	`username` VARCHAR(32) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`password` TEXT NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`registeredTimestamp` INT(11) NULL DEFAULT NULL,
	`lastSeen` INT(2) NOT NULL DEFAULT '0',
	`disconnectReason` INT(2) NOT NULL DEFAULT '0',
	PRIMARY KEY (`playerId`) USING BTREE,
	INDEX `playerName_INDEX` (`username`) USING BTREE
)
COLLATE='utf8mb4_unicode_ci'
ENGINE=InnoDB;
