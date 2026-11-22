package io.github.minhcell.baihattang;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.media.MediaCodec;
import android.media.MediaCodecInfo;
import android.media.MediaFormat;
import android.media.MediaMuxer;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.core.content.FileProvider;
import androidx.webkit.WebViewAssetLoader;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.ByteBuffer;

public class MainActivity extends Activity {
    private static final String START = "https://appassets.androidplatform.net/assets/www/index.html";
    private WebView web;
    private final Handler ui = new Handler(Looper.getMainLooper());

    // file đang nhận từ JS
    private ByteArrayOutputStream buf;
    private String fName = "bai_hat", fMime = "application/octet-stream";

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        Window w = getWindow();
        w.setStatusBarColor(Color.parseColor("#120A1F"));
        w.addFlags(WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED);

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#120A1F"));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);
        s.setSupportZoom(false);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                return loader.shouldInterceptRequest(r.getUrl());
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if ("appassets.androidplatform.net".equals(u.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) {}
                return true;
            }
        });
        web.addJavascriptInterface(new Bridge(), "Android");
        setContentView(web);
        web.loadUrl(START);
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.handleBack && window.handleBack()", v -> {
            if (!"true".equals(v)) MainActivity.super.onBackPressed();
        });
    }

    @Override
    protected void onPause() { super.onPause(); web.evaluateJavascript("window.onAppPause && window.onAppPause()", null); }

    private void js(final String code) { ui.post(() -> web.evaluateJavascript(code, null)); }
    private static String q(String s) { return JSONObject.quote(s == null ? "" : s); }
    private void toast(final String m) { ui.post(() -> Toast.makeText(this, m, Toast.LENGTH_SHORT).show()); }

    // ===== Lưu vào bộ nhớ máy =====
    private String saveBytes(byte[] data, String name, String mime) throws Exception {
        boolean audio = mime.startsWith("audio");
        if (Build.VERSION.SDK_INT >= 29) {
            ContentResolver cr = getContentResolver();
            ContentValues v = new ContentValues();
            v.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
            v.put(MediaStore.MediaColumns.MIME_TYPE, mime);
            String dir = (audio ? Environment.DIRECTORY_MUSIC : Environment.DIRECTORY_DOWNLOADS) + "/BaiHatTang";
            v.put(MediaStore.MediaColumns.RELATIVE_PATH, dir);
            Uri col = audio ? MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
                    : MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
            Uri u = cr.insert(col, v);
            if (u == null) throw new Exception("Không tạo được file");
            try (OutputStream os = cr.openOutputStream(u)) {
                if (os == null) throw new Exception("Không ghi được file");
                os.write(data);
            }
            return "Đã lưu vào " + dir + "/" + name;
        } else {
            File d = getExternalFilesDir(audio ? Environment.DIRECTORY_MUSIC : Environment.DIRECTORY_DOWNLOADS);
            if (d == null) d = getFilesDir();
            if (!d.exists()) d.mkdirs();
            File f = new File(d, name);
            try (FileOutputStream os = new FileOutputStream(f)) { os.write(data); }
            return "Đã lưu: " + f.getAbsolutePath();
        }
    }

    private File cacheFile(String name) {
        File d = new File(getCacheDir(), "share");
        if (!d.exists()) d.mkdirs();
        File[] old = d.listFiles();
        if (old != null) for (File o : old) if (System.currentTimeMillis() - o.lastModified() > 3600_000L) o.delete();
        return new File(d, name);
    }

    private void shareFile(File f, String mime) {
        Uri u = FileProvider.getUriForFile(this, getPackageName() + ".files", f);
        Intent i = new Intent(Intent.ACTION_SEND);
        i.setType(mime);
        i.putExtra(Intent.EXTRA_STREAM, u);
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        final Intent ch = Intent.createChooser(i, "Gửi bài hát qua…");
        ch.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        ui.post(() -> startActivity(ch));
    }

    private static byte[] readAll(File f) throws Exception {
        try (InputStream in = new FileInputStream(f)) {
            ByteArrayOutputStream bo = new ByteArrayOutputStream((int) f.length());
            byte[] b = new byte[1 << 16]; int n;
            while ((n = in.read(b)) > 0) bo.write(b, 0, n);
            return bo.toByteArray();
        }
    }

    // ===== Mã hóa PCM 16-bit -> AAC (.m4a) bằng bộ mã hóa của Android =====
    private void encodeAac(byte[] pcm, int sr, int ch, File out) throws Exception {
        MediaFormat fmt = MediaFormat.createAudioFormat(MediaFormat.MIMETYPE_AUDIO_AAC, sr, ch);
        fmt.setInteger(MediaFormat.KEY_AAC_PROFILE, MediaCodecInfo.CodecProfileLevel.AACObjectLC);
        fmt.setInteger(MediaFormat.KEY_BIT_RATE, 160000);
        fmt.setInteger(MediaFormat.KEY_MAX_INPUT_SIZE, 16384);
        MediaCodec codec = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_AUDIO_AAC);
        codec.configure(fmt, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE);
        codec.start();
        MediaMuxer mux = new MediaMuxer(out.getAbsolutePath(), MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4);
        MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
        int track = -1, pos = 0, frame = ch * 2;
        boolean inDone = false, outDone = false, started = false;
        long guard = System.currentTimeMillis();
        try {
            while (!outDone) {
                if (System.currentTimeMillis() - guard > 120_000) throw new Exception("Mã hóa quá lâu");
                if (!inDone) {
                    int ii = codec.dequeueInputBuffer(5000);
                    if (ii >= 0) {
                        ByteBuffer ib = codec.getInputBuffer(ii);
                        ib.clear();
                        int n = Math.min(ib.remaining(), pcm.length - pos);
                        n -= n % frame;
                        long pts = (long) (pos / frame) * 1_000_000L / sr;
                        if (n <= 0) {
                            codec.queueInputBuffer(ii, 0, 0, pts, MediaCodec.BUFFER_FLAG_END_OF_STREAM);
                            inDone = true;
                        } else {
                            ib.put(pcm, pos, n);
                            codec.queueInputBuffer(ii, 0, n, pts, 0);
                            pos += n;
                        }
                    }
                }
                int oi = codec.dequeueOutputBuffer(info, 5000);
                if (oi == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                    track = mux.addTrack(codec.getOutputFormat());
                    mux.start(); started = true;
                } else if (oi >= 0) {
                    ByteBuffer ob = codec.getOutputBuffer(oi);
                    if ((info.flags & MediaCodec.BUFFER_FLAG_CODEC_CONFIG) != 0) info.size = 0;
                    if (info.size > 0 && started && ob != null) {
                        ob.position(info.offset); ob.limit(info.offset + info.size);
                        mux.writeSampleData(track, ob, info);
                    }
                    codec.releaseOutputBuffer(oi, false);
                    if ((info.flags & MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) outDone = true;
                }
            }
        } finally {
            try { codec.stop(); } catch (Exception ignored) {}
            codec.release();
            try { if (started) mux.stop(); } catch (Exception ignored) {}
            mux.release();
        }
    }

    // ===== Cầu nối cho JavaScript =====
    class Bridge {
        @JavascriptInterface public boolean isApp() { return true; }

        @JavascriptInterface public void toast(String m) { MainActivity.this.toast(m); }

        @JavascriptInterface public void copy(String t) {
            ui.post(() -> {
                ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("Lời bài hát", t));
            });
        }

        @JavascriptInterface public void fileBegin(String name, String mime) {
            fName = name; fMime = mime; buf = new ByteArrayOutputStream(1 << 20);
        }

        @JavascriptInterface public void fileChunk(String b64) {
            byte[] d = Base64.decode(b64, Base64.DEFAULT);
            buf.write(d, 0, d.length);
        }

        @JavascriptInterface public String fileSave() {
            try { String r = saveBytes(buf.toByteArray(), fName, fMime); buf = null; return r; }
            catch (Throwable e) { return "Lỗi lưu: " + e.getMessage(); }
        }

        @JavascriptInterface public String fileShare() {
            try {
                File f = cacheFile(fName);
                try (FileOutputStream os = new FileOutputStream(f)) { buf.writeTo(os); }
                buf = null;
                shareFile(f, fMime);
                return "";
            } catch (Throwable e) { return "Lỗi chia sẻ: " + e.getMessage(); }
        }

        // dữ liệu đã gửi là PCM 16-bit xen kẽ; mã hóa thành .m4a rồi lưu / chia sẻ
        @JavascriptInterface public void pcmEncode(final String name, final int sr, final int ch, final String action) {
            final byte[] pcm = buf.toByteArray();
            buf = null;
            new Thread(() -> {
                String msg;
                try {
                    File f = cacheFile(name);
                    encodeAac(pcm, sr, ch, f);
                    if ("share".equals(action)) { shareFile(f, "audio/mp4"); msg = ""; }
                    else msg = saveBytes(readAll(f), name, "audio/mp4");
                } catch (Throwable e) {
                    msg = "ERR:" + e.getMessage();
                }
                js("window.__nativeDone && window.__nativeDone(" + q(msg) + ")");
            }).start();
        }
    }
}
