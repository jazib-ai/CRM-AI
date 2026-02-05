let currentStep = 1;
const totalSteps = 4;
let databasePath = '';
let setupData = {};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Get default database path
    databasePath = await window.electronAPI.setup.getDefaultPath();
    document.getElementById('dbPath').value = databasePath;
    updateButtons();
});

function updateButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    // Show/hide previous button
    prevBtn.style.display = currentStep > 1 ? 'block' : 'none';

    // Update next button text
    if (currentStep === totalSteps) {
        nextBtn.textContent = '🚀 Launch CRM';
    } else {
        nextBtn.textContent = 'Next →';
    }
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    setTimeout(() => errorDiv.classList.remove('show'), 5000);
}

function hideError() {
    document.getElementById('error-message').classList.remove('show');
}

async function choosePath() {
    const path = await window.electronAPI.setup.choosePath();
    if (path) {
        databasePath = path;
        document.getElementById('dbPath').value = path;
    }
}

function validateStep() {
    hideError();

    switch (currentStep) {
        case 1:
            return true;

        case 2:
            if (!databasePath) {
                showError('Please select a database location');
                return false;
            }
            return true;

        case 3:
            const name = document.getElementById('adminName').value.trim();
            const email = document.getElementById('adminEmail').value.trim();
            const password = document.getElementById('adminPassword').value;
            const confirmPassword = document.getElementById('adminPasswordConfirm').value;

            if (!name || !email || !password || !confirmPassword) {
                showError('Please fill in all fields');
                return false;
            }

            if (password.length < 8) {
                showError('Password must be at least 8 characters long');
                return false;
            }

            if (password !== confirmPassword) {
                showError('Passwords do not match');
                return false;
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showError('Please enter a valid email address');
                return false;
            }

            // Store admin data
            setupData.adminUser = { name, email, password };
            setupData.databasePath = databasePath;

            // Update summary
            document.getElementById('summaryPath').textContent = `Database: ${databasePath}`;
            document.getElementById('summaryEmail').textContent = `Admin Email: ${email}`;

            return true;

        default:
            return true;
    }
}

function nextStep() {
    if (!validateStep()) {
        return;
    }

    if (currentStep === totalSteps) {
        completeSetup();
        return;
    }

    // Hide current step
    document.querySelector(`.wizard-step[data-step="${currentStep}"]`).classList.remove('active');

    // Show next step
    currentStep++;
    document.querySelector(`.wizard-step[data-step="${currentStep}"]`).classList.add('active');

    updateButtons();
}

function previousStep() {
    if (currentStep <= 1) return;

    // Hide current step
    document.querySelector(`.wizard-step[data-step="${currentStep}"]`).classList.remove('active');

    // Show previous step
    currentStep--;
    document.querySelector(`.wizard-step[data-step="${currentStep}"]`).classList.add('active');

    updateButtons();
    hideError();
}

async function completeSetup() {
    const nextBtn = document.getElementById('nextBtn');
    nextBtn.disabled = true;
    nextBtn.textContent = 'Setting up...';

    try {
        const result = await window.electronAPI.setup.complete(setupData);

        if (result.success) {
            // Setup complete! Main window will reload to the app
        } else {
            showError(result.error || 'Setup failed. Please try again.');
            nextBtn.disabled = false;
            nextBtn.textContent = '🚀 Launch CRM';
        }
    } catch (error) {
        showError('An error occurred during setup: ' + error.message);
        nextBtn.disabled = false;
        nextBtn.textContent = '🚀 Launch CRM';
    }
}

// Allow Enter key to proceed
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && currentStep === 3) {
        nextStep();
    }
});
