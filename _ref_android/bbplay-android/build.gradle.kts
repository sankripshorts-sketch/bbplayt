buildscript {
    repositories {
        mavenCentral()
        google()
    }

    dependencies {
        classpath("com.android.tools.build:gradle:8.6.1")
        classpath("androidx.navigation:navigation-safe-args-gradle-plugin:2.8.0")
        classpath("com.google.gms:google-services:4.4.4")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.25")
    }
}