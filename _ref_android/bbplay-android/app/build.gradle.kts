import java.io.BufferedReader
import com.android.build.gradle.internal.tasks.FinalizeBundleTask
import org.jetbrains.kotlin.util.capitalizeDecapitalize.capitalizeAsciiOnly

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("kotlin-kapt")
    id("kotlin-parcelize")
    id("androidx.navigation.safeargs")
    id("com.google.gms.google-services")
}
val keystorePass: String by project

android {
    namespace = "mobi.blackbears.bbplay"
    compileSdk = AppConfig.compileSdk

    signingConfigs {
        create("releaseBBplay") {
            keyAlias = "bbplay"
            keyPassword = keystorePass
            storeFile = file("$rootDir/keystore/BBPlayKeys.jks")
            storePassword = keystorePass
        }
    }

    defaultConfig {
        applicationId = "mobi.blackbears.bbplay"
        minSdk = AppConfig.minSdk
        targetSdk = AppConfig.targetSdk
        versionCode = AppConfig.versionCode
        versionName = AppConfig.versionName
        testInstrumentationRunner = AppConfig.androidTestInstrumentation

        ndk {
            abiFilters.addAll(listOf("arm64-v8a", "armeabi-v7a", "x86", "x86_64"))
        }

        //Network BB PLay Fields
        buildConfigField("String", "BBPLAY_ID_CAFE", "\"74922\"")
        buildConfigField("String", "ID_CAFE_SECOND_CLUB", "\"76301\"")
        buildConfigField("String", "KEY", "\"!A%D*G-KaPdSgVkYp3s6v9y\$B?E(H+MbQeThWmZq4t7w!z%C*F)J@NcRfUjXn2r5u8x/A?D(G+KaPdSgVkYp3s6v9y\$B&E)H@McQeThWmZq4t7w!z%C*F-JaNdRgUjXn\"")
        buildConfigField("String", "SECRET_KEY", "\"M0R4SGnGrNnNFkeT2125LFB0cAHbBkXD\"")

        //Vk api fields
        buildConfigField("String", "VK_BASE_URL", "\"https://api.vk.com/\"")
        buildConfigField("String", "VK_AUTHORIZATION","\"Bearer 787071117870711178707111307b63465677870787071111c6df96e084d083a36e52fc5\"")
        buildConfigField("Double", "VK_VERSION_API", "5.131")
        buildConfigField("Long", "VK_COMMUNITY_ID", "-221562447L")

        buildConfigField("String", "APP_METRICA_API_KEY", "\"c1ae9efc-d6fd-41f3-96b2-36f8c2fa335f\"")
        buildConfigField("String", "Y_MONEY_APP_SCHEME", "\"android.bbplay://invoicing/sberpay\"")
    }

    buildFeatures {
        viewBinding = true
        dataBinding = true
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("releaseBBplay")

            //Base Url
            buildConfigField("String", "BBPLAY_URL", "\"https://bbplay.bbgms-api.com/\"")

            buildConfigField("String", "CLIENT_HEADER", "\"BBPlayAndroidRelease\"")

            //PaymentFields
            buildConfigField("String", "CLIENT_ID", "\"live_MTEyMTA4MCKHX1oJ3wucBUAgEiksgfsF-wo26LYVmIs\"")
            buildConfigField("String", "SHOP_ID", "\"1121080\"")
        }

        debug {
            isMinifyEnabled = false

            //Base Url
            buildConfigField("String", "BBPLAY_URL", "\"https://bbplay-test.bbgms-api.com/\"")

            buildConfigField("String", "CLIENT_HEADER", "\"BBPlayAndroidDebug\"")

            //PaymentFields
            buildConfigField("String", "CLIENT_ID", "\"live_MTEyMTA4MCKHX1oJ3wucBUAgEiksgfsF-wo26LYVmIs\"")
            buildConfigField("String", "SHOP_ID", "\"1121080\"")
        }
    }

    compileOptions {
        isCoreLibraryDesugaringEnabled = true
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    // Keyboard visible library
    implementation("net.yslibrary.keyboardvisibilityevent:keyboardvisibilityevent:3.0.0-RC3")

    //Firebase
    implementation(platform("com.google.firebase:firebase-bom:33.1.1"))
    implementation ("com.google.firebase:firebase-analytics-ktx")
    implementation("com.google.firebase:firebase-messaging:24.0.0")
    implementation("com.google.android.gms:play-services-base:18.5.0")

    //AppMetrica
    implementation ("com.yandex.android:mobmetricalib:5.3.0")

    //Push AppMetrica
    implementation("com.yandex.android:mobmetricapushlib:2.3.3")
    implementation("androidx.legacy:legacy-support-v4:1.0.0")

    implementation("io.github.ShawnLin013:number-picker:2.4.13")

    //PaymentLibrary
    implementation("ru.yoomoney.sdk.kassa.payments:yookassa-android-sdk:6.11.0")
    implementation("com.vk:android-sdk-core:4.1.0")

    //SwipeToRefresh
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")

    //Desugaring java 8
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.0.4")

    implementation(AppDependencies.appLibraries)
    testImplementation(AppDependencies.testLibraries)
    androidTestImplementation(AppDependencies.androidTestLibraries)
    kapt(AppDependencies.kapt)
}

android.applicationVariants.all {
    val buildTypeName = buildType.name
    val aabPackageName = "bbplay-$buildTypeName-v$versionName($versionCode)-$commitHash.aab"

    outputs.all {
        //Rename aab file
        val bundleFinalizeTaskName = StringBuilder("sign").run {
            append(buildType.name.capitalizeAsciiOnly())
            append("Bundle")
            toString()
        }
        tasks.named(bundleFinalizeTaskName, FinalizeBundleTask::class.java) {
            val file = finalBundleFile.asFile.get()
            val finalFile = File(file.parentFile, aabPackageName)
            finalBundleFile.set(finalFile)
        }
        //Rename apk file
        (this as com.android.build.gradle.internal.api.BaseVariantOutputImpl).outputFileName =
            outputFileName
                .replace("app", "bbplay")
                .replace("$buildTypeName", "$buildTypeName-v$versionName($versionCode)")
    }
}

var commitHash: String by extra
commitHash = Runtime
    .getRuntime()
    .exec("git rev-parse --short HEAD")
    .let { process ->
        process.waitFor()
        val output = process.inputStream.use { it.bufferedReader().use(BufferedReader::readText) }
        process.destroy()
        output.trim()
    }