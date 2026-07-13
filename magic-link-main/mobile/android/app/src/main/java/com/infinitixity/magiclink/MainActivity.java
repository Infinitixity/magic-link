package com.infinitixity.magiclink;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.Toast;

public class MainActivity extends Activity {
    private static final int MICROPHONE_PERMISSION = 42;
    private static final String PREFS = "magic_link";
    private static final String SERVER_URL = "server_url";
    private static final String DEFAULT_URL = "http://10.42.0.1";

    private WebView webView;
    private PermissionRequest pendingWebPermission;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(7, 16, 19));

        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));

        Button serverButton = new Button(this);
        serverButton.setText("Server");
        serverButton.setTextSize(11);
        serverButton.setAllCaps(false);
        serverButton.setAlpha(0.78f);
        serverButton.setOnClickListener(view -> showServerDialog());

        FrameLayout.LayoutParams buttonParams = new FrameLayout.LayoutParams(
            dp(76),
            dp(40)
        );
        buttonParams.gravity = Gravity.END | Gravity.BOTTOM;
        buttonParams.setMargins(0, 0, dp(10), dp(10));
        root.addView(serverButton, buttonParams);

        webView.setOnLongClickListener(view -> {
            showServerDialog();
            return true;
        });

        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            serverButton.animate()
                .alpha(0f)
                .setDuration(250)
                .withEndAction(() -> serverButton.setVisibility(View.GONE))
                .start();
        }, 5000);

        setContentView(root);
        configureWebView();
        loadSavedServer();
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setDatabaseEnabled(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> handleWebPermission(request));
            }

            @Override
            public void onPermissionRequestCanceled(PermissionRequest request) {
                if (pendingWebPermission == request) {
                    pendingWebPermission = null;
                }
            }
        });
    }

    private void handleWebPermission(PermissionRequest request) {
        boolean wantsAudio = false;
        for (String resource : request.getResources()) {
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                wantsAudio = true;
                break;
            }
        }

        if (!wantsAudio) {
            request.deny();
            return;
        }

        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
            return;
        }

        pendingWebPermission = request;
        requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MICROPHONE_PERMISSION);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode != MICROPHONE_PERMISSION || pendingWebPermission == null) {
            return;
        }

        if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            pendingWebPermission.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
        } else {
            pendingWebPermission.deny();
            Toast.makeText(this, "Microphone permission is needed for Radio mode.", Toast.LENGTH_LONG).show();
        }

        pendingWebPermission = null;
    }

    private void loadSavedServer() {
        SharedPreferences preferences = getSharedPreferences(PREFS, MODE_PRIVATE);
        loadUrl(preferences.getString(SERVER_URL, DEFAULT_URL));
    }

    private void loadUrl(String value) {
        String url = value == null ? DEFAULT_URL : value.trim();
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }

        getSharedPreferences(PREFS, MODE_PRIVATE)
            .edit()
            .putString(SERVER_URL, url)
            .apply();

        webView.loadUrl(url);
    }

    private void showServerDialog() {
        EditText input = new EditText(this);
        input.setSingleLine(true);
        input.setText(getSharedPreferences(PREFS, MODE_PRIVATE).getString(SERVER_URL, DEFAULT_URL));
        input.setSelectAllOnFocus(true);
        input.setPadding(dp(18), dp(8), dp(18), dp(8));

        new AlertDialog.Builder(this)
            .setTitle("Magic Link server")
            .setMessage("Use the Pi address or your HTTPS Cloudflare link.")
            .setView(input)
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Connect", (dialog, which) -> loadUrl(input.getText().toString()))
            .show();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
