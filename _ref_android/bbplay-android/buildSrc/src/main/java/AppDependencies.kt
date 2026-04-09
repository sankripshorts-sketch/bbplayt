import org.gradle.api.artifacts.dsl.DependencyHandler

object AppDependencies {

    //region app
    val coreKtx = "androidx.core:core-ktx:${Versions.coreKtx}"
    val appcompat = "androidx.appcompat:appcompat:${Versions.appcompat}"
    val material = "com.google.android.material:material:${Versions.material}"
    val constraintlayout = "androidx.constraintlayout:constraintlayout:${Versions.constraintlayout}"
    val fragmentKtx = "androidx.fragment:fragment-ktx:${Versions.fragmentKtx}"
    val livedataKtx = "androidx.lifecycle:lifecycle-livedata-ktx:${Versions.livedataKtx}"
    val viewmodelKtx = "androidx.lifecycle:lifecycle-viewmodel-ktx:${Versions.viewmodelKtx}"
    //endregion

    //region Splash Screen
    val splashscreen = "androidx.core:core-splashscreen:${Versions.splashscreen}"
    //endregion

    //region Navigation
    val navigationFragment = "androidx.navigation:navigation-fragment-ktx:${Versions.navigation}"
    val navigation = "androidx.navigation:navigation-ui-ktx:${Versions.navigation}"
    //endregion

    //region Kotlin coroutines
    val coroutinesCore = "org.jetbrains.kotlinx:kotlinx-coroutines-core:${Versions.coroutinesCore}"
    val coroutines = "org.jetbrains.kotlinx:kotlinx-coroutines-android:${Versions.coroutinesCore}"
    //endregion

    //region Dagger 2
    val dagger = "com.google.dagger:dagger:${Versions.dagger}"
    val daggerProducers = "com.google.dagger:dagger-producers:${Versions.dagger}"
    val daggerCompiler = "com.google.dagger:dagger-compiler:${Versions.dagger}"
    //endregion

    //region Network
    val retrofit = "com.squareup.retrofit2:retrofit:${Versions.retrofit}"
    val retrofitConvertor = "com.squareup.retrofit2:converter-gson:${Versions.retrofit}"
    val interseptor = "com.squareup.okhttp3:logging-interceptor:${Versions.okhttp}"
    val okhttp = "com.squareup.okhttp3:okhttp:${Versions.okhttp}"
    //endregion

    //region Coil image download
    val coil = "io.coil-kt:coil:${Versions.coil}"
    //endregion

    //region Preferences DataStore
    val datastorePreferences =
        "androidx.datastore:datastore-preferences:${Versions.datastorePreferences}"
    //endregion

    //region Loging
    val timber = "com.jakewharton.timber:timber:${Versions.timber}"
    //endregion

    //region Test
    val junit = "junit:junit:${Versions.junit}"
    val extJunit = "androidx.test.ext:junit:${Versions.extJunit}"
    val espresso = "androidx.test.espresso:espresso-core:${Versions.espresso}"
    //endregion

    //region appLibraries list
    val appLibraries = listOf(
        coreKtx,
        appcompat,
        constraintlayout,
        material,
        fragmentKtx,
        livedataKtx,
        dagger,
        retrofit,
        okhttp,
        navigation,
        coroutines,
        viewmodelKtx,
        splashscreen,
        navigationFragment,
        navigation,
        coroutinesCore,
        coroutines,
        dagger,
        daggerProducers,
        retrofit,
        retrofitConvertor,
        interseptor,
        okhttp,
        coil,
        datastorePreferences,
        timber
    )
    //endregion

    //region kapt list
    val kapt = listOf(daggerCompiler)
    //endregion

    //region androidTestLibraries list
    val androidTestLibraries = listOf(extJunit, espresso)
    //endregion

    //region testLibraries list
    val testLibraries = listOf(junit)
    //endregion
}

//region functions for adding the different type dependencies from build.gradle file
fun DependencyHandler.kapt(list: List<String>) {
    list.forEach { dependency ->
        add("kapt", dependency)
    }
}

fun DependencyHandler.implementation(list: List<String>) {
    list.forEach { dependency ->
        add("implementation", dependency)
    }
}

fun DependencyHandler.androidTestImplementation(list: List<String>) {
    list.forEach { dependency ->
        add("androidTestImplementation", dependency)
    }
}

fun DependencyHandler.testImplementation(list: List<String>) {
    list.forEach { dependency ->
        add("testImplementation", dependency)
    }
}
//endregion