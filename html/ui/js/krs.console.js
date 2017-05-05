/******************************************************************************
 * Copyright © 2013-2016 The KPL Core Developers.                             *
 *                                                                            *
 * See the AUTHORS.txt, DEVELOPER-AGREEMENT.txt and LICENSE.txt files at      *
 * the top-level directory of this distribution for the individual copyright  *
 * holder information and the developer policies on copyright and licensing.  *
 *                                                                            *
 * Unless otherwise agreed in a custom licensing agreement, no part of the    *
 * KPL software, including this file, may be copied, modified, propagated,    *
 * or distributed except according to the terms contained in the LICENSE.txt  *
 * file.                                                                      *
 *                                                                            *
 * Removal or modification of this copyright notice is prohibited.            *
 *                                                                            *
 ******************************************************************************/

/**
 * @depends {krs.js}
 */
var krs = (function (krs, $) {
    var level = 1;
    var java;

    krs.logConsole = function (msg, isDateIncluded, isDisplayTimeExact) {
        if (window.console) {
            try {
                var prefix = "";
                if (!isDateIncluded) {
                    prefix = new Date().format("isoDateTime") + " ";
                }
                var postfix = "";
                if (isDisplayTimeExact) {
                    postfix = " (" + krs.timeExact() + ")";
                }
                var line = prefix + msg + postfix;
                if (java) {
                    java.log(line);
                } else {
                    console.log(line);
                }
            } catch (e) {
                // IE11 when running in compatibility mode
            }

        }
    };

    krs.isLogConsole = function (msgLevel) {
        return msgLevel <= level;
    };

    krs.setLogConsoleLevel = function (logLevel) {
        level = logLevel;
    };

    krs.logProperty = function(property) {
        krs.logConsole(property + " = " + eval(property.escapeHTML()));
    };

    krs.logArrayContent = function(array) {
        var data = '[';
        for (var i=0; i<array.length; i++) {
            data += array[i];
            if (i < array.length - 1) {
                data += ", ";
            }
        }
        data += ']';
        krs.logConsole(data);
    };

    krs.timeExact = function () {
        return window.performance.now() ||
            window.performance.mozNow() ||
            window.performance.msNow() ||
            window.performance.oNow() ||
            window.performance.webkitNow() ||
            Date.now; // none found - fallback to browser default
    };

    krs.showConsole = function () {
        krs.console = window.open("", "console", "width=750,height=400,menubar=no,scrollbars=yes,status=no,toolbar=no,resizable=yes");
        $(krs.console.document.head).html("<title>" + $.t("console") + "</title><style type='text/css'>body { background:black; color:white; font-family:courier-new,courier;font-size:14px; } pre { font-size:14px; } #console { padding-top:15px; }</style>");
        $(krs.console.document.body).html("<div style='position:fixed;top:0;left:0;right:0;padding:5px;background:#efefef;color:black;'>" + $.t("console_opened") + "<div style='float:right;text-decoration:underline;color:blue;font-weight:bold;cursor:pointer;' onclick='document.getElementById(\"console\").innerHTML=\"\"'>clear</div></div><div id='console'></div>");
    };

    krs.addToConsole = function (url, type, data, response, error) {
        if (!krs.console) {
            return;
        }

        if (!krs.console.document || !krs.console.document.body) {
            krs.console = null;
            return;
        }

        url = url.replace(/&random=[\.\d]+/, "", url);

        krs.addToConsoleBody(url + " (" + type + ") " + new Date().toString(), "url");

        if (data) {
            if (typeof data == "string") {
                var d = krs.queryStringToObject(data);
                krs.addToConsoleBody(JSON.stringify(d, null, "\t"), "post");
            } else {
                krs.addToConsoleBody(JSON.stringify(data, null, "\t"), "post");
            }
        }

        if (error) {
            krs.addToConsoleBody(response, "error");
        } else {
            krs.addToConsoleBody(JSON.stringify(response, null, "\t"), (response.errorCode ? "error" : ""));
        }
    };

    krs.addToConsoleBody = function (text, type) {
        var color = "";

        switch (type) {
            case "url":
                color = "#29FD2F";
                break;
            case "post":
                color = "lightgray";
                break;
            case "error":
                color = "red";
                break;
        }
        if (krs.isLogConsole(10)) {
            krs.logConsole(text, true);
        }
        $(krs.console.document.body).find("#console").append("<pre" + (color ? " style='color:" + color + "'" : "") + ">" + text.escapeHTML() + "</pre>");
    };

    krs.queryStringToObject = function (qs) {
        qs = qs.split("&");

        if (!qs) {
            return {};
        }

        var obj = {};

        for (var i = 0; i < qs.length; ++i) {
            var p = qs[i].split('=');

            if (p.length != 2) {
                continue;
            }

            obj[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
        }

        if ("secretPhrase" in obj) {
            obj.secretPhrase = "***";
        }

        return obj;
    };

    return krs;
}(krs || {}, jQuery));