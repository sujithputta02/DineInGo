/**
 * List Early Access Leads from the JSON file.
 * Run with: npx ts-node scripts/listLeads.ts
 */
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(__dirname, '../early-access-leads.json');

interface Lead {
    email: string;
    userType: 'user' | 'business';
    joinedAt: string;
}

interface Leads {
    foodies: Lead[];
    venues: Lead[];
}

const line = (char = '-', length = 55) => char.repeat(length);

function printTable(title: string, leads: Lead[], emoji: string) {
    console.log(`\n${emoji}  ${title} (${leads.length} total)`);
    console.log(line());
    if (leads.length === 0) {
        console.log('  No signups yet.');
    } else {
        leads.forEach((lead, i) => {
            const date = new Date(lead.joinedAt).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            console.log(`  ${String(i + 1).padStart(2)}. ${lead.email.padEnd(35)} ${date}`);
        });
    }
    console.log(line());
}

function main() {
    if (!fs.existsSync(DATA_FILE)) {
        console.log('\n🦖 No signups yet! The list file doesn\'t exist.');
        console.log('   Once someone signs up, it will appear at:');
        console.log(`   ${DATA_FILE}\n`);
        return;
    }

    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const leads: Leads = JSON.parse(raw);

    console.log('\n' + line('='));
    console.log('  🍽️  DineInGo Early Access Leads');
    console.log(line('='));

    printTable('Foodies (Users)', leads.foodies, '🧑‍🍳');
    printTable('Venues (Businesses)', leads.venues, '🏢');

    console.log(`\n  📊 Total: ${leads.foodies.length + leads.venues.length} signups\n`);
}

main();
