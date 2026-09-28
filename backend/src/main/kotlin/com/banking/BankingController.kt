package com.banking

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.*
import java.util.concurrent.ConcurrentLinkedDeque
import kotlin.random.Random

// --- DTOs ---

data class AccountResponse(
    val accountHolderName: String,
    val accountNumber: String,
    val balance: Double,
    val cardLocked: Boolean,
    val cardStatus: String
)

data class TransferRequest(
    val recipientPhone: String = "",
    val amount: Double = 0.0
)

data class TransferResponse(
    val success: Boolean,
    val message: String,
    val transactionId: String? = null,
    val amount: Double? = null,
    val recipientPhone: String? = null,
    val timestamp: String? = null,
    val newBalance: Double? = null
)

data class CardToggleResponse(
    val success: Boolean,
    val cardLocked: Boolean,
    val cardStatus: String,
    val message: String
)

data class PinVerificationRequest(
    val pin: String = ""
)

data class PinVerificationResponse(
    val success: Boolean,
    val message: String
)

data class TransactionRecord(
    val id: String,
    val title: String,
    val recipientPhone: String?,
    val amount: Double,
    val timestamp: String,
    val type: String, // "DEBIT" or "CREDIT"
    val status: String
)

// --- Controller & In-Memory Service ---

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = ["*"])
class BankingController {

    private val accountHolder = "Alex Morgan"
    private val accountNumber = "XXXX-XXXX-8921"
    
    // Thread-safe in-memory state
    @Volatile
    private var balance: Double = 2450.00
    
    @Volatile
    private var isCardLocked: Boolean = false

    private val transactions = ConcurrentLinkedDeque<TransactionRecord>().apply {
        add(
            TransactionRecord(
                id = "TXN-INIT01",
                title = "Whole Foods Market",
                recipientPhone = null,
                amount = 64.20,
                timestamp = "Today, 10:15 AM",
                type = "DEBIT",
                status = "COMPLETED"
            )
        )
        add(
            TransactionRecord(
                id = "TXN-INIT02",
                title = "Direct Deposit - Payroll",
                recipientPhone = null,
                amount = 1850.00,
                timestamp = "Yesterday",
                type = "CREDIT",
                status = "COMPLETED"
            )
        )
    }

    /**
     * DBA-5 & DBA-6: Get Account Details
     */
    @GetMapping("/account")
    fun getAccount(): ResponseEntity<AccountResponse> {
        return ResponseEntity.ok(
            AccountResponse(
                accountHolderName = accountHolder,
                accountNumber = accountNumber,
                balance = balance,
                cardLocked = isCardLocked,
                cardStatus = if (isCardLocked) "LOCKED" else "ACTIVE"
            )
        )
    }

    /**
     * DBA-6: Temporary Debit Card Lock
     * Toggling "Lock Card" ON updates card status to "LOCKED".
     * Toggling OFF restores status to "ACTIVE".
     */
    @PostMapping("/card/toggle")
    fun toggleCardLock(): ResponseEntity<CardToggleResponse> {
        synchronized(this) {
            isCardLocked = !isCardLocked
            val status = if (isCardLocked) "LOCKED" else "ACTIVE"
            val msg = if (isCardLocked) "Card is locked" else "Card is unlocked"
            return ResponseEntity.ok(
                CardToggleResponse(
                    success = true,
                    cardLocked = isCardLocked,
                    cardStatus = status,
                    message = msg
                )
            )
        }
    }

    /**
     * Explicitly set card lock state (optional convenience endpoint)
     */
    @PostMapping("/card/lock")
    fun setCardLock(@RequestParam locked: Boolean): ResponseEntity<CardToggleResponse> {
        synchronized(this) {
            isCardLocked = locked
            val status = if (isCardLocked) "LOCKED" else "ACTIVE"
            return ResponseEntity.ok(
                CardToggleResponse(
                    success = true,
                    cardLocked = isCardLocked,
                    cardStatus = status,
                    message = if (isCardLocked) "Card is locked" else "Card is unlocked"
                )
            )
        }
    }

    /**
     * DBA-5: Instant P2P Money Transfer
     * Scenario 1 (Success): Sufficient balance -> deducts balance and generates unique Transaction ID (e.g. TXN-8F32A1).
     * Scenario 2 (Insufficient Balance): amount > balance -> error "Insufficient account balance".
     * DBA-6 AC Scenario 1: If card is locked -> declined with "Card is locked" error.
     */
    @PostMapping("/transfer")
    fun transfer(@RequestBody request: TransferRequest): ResponseEntity<TransferResponse> {
        synchronized(this) {
            // Check Card Lock Status
            if (isCardLocked) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                    TransferResponse(
                        success = false,
                        message = "Card is locked"
                    )
                )
            }

            // Validate Input
            val phone = request.recipientPhone.trim()
            if (phone.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                    TransferResponse(
                        success = false,
                        message = "Recipient phone number is required"
                    )
                )
            }

            val amount = request.amount
            if (amount <= 0.0) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                    TransferResponse(
                        success = false,
                        message = "Transfer amount must be greater than zero"
                    )
                )
            }

            // Check Insufficient Balance
            if (amount > balance) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                    TransferResponse(
                        success = false,
                        message = "Insufficient account balance"
                    )
                )
            }

            // Deduct balance and generate unique transaction ID
            balance -= amount
            val txnId = generateTransactionId()
            val nowStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("MMM dd, yyyy HH:mm:ss"))

            val record = TransactionRecord(
                id = txnId,
                title = "Transfer to $phone",
                recipientPhone = phone,
                amount = amount,
                timestamp = "Just now",
                type = "DEBIT",
                status = "COMPLETED"
            )
            transactions.addFirst(record)

            return ResponseEntity.ok(
                TransferResponse(
                    success = true,
                    message = "Transfer completed successfully",
                    transactionId = txnId,
                    amount = amount,
                    recipientPhone = phone,
                    timestamp = nowStr,
                    newBalance = balance
                )
            )
        }
    }

    /**
     * Get transaction history
     */
    @GetMapping("/transactions")
    fun getTransactions(): ResponseEntity<List<TransactionRecord>> {
        return ResponseEntity.ok(transactions.toList())
    }

    /**
     * DBA-4 Backup PIN verification (`123456`)
     */
    @PostMapping("/auth/pin")
    fun verifyBackupPin(@RequestBody request: PinVerificationRequest): ResponseEntity<PinVerificationResponse> {
        val validPin = "123456"
        return if (request.pin.trim() == validPin) {
            ResponseEntity.ok(
                PinVerificationResponse(
                    success = true,
                    message = "PIN verified successfully"
                )
            )
        } else {
            ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                PinVerificationResponse(
                    success = false,
                    message = "Invalid 6-digit backup PIN"
                )
            )
        }
    }

    /**
     * Helper to reset state for testing
     */
    @PostMapping("/reset")
    fun resetState(): ResponseEntity<Map<String, Any>> {
        synchronized(this) {
            balance = 2450.00
            isCardLocked = false
            return ResponseEntity.ok(
                mapOf(
                    "message" to "State reset to defaults",
                    "balance" to balance,
                    "cardLocked" to isCardLocked
                )
            )
        }
    }

    private fun generateTransactionId(): String {
        val chars = "0123456789ABCDEF"
        val randomHex = (1..6)
            .map { chars[Random.nextInt(chars.length)] }
            .joinToString("")
        return "TXN-$randomHex"
    }
}
