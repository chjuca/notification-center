import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1795562696973 implements MigrationInterface {
  name = 'InitialSchema1795562696973';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "email" character varying(320) NOT NULL, "password_hash" character varying(255) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "title" character varying(200) NOT NULL, "content" text NOT NULL, "channel" character varying(32) NOT NULL, "recipient" character varying(512) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_user_id_created_at" ON "notifications"  ("user_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "notification_deliveries" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "notification_id" uuid NOT NULL, "channel" character varying(32) NOT NULL, "recipient" character varying(512) NOT NULL, "status" character varying(16) NOT NULL, "details" jsonb NOT NULL DEFAULT '{}', "error" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "chk_notification_deliveries_status" CHECK ("status" IN ('sent', 'failed')), CONSTRAINT "PK_81daeff81f237bd384f7cfc4a4c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notification_deliveries_notification_id" ON "notification_deliveries"  ("notification_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_deliveries" ADD CONSTRAINT "FK_435486b970fffc3e33a7450ee97" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification_deliveries" DROP CONSTRAINT "FK_435486b970fffc3e33a7450ee97"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_notification_deliveries_notification_id"`,
    );
    await queryRunner.query(`DROP TABLE "notification_deliveries"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_notifications_user_id_created_at"`,
    );
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
