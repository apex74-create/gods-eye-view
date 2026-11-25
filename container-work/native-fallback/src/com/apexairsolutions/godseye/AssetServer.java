package com.apexairsolutions.godseye;

import android.content.res.AssetManager;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URLDecoder;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Minimal loopback HTTP server that serves the bundled web app from
 * assets/www. The God's Eye View build references its assets by absolute
 * path (/assets/..., /cesium/...), so the container serves it from a real
 * http://127.0.0.1 origin — the same approach Capacitor's local server
 * takes — instead of file://, which would break those paths, the Cesium
 * workers and fetch() calls.
 */
public class AssetServer {
    private final AssetManager assets;
    private final String root;
    private ServerSocket socket;
    private ExecutorService pool;
    private volatile boolean running;

    private static final Map<String, String> MIME = new HashMap<>();
    static {
        MIME.put("html", "text/html; charset=utf-8");
        MIME.put("js", "text/javascript; charset=utf-8");
        MIME.put("mjs", "text/javascript; charset=utf-8");
        MIME.put("css", "text/css; charset=utf-8");
        MIME.put("json", "application/json; charset=utf-8");
        MIME.put("webmanifest", "application/manifest+json; charset=utf-8");
        MIME.put("wasm", "application/wasm");
        MIME.put("png", "image/png");
        MIME.put("jpg", "image/jpeg");
        MIME.put("jpeg", "image/jpeg");
        MIME.put("gif", "image/gif");
        MIME.put("svg", "image/svg+xml");
        MIME.put("webp", "image/webp");
        MIME.put("ico", "image/x-icon");
        MIME.put("woff", "font/woff");
        MIME.put("woff2", "font/woff2");
        MIME.put("ttf", "font/ttf");
        MIME.put("glb", "model/gltf-binary");
        MIME.put("gltf", "model/gltf+json");
        MIME.put("bin", "application/octet-stream");
        MIME.put("txt", "text/plain; charset=utf-8");
        MIME.put("xml", "application/xml; charset=utf-8");
        MIME.put("czml", "application/json; charset=utf-8");
        MIME.put("kml", "application/vnd.google-earth.kml+xml");
        MIME.put("terrain", "application/octet-stream");
        MIME.put("b3dm", "application/octet-stream");
        MIME.put("pnts", "application/octet-stream");
        MIME.put("i3dm", "application/octet-stream");
        MIME.put("cmpt", "application/octet-stream");
        MIME.put("parquet", "application/octet-stream");
    }

    public AssetServer(AssetManager assets, String root) {
        this.assets = assets;
        this.root = root;
    }

    /** Starts the server on an ephemeral loopback port; returns the port. */
    public int start() throws IOException {
        socket = new ServerSocket(0, 50, InetAddress.getByName("127.0.0.1"));
        pool = Executors.newCachedThreadPool();
        running = true;
        Thread accept = new Thread(() -> {
            while (running) {
                try {
                    Socket client = socket.accept();
                    pool.execute(() -> handle(client));
                } catch (IOException e) {
                    if (running) {
                        // transient accept failure; keep serving
                    }
                }
            }
        }, "asset-server-accept");
        accept.setDaemon(true);
        accept.start();
        return socket.getLocalPort();
    }

    public void stop() {
        running = false;
        try { if (socket != null) socket.close(); } catch (IOException ignored) {}
        if (pool != null) pool.shutdownNow();
    }

    private void handle(Socket client) {
        try (Socket c = client) {
            c.setSoTimeout(30000);
            BufferedReader in = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"));
            String requestLine = in.readLine();
            if (requestLine == null) return;
            // Drain headers; this server needs none of them.
            String line;
            while ((line = in.readLine()) != null && !line.isEmpty()) { /* skip */ }
            String[] parts = requestLine.split(" ");
            if (parts.length < 2) return;
            String method = parts[0];
            String path = parts[1];
            int q = path.indexOf('?');
            if (q >= 0) path = path.substring(0, q);
            path = URLDecoder.decode(path, "UTF-8");
            if (path.contains("..")) { sendStatus(c, 403, "Forbidden"); return; }
            if (path.equals("/") || path.isEmpty()) path = "/index.html";

            String assetPath = root + path;
            InputStream body;
            try {
                body = assets.open(assetPath);
            } catch (IOException notFound) {
                // SPA-style fallback: unknown non-file routes get the shell.
                if (!path.contains(".")) {
                    try {
                        body = assets.open(root + "/index.html");
                        assetPath = root + "/index.html";
                    } catch (IOException e) {
                        sendStatus(c, 404, "Not Found");
                        return;
                    }
                } else {
                    sendStatus(c, 404, "Not Found");
                    return;
                }
            }
            String ext = "";
            int dot = assetPath.lastIndexOf('.');
            if (dot >= 0) ext = assetPath.substring(dot + 1).toLowerCase();
            String type = MIME.getOrDefault(ext, "application/octet-stream");
            OutputStream out = c.getOutputStream();
            String head = "HTTP/1.1 200 OK\r\n"
                    + "Content-Type: " + type + "\r\n"
                    + "Cache-Control: no-cache\r\n"
                    + "Access-Control-Allow-Origin: *\r\n"
                    + "Connection: close\r\n\r\n";
            out.write(head.getBytes("UTF-8"));
            if (!method.equals("HEAD")) {
                byte[] buf = new byte[65536];
                int n;
                try (InputStream b = body) {
                    while ((n = b.read(buf)) != -1) out.write(buf, 0, n);
                }
            } else {
                body.close();
            }
            out.flush();
        } catch (IOException ignored) {
            // client went away mid-response; nothing to do
        }
    }

    private void sendStatus(Socket c, int code, String text) throws IOException {
        OutputStream out = c.getOutputStream();
        String body = code + " " + text;
        String head = "HTTP/1.1 " + body + "\r\nContent-Type: text/plain\r\n"
                + "Content-Length: " + body.length() + "\r\nConnection: close\r\n\r\n";
        out.write(head.getBytes("UTF-8"));
        out.write(body.getBytes("UTF-8"));
        out.flush();
    }
}
