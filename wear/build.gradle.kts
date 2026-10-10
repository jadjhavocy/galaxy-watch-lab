plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
    namespace = "dev.galaxywatchlab.bridge"
    compileSdk = 34
    defaultConfig { applicationId = "dev.galaxywatchlab.bridge"; minSdk = 30; targetSdk = 34; versionCode = 5; versionName = "0.7.3" }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
}

