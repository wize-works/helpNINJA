import fs from 'node:fs';
import path from 'node:path';

const sqlDir = path.resolve(process.cwd(), 'src', 'sql');

function isSqlFile(name) {
    return name.toLowerCase().endsWith('.sql');
}

(async () => {
    try {
        const files = await fs.promises.readdir(sqlDir);
        const sqlFiles = files
            .filter(isSqlFile)
            .filter(f => f.toLowerCase() !== 'schema.sql')
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

        if (sqlFiles.length === 0) {
            console.log('No SQL files found to pack.');
            process.exit(0);
        }

        let output = '';
        output += '-- Auto-generated consolidated schema file\n';
        output += '-- Source: src/sql/*.sql (ordered)\n';
        output += `-- Generated at: ${new Date().toISOString()}\n\n`;

        for (const file of sqlFiles) {
            const p = path.join(sqlDir, file);
            const content = await fs.promises.readFile(p, 'utf8');
            output += `\n\n-- ==============================\n`;
            output += `-- BEGIN ${file}\n`;
            output += `-- ==============================\n`;
            output += content.trim() + '\n';
            output += `-- ==============================\n`;
            output += `-- END ${file}\n`;
            output += `-- ==============================\n`;
        }

        const outPath = path.join(sqlDir, 'schema.sql');
        await fs.promises.writeFile(outPath, output, 'utf8');

        console.log(`✅ Wrote consolidated schema to: ${outPath}`);
        console.log('✅ Files packed (in order):');
        sqlFiles.forEach(f => console.log(' -', f));

        // Delete originals after writing schema
        for (const file of sqlFiles) {
            await fs.promises.unlink(path.join(sqlDir, file));
        }
        console.log('🧹 Deleted individual SQL files after packing.');

    } catch (err) {
        console.error('Failed to pack SQL files:', err);
        process.exit(1);
    }
})();
