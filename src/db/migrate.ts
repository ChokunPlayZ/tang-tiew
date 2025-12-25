import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export async function migrateToLatest() {
    console.log('🚧 Starting database sync (drizzle-kit push)...')
    try {
        // Run drizzle-kit push to sync schema with database
        // This handles existing tables gracefully and applies only unmatched changes
        const { stdout, stderr } = await execAsync('bunx drizzle-kit push')

        console.log(stdout)
        if (stderr) console.error(stderr)

        console.log('✅ Database sync completed successfully.')
    } catch (error) {
        console.error('❌ Database sync failed:', error)
        // We throw so the server knows startup failed, or we could swallow if we want to be resilient
        // But for schema sync, failure usually means mismatched code/db, so better to warn loud
        throw error
    }
}
