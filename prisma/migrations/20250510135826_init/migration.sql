-- CreateTable
CREATE TABLE `DomainToken` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(191) NOT NULL,
    `domain` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `lastIp` VARCHAR(191) NULL,
    `lastUpdated` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DomainToken_token_key`(`token`),
    UNIQUE INDEX `DomainToken_domain_key`(`domain`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
