/* eslint-disable no-console */
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const args = process.argv.slice(2);
const command = args[0];
const migrationName = args[1];

const validCommands = ['create', 'deploy', 'reset', 'status', 'resolve'];

async function main() {
    if (!command) {
        console.error(`❌ No command provided. Must be one of: ${validCommands.join(', ')}`);
        process.exit(1);
    }

    if (!validCommands.includes(command)) {
        console.error(`❌ Invalid command: "${command}". Must be one of: ${validCommands.join(', ')}`);
        process.exit(1);
    }

    const commandsWithoutMigrationName = ['deploy', 'reset', 'status'];
    if (!commandsWithoutMigrationName.includes(command) && !migrationName) {
        console.error(`❌ Migration name is required for '${command}' command.`);
        process.exit(1);
    }

    const prisma = new PrismaClient();

    try {
        let execCommand = 'npx prisma migrate';

        switch (command) {
            case 'create':
                execCommand += ` dev --name ${migrationName} --create-only`;
                if (process.env.MIGRATE_MODE === 'development') {
                    execCommand += ' --skip-seed';
                }
                break;
            case 'deploy':
            case 'reset':
            case 'status':
                execCommand += ` ${command}`;
                if (command === 'reset') {
                    execCommand += ' --force';
                }
                break;
            case 'resolve':
                execCommand += ` ${command} --applied ${migrationName}`;
                break;
        }

        // Optional schema path for production
        if (process.env.MIGRATE_MODE === 'production') {
            execCommand += ' --schema=./prisma/schema.prisma';
        }

        console.log(`📦 Running: ${execCommand}`);
        execSync(execCommand, { stdio: 'inherit' });

        if (command === 'deploy' && process.env.MIGRATE_MODE === 'production') {
            await verifyMigrations(prisma);
        }

        console.log('✅ Migration completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

async function verifyMigrations(prisma) {
    try {
        const migrations = await prisma.$queryRaw`
      SELECT "migration_name" 
      FROM "_prisma_migrations" 
      WHERE "rolled_back_at" IS NULL 
      ORDER BY "finished_at" DESC
      LIMIT 1
    `;
        console.log('📋 Latest applied migration:', migrations);
    } catch (error) {
        console.error('❌ Error verifying migrations:', error);
        throw error;
    }
}

main();
