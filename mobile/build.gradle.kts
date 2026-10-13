plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }

android {
    namespace = "dev.galaxywatchlab.mobile"
    compileSdk = 34
    defaultConfig {
        // Must equal the watch application's ID for Play Services Wear Data Layer.
        applicationId = "dev.galaxywatchlab.bridge"
        minSdk = 28
        targetSdk = 34
        versionCode = 2
        versionName = "0.9.1-phone-preview"
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("com.google.android.gms:play-services-wearable:18.2.0")
    testImplementation("junit:junit:4.13.2")
}
