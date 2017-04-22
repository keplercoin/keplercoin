package kpl.http;

import kpl.Kpl;
import org.json.simple.JSONObject;
import org.json.simple.JSONStreamAware;
import javax.servlet.http.HttpServletRequest;

public class AppLanguage extends APIServlet.APIRequestHandler {
    static final AppLanguage instance = new AppLanguage();
    private AppLanguage() {
        super(new APITag[] {APITag.INFO});
    }

    @Override
    protected JSONStreamAware processRequest(HttpServletRequest req) {

        JSONObject response = new JSONObject();
        response.put("language", System.getProperty("user.language"));

        return response;
    }

    @Override
    protected boolean allowRequiredBlockParameters() {
        return false;
    }
}
