import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1711900000000 implements MigrationInterface {
  name = 'InitSchema1711900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"        UUID NOT NULL DEFAULT gen_random_uuid(),
        "email"     VARCHAR NOT NULL,
        "name"      VARCHAR NOT NULL,
        "password"  VARCHAR,
        "googleId"  VARCHAR,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tags" (
        "id"        UUID NOT NULL DEFAULT gen_random_uuid(),
        "name"      VARCHAR NOT NULL,
        "slug"      VARCHAR NOT NULL,
        "userId"    UUID NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tags" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tags_slug_userId" UNIQUE ("slug", "userId"),
        CONSTRAINT "FK_tags_userId" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "links" (
        "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
        "url"         VARCHAR NOT NULL,
        "title"       VARCHAR,
        "description" VARCHAR,
        "userId"      UUID NOT NULL,
        "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
        "archivedAt"  TIMESTAMP,
        CONSTRAINT "PK_links" PRIMARY KEY ("id"),
        CONSTRAINT "FK_links_userId" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "link_tags" (
        "linkId" UUID NOT NULL,
        "tagId"  UUID NOT NULL,
        CONSTRAINT "PK_link_tags" PRIMARY KEY ("linkId", "tagId"),
        CONSTRAINT "FK_link_tags_linkId" FOREIGN KEY ("linkId")
          REFERENCES "links"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_link_tags_tagId" FOREIGN KEY ("tagId")
          REFERENCES "tags"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "link_tags"`);
    await queryRunner.query(`DROP TABLE "links"`);
    await queryRunner.query(`DROP TABLE "tags"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
