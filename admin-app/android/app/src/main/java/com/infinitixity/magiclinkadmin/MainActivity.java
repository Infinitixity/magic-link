package com.infinitixity.magiclinkadmin;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.Toast;

public class MainActivity extends Activity {
    private static final String PREFS = "magic_link_admin";
    private static final String SERVER_URL = "server_url";
    private static final String DEFAULT_REDIRECT_URL = "https://magic-link-redirector.pages.dev";

    private WebView webView;
    private SharedPreferences prefs;
    private boolean adminRedirectDone = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(7, 16, 19));

        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));

        Button serverButton = new Button(this);
        serverButton.setText("Server");
        serverButton.setAllCaps(false);
        serverButton.setOnClickListener((view) -> showServerDialog());

        FrameLayout.LayoutParams buttonParams = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            Gravity.BOTTOM | Gravity.END
        );
        buttonParams.setMargins(0, 0, dp(16), dp(16));
        root.addView(serverButton, buttonParams);

        setContentView(root);
        configureWebView();

        String savedUrl = prefs.getString(SERVER_URL, DEFAULT_REDIRECT_URL);
        if (savedUrl == null || savedUrl.trim().isEmpty()) {
            showServerDialog();
        } else {
            loadServer(savedUrl);
        }
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                String adminUrl = adminUrlFromTryCloudflare(url);
                if (adminUrl != null) {
                    adminRedirectDone = true;
                    view.loadUrl(adminUrl);
                    return true;
                }

                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                maybeOpenAdmin(url);
            }
        });
    }

    private void showServerDialog() {
        EditText input = new EditText(this);
        input.setSingleLine(true);
        input.setHint("https://your-page-or-trycloudflare-link");
        input.setText(prefs.getString(SERVER_URL, DEFAULT_REDIRECT_URL));
        input.setSelectAllOnFocus(true);

        new AlertDialog.Builder(this)
            .setTitle("Admin server link")
            .setMessage("Paste your redirect link. The app will wait until it reaches a trycloudflare link, then open /admin.html.")
            .setView(input)
            .setPositiveButton("Connect", (dialog, which) -> {
                String url = normalizeUrl(input.getText().toString());
                if (url.isEmpty()) {
                    Toast.makeText(this, "Enter a server link.", Toast.LENGTH_SHORT).show();
                    return;
                }

                prefs.edit().putString(SERVER_URL, url).apply();
                loadServer(url);
            })
            .setNegativeButton("Cancel", null)
            .show();
    }

    private void loadServer(String url) {
        adminRedirectDone = false;
        webView.loadUrl(normalizeUrl(url));
    }

    private void maybeOpenAdmin(String url) {
        if (adminRedirectDone || url == null) {
            return;
        }

        Uri uri = Uri.parse(url);
        String adminUrl = adminUrlFromTryCloudflare(url);
        if (adminUrl == null) {
            return;
        }

        adminRedirectDone = true;
        webView.loadUrl(adminUrl);
    }

    private String adminUrlFromTryCloudflare(String url) {
        Uri uri = Uri.parse(url);
        String host = uri.getHost();
        if (host == null || !host.endsWith("trycloudflare.com")) {
            return null;
        }

        String path = uri.getPath();
        if ("/admin.html".equals(path)) {
            return null;
        }

        return uri.buildUpon()
            .path("/admin.html")
            .query(null)
            .fragment(null)
            .build()
            .toString();
    }

    private String normalizeUrl(String value) {
        String url = value == null ? "" : value.trim();
        if (url.isEmpty()) {
            return "";
        }

        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }

        return url;
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
