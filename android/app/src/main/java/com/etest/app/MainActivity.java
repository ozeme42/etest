package com.etest.app;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import android.content.Intent;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetBridgePlugin.class);
        super.onCreate(savedInstanceState);
        configureFullscreen();
        optimizePerformance();
        handleWidgetIntent(getIntent());
    }

    private void optimizePerformance() {
        try {
            Window window = getWindow();
            if (window != null) {
                window.setFlags(
                    WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                    WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
                );
            }

            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

                WebSettings settings = webView.getSettings();
                if (settings != null) {
                    settings.setRenderPriority(WebSettings.RenderPriority.HIGH);
                    settings.setCacheMode(WebSettings.LOAD_DEFAULT);
                    settings.setDomStorageEnabled(true);
                    settings.setDatabaseEnabled(true);
                    settings.setAllowFileAccess(true);
                    settings.setAllowContentAccess(true);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        settings.setOffscreenPreRaster(true);
                    }
                    settings.setEnableSmoothTransition(true);
                }
            }
        } catch (Throwable ignored) {}
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleWidgetIntent(intent);
    }

    private void handleWidgetIntent(Intent intent) {
        if (intent == null) return;
        String targetUrl = intent.getStringExtra(TodayTasksWidgetProvider.EXTRA_TARGET_URL);
        if (targetUrl != null && !targetUrl.trim().isEmpty()) {
            final String safeUrl = targetUrl.replace("'", "\\'");
            // Run JS on bridge WebView after loaded
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().post(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            getBridge().getWebView().evaluateJavascript(
                                "window.dispatchEvent(new CustomEvent('widget_navigate', { detail: { url: '" + safeUrl + "' } }));",
                                null
                            );
                        } catch (Throwable ignored) {}
                    }
                });
            }
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            configureFullscreen();
        }
    }

    private void configureFullscreen() {
        try {
            Window window = getWindow();
            if (window == null) return;

            // 1. Soft keyboard adjust resize
            window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);

            // 2. Fits system windows so bottom navigation bar does not cover app content on older or 3-button devices
            WindowCompat.setDecorFitsSystemWindows(window, true);

            // 3. Status bar styling
            if (window.getDecorView() != null) {
                WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
                if (controller != null) {
                    controller.setAppearanceLightStatusBars(false);
                    controller.setAppearanceLightNavigationBars(false);
                }
            }
        } catch (Throwable ignored) {
            // Fallback gracefully without crashing
        }
    }
}
