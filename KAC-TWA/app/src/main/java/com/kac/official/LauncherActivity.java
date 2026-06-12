package com.kac.official;

import android.app.Activity;
import android.net.Uri;
import android.os.Bundle;

import androidx.browser.customtabs.CustomTabsIntent;

/**
 * TWA (Trusted Web Activity) Launcher Activity for KAC OFFICIAL.
 * Opens the PWA in a Chrome Custom Tab with Digital Asset Links verification,
 * providing a full-screen native app experience without Chrome's persistent notification.
 *
 * The disableDependentTabNotification meta-data in AndroidManifest.xml
 * suppresses the "Chrome — KAC — Tap to copy the URL for this app" notification.
 *
 * Uses Theme.KAC.Splash (dark #0a0a0a window background) set via AndroidManifest.xml
 * to eliminate the white flash on cold start before the PWA splash screen renders.
 */
public class LauncherActivity extends Activity {

    private static final String URL = "https://kac-official.vercel.app/";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Launch the PWA URL in a Trusted Web Activity via Chrome Custom Tabs
        CustomTabsIntent.Builder builder = new CustomTabsIntent.Builder();

        // Enable the trusted web activity URL bar hiding for full-screen TWA
        builder.setUrlBarHidingEnabled(true);

        CustomTabsIntent customTabsIntent = builder.build();

        // Configure the intent to launch as a TWA via Chrome
        customTabsIntent.intent.setPackage("com.android.chrome");

        // Launch the TWA
        customTabsIntent.launchUrl(this, Uri.parse(URL));

        // Finish the launcher activity immediately so it doesn't stay in the back stack
        finish();
    }
}