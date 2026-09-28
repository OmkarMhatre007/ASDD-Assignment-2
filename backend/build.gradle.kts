plugins {
    kotlin("jvm") version "2.1.10"
    kotlin("plugin.spring") version "2.1.10"
    id("org.springframework.boot") version "3.4.3"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com.banking"
version = "0.0.1-SNAPSHOT"

// Prevent OneDrive file locking conflicts on Windows during fast build iterations
if (System.getProperty("os.name").lowercase().contains("windows")) {
    val localBuildDir = file("${System.getProperty("user.home")}/.gradle-builds/retail-banking/build")
    layout.buildDirectory.set(localBuildDir)
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
        freeCompilerArgs.addAll("-Xjsr305=strict")
    }
}

tasks.withType<JavaCompile> {
    options.release.set(17)
}

tasks.withType<Test> {
    useJUnitPlatform()
}
