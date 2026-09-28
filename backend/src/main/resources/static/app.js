/**
 * Aura Digital Banking Application
 * Agile Jira User Stories Implementation (DBA-4, DBA-5, DBA-6)
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    const state = {
        failedBioAttempts: 0,
        enteredPin: '',
        isCardLocked: false,
        balance: 2450.00,
        accountHolderName: 'Alex Morgan',
        accountNumber: 'XXXX-XXXX-8921'
    };

    // --- DOM Elements ---
    // Screens
    const screenBiometric = document.getElementById('screen-biometric');
    const screenDashboard = document.getElementById('screen-dashboard');
    const pinModal = document.getElementById('pin-modal');
    const receiptModal = document.getElementById('receipt-modal');

    // Clock
    const statusClock = document.getElementById('status-clock');
    updateClock();
    setInterval(updateClock, 30000);

    // Biometric Elements (DBA-4)
    const bioScannerRing = document.getElementById('bio-scanner-ring');
    const bioStatusText = document.getElementById('bio-status-text');
    const bioAttemptBadge = document.getElementById('bio-attempt-badge');
    const btnBioSuccess = document.getElementById('btn-bio-success');
    const btnBioFail = document.getElementById('btn-bio-fail');
    const btnGotoPinManual = document.getElementById('btn-goto-pin-manual');

    // PIN Elements
    const pinDots = document.getElementById('pin-dots');
    const pinErrorMsg = document.getElementById('pin-error-msg');
    const pinKeypad = document.getElementById('pin-keypad');
    const btnCancelPin = document.getElementById('btn-cancel-pin');
    const btnPinAuto = document.getElementById('btn-pin-auto');
    const btnPinBackspace = document.getElementById('btn-pin-backspace');

    // Dashboard Elements
    const dashBalance = document.getElementById('dash-balance');
    const dashHolderName = document.getElementById('dash-holder-name');
    const dashAccNum = document.getElementById('dash-acc-num');
    const btnRefreshState = document.getElementById('btn-refresh-state');
    const btnLogout = document.getElementById('btn-logout');

    // Card Management Elements (DBA-6)
    const cardStatusBadge = document.getElementById('card-status-badge');
    const debitCardVisual = document.getElementById('debit-card-visual');
    const cardLockOverlay = document.getElementById('card-lock-overlay');
    const toggleCardLock = document.getElementById('toggle-card-lock');
    const toggleCardDesc = document.getElementById('toggle-card-desc');

    // Transfer Elements (DBA-5)
    const transferForm = document.getElementById('transfer-form');
    const transferPhone = document.getElementById('transfer-phone');
    const transferAmount = document.getElementById('transfer-amount');
    const transferAlert = document.getElementById('transfer-alert');
    const alertMessage = document.getElementById('alert-message');
    const btnSubmitTransfer = document.getElementById('btn-submit-transfer');
    const transferSpinner = document.getElementById('transfer-spinner');
    const transferBtnText = document.getElementById('transfer-btn-text');
    const transactionsList = document.getElementById('transactions-list');
    const activityCount = document.getElementById('activity-count');

    // Receipt Elements
    const receiptAmount = document.getElementById('receipt-amount');
    const receiptTxnId = document.getElementById('receipt-txnid');
    const receiptPhone = document.getElementById('receipt-phone');
    const receiptTime = document.getElementById('receipt-time');
    const receiptNewBalance = document.getElementById('receipt-newbalance');
    const btnCloseReceipt = document.getElementById('btn-close-receipt');

    // Toast Container
    const toastShelf = document.getElementById('toast-shelf');

    // Quick Jira Dock
    const dockBtnBioOk = document.getElementById('dock-btn-bio-ok');
    const dockBtnBioFail3 = document.getElementById('dock-btn-bio-fail3');
    const dockBtnXferOk = document.getElementById('dock-btn-xfer-ok');
    const dockBtnXferFail = document.getElementById('dock-btn-xfer-fail');
    const dockBtnCardToggle = document.getElementById('dock-btn-card-toggle');
    const dockBtnReset = document.getElementById('dock-btn-reset');
    const btnDockToggle = document.getElementById('btn-dock-toggle');
    const dockButtons = document.getElementById('dock-buttons');

    // =========================================================
    // 1. INITIALIZATION & DATA FETCHING
    // =========================================================
    async function loadAccountState() {
        try {
            const res = await fetch('/api/account');
            if (!res.ok) throw new Error('Failed to load account');
            const data = await res.json();
            
            state.balance = data.balance;
            state.isCardLocked = data.cardLocked;
            state.accountHolderName = data.accountHolderName;
            state.accountNumber = data.accountNumber;

            renderAccountState();
            await loadTransactions();
        } catch (err) {
            console.error('Account state load error:', err);
            showToast('Unable to connect to server: ' + err.message, 'error');
        }
    }

    function renderAccountState() {
        // Balance & User
        dashBalance.textContent = formatCurrency(state.balance);
        dashHolderName.textContent = state.accountHolderName;
        dashAccNum.textContent = state.accountNumber;

        // Card Lock UI (DBA-6)
        toggleCardLock.checked = state.isCardLocked;
        if (state.isCardLocked) {
            cardStatusBadge.textContent = 'LOCKED';
            cardStatusBadge.classList.add('locked');
            debitCardVisual.classList.add('locked');
            cardLockOverlay.classList.add('active');
            toggleCardDesc.textContent = 'Card is LOCKED. All debit and P2P transfers are disabled.';
        } else {
            cardStatusBadge.textContent = 'ACTIVE';
            cardStatusBadge.classList.remove('locked');
            debitCardVisual.classList.remove('locked');
            cardLockOverlay.classList.remove('active');
            toggleCardDesc.textContent = 'Card is ACTIVE. Instant P2P transfers are enabled.';
        }
    }

    async function loadTransactions() {
        try {
            const res = await fetch('/api/transactions');
            if (!res.ok) return;
            const txns = await res.json();

            activityCount.textContent = `${txns.length} transaction${txns.length === 1 ? '' : 's'}`;
            transactionsList.innerHTML = txns.map(t => `
                <div class="txn-item">
                    <div class="txn-left">
                        <div class="txn-icon ${t.type.toLowerCase()}">
                            ${t.type === 'DEBIT' ? '↗' : '↙'}
                        </div>
                        <div>
                            <div class="txn-title">${escapeHtml(t.title)}</div>
                            <div class="txn-sub">${escapeHtml(t.timestamp)} • <span class="txn-badge">${escapeHtml(t.id)}</span></div>
                        </div>
                    </div>
                    <div class="txn-right">
                        <div class="txn-amount ${t.type.toLowerCase()}">
                            ${t.type === 'DEBIT' ? '-' : '+'}$${t.amount.toFixed(2)}
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            console.warn('Transactions load err:', e);
        }
    }

    // =========================================================
    // 2. EPIC 1: BIOMETRIC LOGIN (DBA-4)
    // =========================================================

    /**
     * Scenario 1 (Success): Valid biometrics grants access and transitions within 2 seconds.
     */
    async function handleBiometricSuccess() {
        if (bioScannerRing.classList.contains('scanning')) return;

        bioScannerRing.classList.remove('failed');
        bioScannerRing.classList.add('scanning');
        bioStatusText.textContent = 'Verifying biometrics...';

        // Transition within 1.2s (< 2 seconds as required by DBA-4 Acceptance Criteria)
        setTimeout(() => {
            bioScannerRing.classList.remove('scanning');
            bioScannerRing.classList.add('success');
            bioStatusText.textContent = 'Identity Verified! Access Granted.';
            showToast('Biometric authentication verified', 'success');

            setTimeout(() => {
                transitionToDashboard();
                bioScannerRing.classList.remove('success');
                bioStatusText.textContent = 'Touch sensor to authenticate';
                state.failedBioAttempts = 0;
                updateAttemptBadge();
            }, 500);
        }, 800);
    }

    /**
     * Scenario 2 (Failure Fallback): If biometric scan fails 3 consecutive times, prompt for 6-digit backup PIN (123456).
     */
    function handleBiometricFailure() {
        if (bioScannerRing.classList.contains('scanning')) return;

        bioScannerRing.classList.add('scanning');
        bioStatusText.textContent = 'Scanning...';

        setTimeout(() => {
            bioScannerRing.classList.remove('scanning');
            bioScannerRing.classList.add('failed');
            state.failedBioAttempts++;
            updateAttemptBadge();

            bioStatusText.textContent = `Scan failed! (${state.failedBioAttempts} of 3 attempts)`;
            showToast(`Biometric scan failed (${state.failedBioAttempts}/3)`, 'error');

            setTimeout(() => {
                bioScannerRing.classList.remove('failed');
            }, 600);

            // Check if 3 consecutive failures reached
            if (state.failedBioAttempts >= 3) {
                setTimeout(() => {
                    openPinModal();
                }, 400);
            }
        }, 500);
    }

    function updateAttemptBadge() {
        bioAttemptBadge.textContent = `${state.failedBioAttempts} / 3 failed attempts`;
        if (state.failedBioAttempts > 0) {
            bioAttemptBadge.classList.add('warning');
        } else {
            bioAttemptBadge.classList.remove('warning');
        }
    }

    function transitionToDashboard() {
        screenBiometric.classList.remove('active');
        screenDashboard.classList.add('active');
        loadAccountState();
    }

    function transitionToLogin() {
        screenDashboard.classList.remove('active');
        screenBiometric.classList.add('active');
        state.failedBioAttempts = 0;
        updateAttemptBadge();
        bioStatusText.textContent = 'Touch sensor to authenticate';
        closePinModal();
        closeReceiptModal();
    }

    // Biometric Listeners
    btnBioSuccess.addEventListener('click', handleBiometricSuccess);
    bioScannerRing.addEventListener('click', handleBiometricSuccess);
    btnBioFail.addEventListener('click', handleBiometricFailure);
    btnGotoPinManual.addEventListener('click', openPinModal);

    // =========================================================
    // 3. DBA-4 FALLBACK: 6-DIGIT BACKUP PIN MODAL (123456)
    // =========================================================
    function openPinModal() {
        state.enteredPin = '';
        updatePinDots();
        pinErrorMsg.classList.remove('visible');
        pinModal.classList.add('active');
    }

    function closePinModal() {
        pinModal.classList.remove('active');
        state.enteredPin = '';
        updatePinDots();
    }

    btnCancelPin.addEventListener('click', () => {
        closePinModal();
        bioStatusText.textContent = 'Touch sensor to authenticate';
    });

    btnPinAuto.addEventListener('click', () => {
        state.enteredPin = '123456';
        updatePinDots();
        submitPinVerification();
    });

    btnPinBackspace.addEventListener('click', () => {
        if (state.enteredPin.length > 0) {
            state.enteredPin = state.enteredPin.slice(0, -1);
            updatePinDots();
            pinErrorMsg.classList.remove('visible');
        }
    });

    // Keypad number clicks
    pinKeypad.querySelectorAll('.key-btn[data-key]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (state.enteredPin.length < 6) {
                state.enteredPin += btn.getAttribute('data-key');
                updatePinDots();
                pinErrorMsg.classList.remove('visible');

                if (state.enteredPin.length === 6) {
                    setTimeout(submitPinVerification, 150);
                }
            }
        });
    });

    function updatePinDots() {
        const dots = pinDots.querySelectorAll('.pin-dot');
        dots.forEach((dot, idx) => {
            if (idx < state.enteredPin.length) {
                dot.classList.add('filled');
            } else {
                dot.classList.remove('filled');
            }
        });
    }

    async function submitPinVerification() {
        try {
            const res = await fetch('/api/auth/pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: state.enteredPin })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                showToast('PIN verified! Unlocking account...', 'success');
                setTimeout(() => {
                    closePinModal();
                    transitionToDashboard();
                    state.failedBioAttempts = 0;
                    updateAttemptBadge();
                }, 400);
            } else {
                pinErrorMsg.textContent = data.message || 'Invalid 6-digit backup PIN. Try 123456.';
                pinErrorMsg.classList.add('visible');
                state.enteredPin = '';
                updatePinDots();
            }
        } catch (e) {
            pinErrorMsg.textContent = 'Connection error verifying PIN';
            pinErrorMsg.classList.add('visible');
        }
    }

    // =========================================================
    // 4. EPIC 2: STORY 3 (DBA-6) - DEBIT CARD LOCK
    // =========================================================
    toggleCardLock.addEventListener('change', async (e) => {
        try {
            const res = await fetch('/api/card/toggle', { method: 'POST' });
            const data = await res.json();

            if (res.ok && data.success) {
                state.isCardLocked = data.cardLocked;
                renderAccountState();
                showToast(
                    data.cardLocked ? 'Debit Card LOCKED (P2P Transfers Blocked)' : 'Debit Card UNLOCKED (Transfers Active)',
                    data.cardLocked ? 'error' : 'success'
                );
            } else {
                // Revert switch on error
                toggleCardLock.checked = state.isCardLocked;
                showToast('Failed to toggle card lock state', 'error');
            }
        } catch (err) {
            toggleCardLock.checked = state.isCardLocked;
            showToast('Network error toggling card lock', 'error');
        }
    });

    // =========================================================
    // 5. EPIC 2: STORY 2 (DBA-5) - INSTANT P2P TRANSFER
    // =========================================================

    // Quick contact chips
    document.querySelectorAll('.contact-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            transferPhone.value = chip.getAttribute('data-phone');
            clearTransferAlert();
        });
    });

    // Quick amount chips
    document.querySelectorAll('.amount-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.amount-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            transferAmount.value = parseFloat(chip.getAttribute('data-val')).toFixed(2);
            clearTransferAlert();
        });
    });

    transferAmount.addEventListener('input', () => {
        clearTransferAlert();
        document.querySelectorAll('.amount-chip').forEach(c => c.classList.remove('active'));
    });

    transferPhone.addEventListener('input', clearTransferAlert);

    function showTransferAlert(msg, type = 'error') {
        alertMessage.textContent = msg;
        transferAlert.className = `alert-banner ${type}`;
    }

    function clearTransferAlert() {
        transferAlert.className = 'alert-banner';
        alertMessage.textContent = '';
    }

    transferForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearTransferAlert();

        const phone = transferPhone.value.trim();
        const amount = parseFloat(transferAmount.value);

        if (!phone) {
            showTransferAlert('Please enter a recipient phone number');
            return;
        }

        if (isNaN(amount) || amount <= 0) {
            showTransferAlert('Please enter a valid transfer amount greater than $0');
            return;
        }

        // Set Loading state
        btnSubmitTransfer.disabled = true;
        transferSpinner.classList.add('active');
        transferBtnText.textContent = 'Processing Transfer...';

        try {
            const res = await fetch('/api/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipientPhone: phone, amount: amount })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                // Scenario 1 (Success): Balance deducted & TXN ID generated
                state.balance = data.newBalance;
                dashBalance.textContent = formatCurrency(state.balance);
                
                // Show Success Receipt Modal
                receiptAmount.textContent = data.amount.toFixed(2);
                receiptTxnId.textContent = data.transactionId;
                receiptPhone.textContent = data.recipientPhone;
                receiptTime.textContent = data.timestamp;
                receiptNewBalance.textContent = `$${data.newBalance.toFixed(2)}`;
                receiptModal.classList.add('active');

                showToast(`Sent $${amount.toFixed(2)}! ID: ${data.transactionId}`, 'success');
                await loadTransactions();
            } else {
                // Scenario 2 (Insufficient Balance) or DBA-6 (Card is locked)
                showTransferAlert(data.message || 'Transfer failed');
                showToast(data.message || 'Transfer failed', 'error');
            }
        } catch (err) {
            showTransferAlert('Network error occurred during transfer');
            showToast('Network error', 'error');
        } finally {
            btnSubmitTransfer.disabled = false;
            transferSpinner.classList.remove('active');
            transferBtnText.textContent = 'Send Money Instantly';
        }
    });

    // Close Receipt Modal
    btnCloseReceipt.addEventListener('click', closeReceiptModal);
    function closeReceiptModal() {
        receiptModal.classList.remove('active');
    }

    // Header actions
    btnRefreshState.addEventListener('click', async () => {
        await loadAccountState();
        showToast('Account data refreshed', 'success');
    });

    btnLogout.addEventListener('click', transitionToLogin);

    // =========================================================
    // 6. QUICK JIRA AGILE SCENARIO RUNNER
    // =========================================================
    btnDockToggle.addEventListener('click', () => {
        dockButtons.style.display = dockButtons.style.display === 'none' ? 'flex' : 'none';
        btnDockToggle.textContent = dockButtons.style.display === 'none' ? '▴' : '▾';
    });

    // DBA-4 Bio Success
    dockBtnBioOk.addEventListener('click', () => {
        if (!screenBiometric.classList.contains('active')) {
            transitionToLogin();
        }
        setTimeout(handleBiometricSuccess, 200);
    });

    // DBA-4 Fail 3x -> Prompt PIN
    dockBtnBioFail3.addEventListener('click', () => {
        if (!screenBiometric.classList.contains('active')) {
            transitionToLogin();
        }
        state.failedBioAttempts = 2; // set to 2 so next failure triggers PIN
        handleBiometricFailure();
    });

    // DBA-5 Transfer $50
    dockBtnXferOk.addEventListener('click', async () => {
        if (!screenDashboard.classList.contains('active')) {
            transitionToDashboard();
        }
        transferPhone.value = '+1 (555) 234-5678';
        transferAmount.value = '50.00';
        clearTransferAlert();
        transferForm.dispatchEvent(new Event('submit'));
    });

    // DBA-5 Insufficient Balance ($3,000)
    dockBtnXferFail.addEventListener('click', async () => {
        if (!screenDashboard.classList.contains('active')) {
            transitionToDashboard();
        }
        transferPhone.value = '+1 (555) 234-5678';
        transferAmount.value = '3000.00';
        clearTransferAlert();
        transferForm.dispatchEvent(new Event('submit'));
    });

    // DBA-6 Toggle Card Lock
    dockBtnCardToggle.addEventListener('click', () => {
        if (!screenDashboard.classList.contains('active')) {
            transitionToDashboard();
        }
        toggleCardLock.click();
    });

    // Reset State
    dockBtnReset.addEventListener('click', async () => {
        try {
            await fetch('/api/reset', { method: 'POST' });
            await loadAccountState();
            showToast('Account reset to default ($2,450.00, ACTIVE)', 'success');
        } catch (e) {
            console.error(e);
        }
    });

    // =========================================================
    // 7. UTILITY FUNCTIONS
    // =========================================================
    function formatCurrency(num) {
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function updateClock() {
        const now = new Date();
        const hrs = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        statusClock.textContent = `${hrs}:${mins}`;
    }

    function showToast(msg, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${type === 'success' ? '✓' : '⚠️'}</span> <span>${escapeHtml(msg)}</span>`;
        toastShelf.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Initial check
    loadAccountState();
});
