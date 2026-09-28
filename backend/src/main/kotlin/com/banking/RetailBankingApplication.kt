package com.banking

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class RetailBankingApplication

fun main(args: Array<String>) {
	runApplication<RetailBankingApplication>(*args)
}
