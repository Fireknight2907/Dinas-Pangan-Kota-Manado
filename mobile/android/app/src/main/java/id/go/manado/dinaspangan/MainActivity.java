package id.go.manado.dinaspangan;

import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends BridgeActivity {
    private WebView activePrintWebView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().addJavascriptInterface(new SipatokaanNativeBridge(), "SipatokaanAndroid");
        }
    }

    private class SipatokaanNativeBridge {
        @JavascriptInterface
        public boolean isNativeReady() {
            return true;
        }

        @JavascriptInterface
        public void printHtml(final String jobName, final String htmlContent) {
            runOnUiThread(() -> {
                try {
                    String safeTitle = (jobName != null && !jobName.trim().isEmpty())
                        ? jobName.trim()
                        : "Laporan_SIPATOKAAN";

                    WebView printView = new WebView(MainActivity.this);
                    printView.getSettings().setJavaScriptEnabled(false);
                    printView.getSettings().setAllowFileAccess(true);
                    printView.setWebViewClient(new WebViewClient() {
                        @Override
                        public void onPageFinished(WebView view, String url) {
                            try {
                                PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                                if (printManager != null) {
                                    PrintDocumentAdapter adapter = view.createPrintDocumentAdapter(safeTitle);
                                    PrintAttributes attrs = new PrintAttributes.Builder()
                                        .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                                        .setResolution(new PrintAttributes.Resolution("pdf", "pdf", 300, 300))
                                        .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                                        .build();
                                    printManager.print(safeTitle, adapter, attrs);
                                } else {
                                    Toast.makeText(MainActivity.this, "Layanan cetak Android tidak tersedia.", Toast.LENGTH_LONG).show();
                                }
                            } catch (Exception ex) {
                                Toast.makeText(MainActivity.this, "Gagal membuka cetak PDF: " + ex.getMessage(), Toast.LENGTH_LONG).show();
                            }
                            activePrintWebView = null;
                        }
                    });
                    activePrintWebView = printView;
                    printView.loadDataWithBaseURL("https://localhost/", htmlContent, "text/html", "UTF-8", null);
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Gagal menyiapkan dokumen cetak: " + e.getMessage(), Toast.LENGTH_LONG).show();
                }
            });
        }

        @JavascriptInterface
        public void saveAndShareFile(final String fileName, final String mimeType, final String base64Data) {
            runOnUiThread(() -> {
                try {
                    String safeName = (fileName != null && !fileName.trim().isEmpty())
                        ? fileName.replaceAll("[^a-zA-Z0-9._-]", "_")
                        : "Berkas_SIPATOKAAN.bin";
                    String safeMime = (mimeType != null && !mimeType.trim().isEmpty())
                        ? mimeType
                        : "application/octet-stream";

                    byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);

                    // 1. Simpan permanen ke folder Download/SIPATOKAAN (Android 10+ via MediaStore tanpa izin tambahan)
                    boolean tersimpanDownloads = false;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        try {
                            ContentValues values = new ContentValues();
                            values.put(MediaStore.Downloads.DISPLAY_NAME, safeName);
                            values.put(MediaStore.Downloads.MIME_TYPE, safeMime);
                            values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/SIPATOKAAN");
                            Uri dlUri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                            if (dlUri != null) {
                                try (OutputStream os = getContentResolver().openOutputStream(dlUri)) {
                                    if (os != null) {
                                        os.write(bytes);
                                        os.flush();
                                        tersimpanDownloads = true;
                                    }
                                }
                            }
                        } catch (Exception ignored) {}
                    }

                    // 2. Simpan ke cache exports untuk Android Share / Buka langsung via FileProvider
                    File exportDir = new File(getCacheDir(), "exports");
                    if (!exportDir.exists()) exportDir.mkdirs();
                    File outFile = new File(exportDir, safeName);
                    try (FileOutputStream fos = new FileOutputStream(outFile)) {
                        fos.write(bytes);
                        fos.flush();
                    }

                    if (tersimpanDownloads) {
                        Toast.makeText(
                            MainActivity.this,
                            "Tersimpan di Download/SIPATOKAAN/" + safeName,
                            Toast.LENGTH_LONG
                        ).show();
                    }

                    Uri contentUri = FileProvider.getUriForFile(
                        MainActivity.this,
                        getPackageName() + ".fileprovider",
                        outFile
                    );

                    Intent shareIntent = new Intent(Intent.ACTION_SEND);
                    shareIntent.setType(safeMime);
                    shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                    shareIntent.putExtra(Intent.EXTRA_SUBJECT, safeName);
                    shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                    Intent chooser = Intent.createChooser(shareIntent, "Simpan atau Bagikan: " + safeName);
                    startActivity(chooser);
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Gagal menyimpan berkas: " + e.getMessage(), Toast.LENGTH_LONG).show();
                }
            });
        }
    }
}
