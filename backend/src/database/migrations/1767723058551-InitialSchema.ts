import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1767723058551 implements MigrationInterface {
    name = 'InitialSchema1767723058551'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "idempotency_keys" ("key" character varying NOT NULL, "response" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0afd83cbf08c9d12089a9bffc5e" PRIMARY KEY ("key"))`);
        await queryRunner.query(`CREATE TABLE "accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "balance" numeric(20,2) NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_2db43cdbf7bb862e577b5f540c8" UNIQUE ("name"), CONSTRAINT "PK_5a7a02c20412299d198e097a8fe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "description" character varying NOT NULL, "reference" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."entries_type_enum" AS ENUM('DEBIT', 'CREDIT')`);
        await queryRunner.query(`CREATE TABLE "entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "amount" numeric(20,2) NOT NULL, "type" "public"."entries_type_enum" NOT NULL, "account_id" uuid NOT NULL, "transaction_id" uuid NOT NULL, CONSTRAINT "PK_23d4e7e9b58d9939f113832915b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "entries" ADD CONSTRAINT "FK_a401df6850c3d68be2791b44111" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "entries" ADD CONSTRAINT "FK_f20cef059db69230f86e863b80a" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "entries" DROP CONSTRAINT "FK_f20cef059db69230f86e863b80a"`);
        await queryRunner.query(`ALTER TABLE "entries" DROP CONSTRAINT "FK_a401df6850c3d68be2791b44111"`);
        await queryRunner.query(`DROP TABLE "entries"`);
        await queryRunner.query(`DROP TYPE "public"."entries_type_enum"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
        await queryRunner.query(`DROP TABLE "accounts"`);
        await queryRunner.query(`DROP TABLE "idempotency_keys"`);
    }

}
