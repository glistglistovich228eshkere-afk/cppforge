plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Google sign-in credentials come from GitHub Actions secrets (or -P flags / env vars for local builds).
// They are injected at build time and are never stored in the repository.
val googleClientId: String = (project.findProperty("googleClientId") as String?)
    ?: System.getenv("GOOGLE_CLIENT_ID") ?: ""
val googleClientSecret: String = (project.findProperty("googleClientSecret") as String?)
    ?: System.getenv("GOOGLE_CLIENT_SECRET") ?: ""

android {
    namespace = "dev.cppforge.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "dev.cppforge.app"
        minSdk = 26
        targetSdk = 34
        versionCode = 3
        versionName = "1.2.0"

        buildConfigField("String", "GOOGLE_CLIENT_ID", "\"$googleClientId\"")
        buildConfigField("String", "GOOGLE_CLIENT_SECRET", "\"$googleClientSecret\"")
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}
