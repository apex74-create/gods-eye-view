package com.apexairsolutions.godseye;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.view.View;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Apex God's Eye View — native container.
 *
 * A single full-screen WebView pointed at a loopback HTTP server that
 * serves the bundled God's Eye View web build (Apex fork, with the Apex
 * Telemetry / Encrypted CB / Ham Radio overlay layers). Live layers fetch
 * their data over the network at runtime, exactly as designed on the web.
 */
public class MainActivity extends Activity {
    private WebView webView;
    private AssetServer server;
    private int port;

    private static final String[] RUNTIME_PERMS = {
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.CAMERA
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        requestNeededPermissions();

        server = new AssetServer(getAssets(), "www");
        try {
            port = server.start();
        } catch (IOException e) {
            Toast.makeText(this, "Apex God's Eye View: local server failed to start",
                    Toast.LENGTH_LONG).show();
            return;
        }

        webView = new WebView(this);
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setGeolocationEnabled(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setSupportMultipleWindows(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin,
                    GeolocationPermissions.Callback callback) {
                callback.invoke(origin, hasPerm(Manifest.permission.ACCESS_FINE_LOCATION), false);
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                List<String> grant = new ArrayList<>();
                for (String resource : request.getResources()) {
                    if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)
                            && hasPerm(Manifest.permission.RECORD_AUDIO)) {
                        grant.add(resource);
                    } else if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)
                            && hasPerm(Manifest.permission.CAMERA)) {
                        grant.add(resource);
                    }
                }
                if (grant.isEmpty()) {
                    request.deny();
                } else {
                    request.grant(grant.toArray(new String[0]));
                }
            }
        });

        webView.loadUrl("http://127.0.0.1:" + port + "/index.html");
    }

    private boolean hasPerm(String perm) {
        return checkSelfPermission(perm) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestNeededPermissions() {
        List<String> needed = new ArrayList<>();
        for (String p : RUNTIME_PERMS) {
            if (!hasPerm(p)) needed.add(p);
        }
        if (!needed.isEmpty()) {
            requestPermissions(needed.toArray(new String[0]), 1);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) webView.destroy();
        if (server != null) server.stop();
        super.onDestroy();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        }
    }
}
