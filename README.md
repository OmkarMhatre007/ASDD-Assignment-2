# Aura Retail Digital Banking Application

A full-stack, agile retail mobile banking application implementing the exact Jira user stories and acceptance criteria for **DBA-4**, **DBA-5**, and **DBA-6**.

[![Build and Test Retail Digital Banking Application](https://github.com/OmkarMhatre007/ASDD-Assignment-2/actions/workflows/build-and-test.yml/badge.svg)](https://github.com/OmkarMhatre007/ASDD-Assignment-2/actions/workflows/build-and-test.yml)

---

## 1. Project Architecture & Tech Stack

- **Frontend**: HTML5, Vanilla CSS3 (Fintech Dark Mode & Glassmorphic UI), JavaScript ES6+ (Fetch API)
  - Location: `/backend/src/main/resources/static/`
- **Backend**: Kotlin with Spring Boot 3.4.3
  - Location: `/backend/`
  - Embedded Server: Apache Tomcat on port `8080`
- **CI/CD Pipeline**: GitHub Actions
  - Location: `.github/workflows/build-and-test.yml`
  - Java JDK 17 with Gradle build & automated unit tests

---

## 2. Jira User Stories & Acceptance Criteria

### Epic 1: Account Security & Authentication
#### Story 1 (DBA-4): Biometric Login for Mobile Banking
- **Priority**: High | **Story Points**: 3
- **Requirement**: Provide a biometric login screen (Fingerprint / Face ID simulation) as the primary entry point.
- **Acceptance Criteria**:
  - **Scenario 1 (Success)**: Scanning valid biometrics grants access and transitions to the Account Dashboard within 2 seconds.
  - **Scenario 2 (Failure Fallback)**: If biometric scan fails 3 consecutive times, prompt the user for a 6-digit backup PIN (`123456`).

---

### Epic 2: Fund Transfers & Card Management
#### Story 2 (DBA-5): Instant P2P Money Transfer
- **Priority**: High | **Story Points**: 5
- **Requirement**: Allow instant money transfers to a recipient using their phone number.
- **Acceptance Criteria**:
  - **Scenario 1 (Success)**: Given a user with sufficient account balance ($2,450.00 default), entering a phone number and amount (e.g., $50) instantly deducts the balance and generates a unique Transaction ID (e.g., `TXN-8F32A1`).
  - **Scenario 2 (Insufficient Balance)**: If transfer amount > available balance, block the transaction with an `"Insufficient account balance"` error message.

#### Story 3 (DBA-6): Temporary Debit Card Lock
- **Priority**: Medium | **Story Points**: 3
- **Requirement**: Allow users to instantly freeze/unfreeze their debit card with a toggle switch.
- **Acceptance Criteria**:
  - **Scenario 1 (Freeze)**: Toggling "Lock Card" to ON immediately updates the card status to `"LOCKED"`. Any subsequent P2P transfer attempt must be declined with a `"Card is locked"` error.
  - **Scenario 2 (Unfreeze)**: Toggling "Lock Card" to OFF restores status to `"ACTIVE"` and re-enables transfers.

---

## 3. REST API Specification

| Endpoint | Method | Description |
|---|---|---|
| `/api/account` | `GET` | Returns balance ($2,450.00 default), card lock status (`ACTIVE` vs `LOCKED`), and account holder name. |
| `/api/transfer` | `POST` | Validates amount, checks card lock state, deducts balance, and returns transaction receipt object (`TXN-...`). |
| `/api/card/toggle` | `POST` | Toggles debit card lock state between `ACTIVE` and `LOCKED`. |
| `/api/auth/pin` | `POST` | Validates 6-digit backup security PIN (`123456`). |
| `/api/transactions` | `GET` | Retrieves recent transaction history. |
| `/api/reset` | `POST` | Resets state to defaults for automated testing. |

---

## 4. Setup, Build & Run Instructions

### Prerequisites
- Java Development Kit (JDK 17 or later)
- Gradle 8.14.5 wrapper is bundled in `backend/`

### Build & Run Locally
```bash
# 1. Grant wrapper execute permissions
chmod +x backend/gradlew

# 2. Build and run tests
cd backend
./gradlew build

# 3. Start the Spring Boot application
./gradlew bootRun
```

The application will be live at `http://localhost:8080/`.
