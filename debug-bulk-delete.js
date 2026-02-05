// DEBUG: Test bulk delete functionality
// Open browser console and paste this code to test

console.log('=== TESTING BULK DELETE ===');

// Test 1: Check if companies exist
console.log('Companies in data:', window.NexoGenix.data.companies);
console.log('Contacts in data:', window.NexoGenix.data.contacts);

// Test 2: Check if store methods exist
console.log('Store methods available:');
console.log('- deleteCompany:', typeof window.NexoGenix.store.deleteCompany);
console.log('- updateContact:', typeof window.NexoGenix.store.updateContact);
console.log('- loadAll:', typeof window.NexoGenix.store.loadAll);

// Test 3: Check if checkboxes are being found
const checkboxes = document.querySelectorAll('.company-checkbox');
console.log('Company checkboxes found:', checkboxes.length);

// Test 4: Check checked checkboxes
const checkedBoxes = document.querySelectorAll('.company-checkbox:checked');
console.log('Checked company checkboxes:', checkedBoxes.length);

// Test 5: Get IDs from checkboxes
if (checkedBoxes.length > 0) {
    const ids = Array.from(checkedBoxes).map(cb => {
        const id = parseInt(cb.dataset.companyId);
        const row = cb.closest('tr');
        const name = row ? row.dataset.name : 'unknown';
        return { id, name, isVirtual: id < 0 };
    });
    console.log('Selected companies:', ids);
}

// Test 6: Manual delete test
async function testDelete() {
    const checkedBoxes = document.querySelectorAll('.company-checkbox:checked');
    if (checkedBoxes.length === 0) {
        console.log('❌ No checkboxes selected. Please select some companies first.');
        return;
    }

    console.log('Starting manual delete test...');

    for (const cb of checkedBoxes) {
        const id = parseInt(cb.dataset.companyId);
        const row = cb.closest('tr');
        const companyName = row.dataset.name;

        console.log(`Processing: ${companyName} (ID: ${id})`);

        if (id > 0) {
            console.log('  → Deleting real company record');
            await window.NexoGenix.store.deleteCompany(id);
            console.log('  ✓ Deleted');
        } else {
            console.log('  → Clearing virtual company from contacts');
            const contactsToUpdate = window.NexoGenix.data.contacts.filter(c => c.company === companyName);
            console.log(`  → Found ${contactsToUpdate.length} contacts to update`);

            for (const contact of contactsToUpdate) {
                contact.company = '';
                await window.NexoGenix.store.updateContact(contact.id, contact);
                console.log(`  ✓ Updated contact ${contact.id}`);
            }
        }
    }

    console.log('✓ Delete test complete');
    console.log('Companies after delete:', window.NexoGenix.data.companies);
    console.log('Refreshing view...');

    // Refresh the view
    const view = window.NexoGenix.activeCompaniesView;
    if (view) {
        view.companies = window.NexoGenix.data.companies;
        view.contacts = window.NexoGenix.data.contacts;
        document.getElementById('router-view').innerHTML = await view.render();
        console.log('✓ View refreshed');
    }
}

console.log('\n=== TO TEST BULK DELETE ===');
console.log('1. Select some companies by checking their checkboxes');
console.log('2. Run: testDelete()');
console.log('3. Check if companies are deleted');
