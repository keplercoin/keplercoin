package kpl.http;

import kpl.Account;
import kpl.db.DbIterator;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.JSONStreamAware;

import javax.servlet.http.HttpServletRequest;

public class GetAllAccount  extends APIServlet.APIRequestHandler {

    static final GetAllAccount instance = new GetAllAccount();

    private GetAllAccount() {
        super(new APITag[] {APITag.AE}, "firstIndex", "lastIndex");
    }

    @Override
    protected JSONStreamAware processRequest(HttpServletRequest req) {

        int firstIndex = ParameterParser.getFirstIndex(req);
        int lastIndex = ParameterParser.getLastIndex(req);


        JSONObject response = new JSONObject();
        JSONArray accountsJSONArray = new JSONArray();
        response.put("accounts", accountsJSONArray);
        try (DbIterator<Account> accounts = Account.getAllAccount(firstIndex, lastIndex)) {
            while (accounts.hasNext()) {
                accountsJSONArray.add(JSONData.account(accounts.next()));
            }
        }
        return response;
    }
}