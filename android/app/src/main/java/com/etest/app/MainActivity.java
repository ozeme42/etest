package com.etest.app;

import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import android.content.Intent;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetBridgePlugin.class);
        super.onCreate(savedInstanceState);
        configureFullscreen();
        handleWidgetIntent(getIntent());
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

            // 1. Extend into cutout to use entire screen
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                WindowManager.LayoutParams lp = window.getAttributes();
                if (lp != null) {
                    lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
                    window.setAttributes(lp);
                }
            }

            // 2. Edge-to-edge / don't fit system windows
            WindowCompat.setDecorFitsSystemWindows(window, false);

            // 3. Hide status bar completely (Immersive Fullscreen)
            if (window.getDecorView() != null) {
                WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
                if (controller != null) {
                    controller.hide(WindowInsetsCompat.Type.statusBars());
                    controller.setSystemBarsBehavior(
                        WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                    );
                }
            }
        } catch (Throwable ignored) {
            // Fallback gracefully without crashing
        }
    }
}
