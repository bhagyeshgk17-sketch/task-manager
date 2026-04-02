import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Baseline migration. The schema was previously managed by TypeORM synchronize:true.
 * This empty migration establishes the migration history baseline. All tables
 * (users, tasks, labels and their join tables) already exist in the database.
 * Future schema changes should be added as new migrations.
 */
export class InitialSchema1774778750490 implements MigrationInterface {

    public async up(_queryRunner: QueryRunner): Promise<void> {
        // Schema already exists — baseline only.
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {
        // No-op for baseline migration.
    }

}
