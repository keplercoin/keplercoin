package kpldesktop;

import javafx.application.Platform;
import kpl.Kpl;
import kpl.http.API;
import kpl.util.JSON;
import kpl.util.Logger;
import org.json.simple.JSONObject;

import java.awt.*;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Paths;

/**
 * The class itself and methods in this class are invoked from JavaScript therefore has to be public
 */
@SuppressWarnings("WeakerAccess")
public class JavaScriptBridge {

    public void log(String message) {
        Logger.logInfoMessage(message);
    }

    @SuppressWarnings("unused")
    public void openBrowser(String account) { //在浏览器中打开
        final String url = API.getWelcomePageUri().toString() + "?account=" + account;
        Platform.runLater(() -> {
            try {
                Desktop.getDesktop().browse(new URI(url));
            } catch (Exception e) {
                Logger.logInfoMessage("Cannot open " + API.getWelcomePageUri().toString() + " error " + e.getMessage());
            }
        });
    }

    @SuppressWarnings("unused")
    public String readContactsFile() {
        String fileName = "contacts.json";
        byte[] bytes;
        try {
            bytes = Files.readAllBytes(Paths.get(Kpl.getUserHomeDir(), fileName));
        } catch (IOException e) {
            Logger.logInfoMessage("Cannot read file " + fileName + " error " + e.getMessage());
            JSONObject response = new JSONObject();
            response.put("error", "contacts_file_not_found");
            response.put("file", fileName);
            response.put("folder", Kpl.getUserHomeDir());
            response.put("type", "1");
            return JSON.toJSONString(response);
        }
        try {
            return new String(bytes, "utf8");
        } catch (UnsupportedEncodingException e) {
            Logger.logInfoMessage("Cannot parse file " + fileName + " content error " + e.getMessage());
            JSONObject response = new JSONObject();
            response.put("error", "unsupported_encoding");
            response.put("type", "2");
            return JSON.toJSONString(response);
        }
    }

    public String getAdminPassword() {
        return API.adminPassword;
    }
}