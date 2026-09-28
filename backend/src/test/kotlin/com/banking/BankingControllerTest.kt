package com.banking

import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*

@SpringBootTest
@AutoConfigureMockMvc
class BankingControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @BeforeEach
    fun resetState() {
        mockMvc.perform(post("/api/reset"))
            .andExpect(status().isOk)
    }

    @Test
    fun `GET api-account returns default account state`() {
        mockMvc.perform(get("/api/account"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.accountHolderName").value("Alex Morgan"))
            .andExpect(jsonPath("$.accountNumber").value("XXXX-XXXX-8921"))
            .andExpect(jsonPath("$.balance").value(2450.00))
            .andExpect(jsonPath("$.cardLocked").value(false))
            .andExpect(jsonPath("$.cardStatus").value("ACTIVE"))
    }

    @Test
    fun `DBA-5 Scenario 1 - Instant P2P transfer with sufficient balance succeeds`() {
        val transferRequest = TransferRequest(
            recipientPhone = "+1 (555) 234-5678",
            amount = 50.0
        )

        mockMvc.perform(
            post("/api/transfer")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(transferRequest))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.amount").value(50.0))
            .andExpect(jsonPath("$.recipientPhone").value("+1 (555) 234-5678"))
            .andExpect(jsonPath("$.newBalance").value(2400.0))
            .andExpect(jsonPath("$.transactionId").isNotEmpty)
            .andExpect(jsonPath("$.transactionId").value(org.hamcrest.Matchers.startsWith("TXN-")))

        // Verify account balance updated
        mockMvc.perform(get("/api/account"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.balance").value(2400.0))
    }

    @Test
    fun `DBA-5 Scenario 2 - Transfer with insufficient balance fails`() {
        val transferRequest = TransferRequest(
            recipientPhone = "+1 (555) 234-5678",
            amount = 3000.0 // Balance is 2450.00
        )

        mockMvc.perform(
            post("/api/transfer")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(transferRequest))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Insufficient account balance"))
    }

    @Test
    fun `DBA-6 Scenario 1 and 2 - Debit card lock freeze and unfreeze`() {
        // Initially Active
        mockMvc.perform(get("/api/account"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.cardLocked").value(false))
            .andExpect(jsonPath("$.cardStatus").value("ACTIVE"))

        // Scenario 1: Toggle Lock ON -> updates status to LOCKED
        mockMvc.perform(post("/api/card/toggle"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.cardLocked").value(true))
            .andExpect(jsonPath("$.cardStatus").value("LOCKED"))

        // Verify transfer attempt declined with "Card is locked"
        val transferRequest = TransferRequest(
            recipientPhone = "+1 (555) 234-5678",
            amount = 50.0
        )
        mockMvc.perform(
            post("/api/transfer")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(transferRequest))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Card is locked"))

        // Scenario 2: Toggle Lock OFF -> restores status to ACTIVE and re-enables transfers
        mockMvc.perform(post("/api/card/toggle"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.cardLocked").value(false))
            .andExpect(jsonPath("$.cardStatus").value("ACTIVE"))

        // Transfer should now succeed
        mockMvc.perform(
            post("/api/transfer")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(transferRequest))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.newBalance").value(2400.0))
    }

    @Test
    fun `DBA-4 Backup PIN verification validates 123456`() {
        // Valid PIN 123456
        mockMvc.perform(
            post("/api/auth/pin")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(PinVerificationRequest(pin = "123456")))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))

        // Invalid PIN
        mockMvc.perform(
            post("/api/auth/pin")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(PinVerificationRequest(pin = "999999")))
        )
            .andExpect(status().isUnauthorized)
            .andExpect(jsonPath("$.success").value(false))
    }
}
