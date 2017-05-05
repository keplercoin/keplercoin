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

//noinspection JSUnusedLocalSymbols
/**
 * @depends {krs.js}
 */
var krs = (function (krs, $, undefined) {

    var EXCHANGEABLE = 0x01;
    var CONTROLLABLE = 0x02;
    var RESERVABLE = 0x04;
    var CLAIMABLE = 0x08;
    var MINTABLE = 0x10;
    var NON_SHUFFLEABLE = 0x20;

    krs.isExchangeable = function (type) {
        return type & EXCHANGEABLE;
    };

    krs.isControllable = function (type) {
        return type & CONTROLLABLE;
    };

    krs.isReservable = function (type) {
        return type & RESERVABLE;
    };

    krs.isClaimable = function (type) {
        return type & CLAIMABLE;
    };

    krs.isMintable = function (type) {
        return type & MINTABLE;
    };

    krs.isNonShuffleable = function (type) {
        return type & NON_SHUFFLEABLE;
    };

    /* MONETARY SYSTEM PAGE */
    /* Monetary System Page Search capitalization */
    var search = $("#currency_search");
    search.find("input[name=q]").blur(function () {
        if (this.value && this.value != this.value.toLocaleUpperCase()) {
            this.value = this.value.toLocaleUpperCase();
        }
    });

    search.find("input[name=q]").keyup(function () {
        if (this.value && this.value != this.value.toLocaleUpperCase()) {
            this.value = this.value.toLocaleUpperCase();
        }
    });

    search.on("submit", function (e, data) {
        e.preventDefault();
        //refresh is true if data is refreshed automatically by the system (when a new block arrives)
        var refresh = false;
        if (data && data.refresh) {
            refresh = true;
        }
        krs.pageNumber = 1;
        var currencyCode = $.trim($("#currency_search").find("input[name=q]").val());
        $("#buy_currency_with_KPL").html($.t("buy_currency_param", { currency: currencyCode}));
        $("#buy_currency_offers").html($.t("offers_to_buy_currency_param", { currency: currencyCode}));
        $("#sell_currency_with_KPL").html($.t("sell_currency_param", { currency: currencyCode}));
        $("#sell_currency_offers").html($.t("offers_to_sell_currency_param", { currency: currencyCode}));
        $(".currency_code").html(String(currencyCode).escapeHTML());

        var currencyId = 0;
        async.waterfall([
            function(callback) {
                krs.sendRequest("getCurrency+", {
                    "code": currencyCode
                }, function (response) {
                    if (response && !response.errorDescription) {
                        $("#MSnoCode").hide();
                        $("#MScode").show();
                        $("#currency_account").html(krs.getAccountLink(response, "account"));
                        currencyId = response.currency;
                        $("#currency_id").html(krs.getTransactionLink(currencyId));
                        $("#currency_name").html(String(response.name).escapeHTML());
                        $("#currency_code").html(String(response.code).escapeHTML());
                        $("#currency_current_supply").html(krs.convertToQNTf(response.currentSupply, response.decimals).escapeHTML());
                        $("#currency_max_supply").html(krs.convertToQNTf(response.maxSupply, response.decimals).escapeHTML());
                        $("#currency_decimals").html(String(response.decimals).escapeHTML());
                        $("#currency_description").html(String(response.description).autoLink());
                        var buyCurrencyButton = $("#buy_currency_button");
                        buyCurrencyButton.data("currency", currencyId);
                        buyCurrencyButton.data("decimals", response.decimals);
                        var sellCurrencyButton = $("#sell_currency_button");
                        sellCurrencyButton.data("currency", currencyId);
                        sellCurrencyButton.data("decimals", response.decimals);
                        if (!refresh) {
                            var msLinksCallout = $("#ms_links_callout");
                            msLinksCallout.html("");
                            msLinksCallout.append("<a href='#' data-toggle='modal' data-target='#transfer_currency_modal' data-currency='" + String(response.currency).escapeHTML() + "' data-code='" + response.code + "' data-decimals='" + response.decimals + "'>" + $.t("transfer") + "</a>");
                            msLinksCallout.append(" | ");
                            msLinksCallout.append("<a href='#' data-toggle='modal' data-target='#publish_exchange_offer_modal' data-currency='" + String(response.currency).escapeHTML() + "' data-code='" + response.code + "' data-decimals='" + response.decimals + "'>" + $.t("offer") + "</a>");
                        }
                    } else {
                        $("#MSnoCode").show();
                        $("#MScode").hide();
                        $.growl(response.errorDescription.escapeHTML(), {
                            "type": "danger"
                        });
                    }
                    callback(null);
                });

            },
            function(callback) {
                krs.sendRequest("getAccountCurrencies+", {
                    "account": krs.accountRS,
                    "currency": currencyId,
                    "includeCurrencyInfo": true
                }, function (response) {
                    if (response.unconfirmedUnits) {
                        $("#your_currency_balance").html(krs.formatQuantity(response.unconfirmedUnits, response.decimals));
                    } else {
                        $("#your_currency_balance").html(0);
                    }
                    callback(null);
                });
            },
            function(callback) {
                krs.loadCurrencyOffers("buy", currencyId, refresh);
                krs.loadCurrencyOffers("sell", currencyId, refresh);
                krs.getExchangeRequests(currencyId, refresh);
                krs.getExchangeHistory(currencyId, refresh);
                if (krs.accountInfo.unconfirmedBalanceNQT == "0") {
                    $("#ms_your_KPL_balance").html("0");
                } else {
                    $("#ms_your_KPL_balance").html(krs.formatAmount(krs.accountInfo.unconfirmedBalanceNQT));
                }
                krs.pageLoaded();
                callback(null);
            }
        ], function (err, result) {});
    });

    /* Search on Currencies Page */
    $("#currencies_search").on("submit", function (e) {
        e.preventDefault();
        krs.pageNumber = 1;
        var requestAPI = "searchCurrencies+";
        var query = $.trim($("#currencies_search").find("input[name=searchquery]").val());
        if (query == "") requestAPI = "getAllCurrencies+";
        krs.sendRequest(requestAPI, {
            "query": query,
            "firstIndex": krs.pageNumber * krs.itemsPerPage - krs.itemsPerPage,
            "lastIndex": krs.pageNumber * krs.itemsPerPage
        }, function (response) {
            krs.hasMorePages = false;
            if (response.currencies && response.currencies.length) {
                if (response.currencies.length > krs.itemsPerPage) {
                    krs.hasMorePages = true;
                    response.currencies.pop();
                }
                var rows = krs.getCurrencyRows(response);
                krs.currenciesTableLayout();
                krs.dataLoaded(rows);
            } else {
                krs.dataLoaded();
            }
        }, false);
    });

    krs.getCurrencyRows = function (response) {
        var rows = "";
        var currentSupplyDecimals = krs.getNumberOfDecimals(response.currencies, "currentSupply", function(currency) {
            return krs.formatQuantity(currency.currentSupply, currency.decimals);
        });
        var maxSupplyDecimals = krs.getNumberOfDecimals(response.currencies, "maxSupply", function(currency) {
            return krs.formatQuantity(currency.maxSupply, currency.decimals);
        });
        for (var i = 0; i < response.currencies.length; i++) {
            var currency = response.currencies[i];
            var name = String(currency.name).escapeHTML();
            var currencyId = String(currency.currency).escapeHTML();
            var code = String(currency.code).escapeHTML();
            var resSupply = krs.convertToQNTf(currency.reserveSupply, currency.decimals);
            var decimals = String(currency.decimals).escapeHTML();
            var minReserve = String(currency.minReservePerUnitNQT).escapeHTML();
            var typeIcons = krs.getTypeIcons(currency.type);
            rows += "<tr>" +
            "<td>" + krs.getTransactionLink(currencyId, code) + "</td>" +
            "<td>" + name + "</td>" +
            "<td>" + typeIcons + "</td>" +
            "<td class = 'numeric'>" + krs.formatQuantity(currency.currentSupply, currency.decimals, false, currentSupplyDecimals) + "</td>" +
            "<td class = 'numeric'>" + krs.formatQuantity(currency.maxSupply, currency.decimals, false, maxSupplyDecimals) + "</td>" +
            "<td>";
            //noinspection BadExpressionStatementJS
            rows += "<a href='#' class='btn btn-xs btn-default' onClick='krs.goToCurrency(&quot;" + code + "&quot;)' " + (!krs.isExchangeable(currency.type) ? "disabled" : "") + ">" + $.t("exchange") + "</a> ";
            rows += "<a href='#' class='btn btn-xs btn-default' data-toggle='modal' data-target='#reserve_currency_modal' data-currency='" + currencyId + "' data-name='" + name + "' data-code='" + code + "' data-ressupply='" + resSupply + "' data-decimals='" + decimals + "' data-minreserve='" + minReserve + "' " + (currency.issuanceHeight > krs.lastBlockHeight && krs.isReservable(currency.type) ? "" : "disabled") + " >" + $.t("reserve") + "</a> ";
            rows += "</td></tr>";
        }
        return rows;
    };

    krs.getTypeIcons = function (type) {
        var typeIcons = "";
        if (krs.isExchangeable(type)) {
            typeIcons += "<i title='" + $.t('exchangeable') + "' class='fa fa-exchange'></i> ";
        }
        if (krs.isControllable(type)) {
            typeIcons += "<i title='" + $.t('controllable') + "' class='fa fa-sliders'></i> ";
        }
        if (krs.isReservable(type)) {
            typeIcons += "<i title='" + $.t('reservable') + "' class='fa fa-university'></i> ";
        }
        if (krs.isClaimable(type)) {
            typeIcons += "<i title='" + $.t('claimable') + "' class='ion-android-archive'></i> ";
        }
        if (krs.isMintable(type)) {
            typeIcons += "<i title='" + $.t('mintable') + "' class='fa fa-money'></i> ";
        }
        return typeIcons;
    };

    krs.currenciesTableLayout = function () {
        var currenciesTable = $('#currencies_table');
        currenciesTable.find('[data-i18n="type"]').show();
        currenciesTable.find('[data-i18n="supply"]').show();
        currenciesTable.find('[data-i18n="max_supply"]').show();
        currenciesTable.find('[data-i18n="units"]').hide();
    };

    function processOffers(offers, type, refresh) {
        if (offers && offers.length > krs.itemsPerPage) {
            krs.hasMorePages = true;
            offers.pop();
        }
        var offersTable = $("#ms_open_" + type + "_orders_table");
        if (offers && offers.length) {
            var rows = "";
            var decimals = parseInt($("#currency_decimals").text(), 10);
            var supplyDecimals = krs.getNumberOfDecimals(offers, "supply", function(offer) {
                return krs.convertToQNTf(offer.supply, decimals);
            });
            var limitDecimals = krs.getNumberOfDecimals(offers, "limit", function(offer) {
                return krs.convertToQNTf(offer.limit, decimals);
            });
            var rateNQTDecimals = krs.getNumberOfDecimals(offers, "rateNQT", function(offer) {
                return krs.formatOrderPricePerWholeQNT(offer.rateNQT, decimals);
            });
            for (i = 0; i < offers.length; i++) {
                var offer = offers[i];
                var rateNQT = offer.rateNQT;
                if (i == 0 && !refresh) {
                    $("#" + (type == "sell" ? "buy" : "sell") + "_currency_rate").val(krs.calculateOrderPricePerWholeQNT(rateNQT, decimals));
                }
                rows += "<tr>" +
                    "<td>" + krs.getTransactionLink(offer.offer, krs.getTransactionStatusIcon(offer), true) + "</td>" +
                    "<td>" + krs.getAccountLink(offer, "account") + "</td>" +
                    "<td class='numeric'>" + krs.formatQuantity(offer.supply, decimals, false, supplyDecimals) + "</td>" +
                    "<td class='numeric'>" + krs.formatQuantity(offer.limit, decimals, false, limitDecimals) + "</td>" +
                    "<td class='numeric'>" + krs.formatOrderPricePerWholeQNT(rateNQT, decimals, rateNQTDecimals) + "</td>" +
                    "</tr>";
            }
            offersTable.find("tbody").empty().append(rows);
        } else {
            offersTable.find("tbody").empty();
        }
        krs.dataLoadFinished(offersTable, !refresh);
    }

    krs.loadCurrencyOffers = function (type, currencyId, refresh) {
        async.parallel([
            function(callback) {
                krs.sendRequest("get" + type.capitalize() + "Offers+", {
                    "currency": currencyId, "availableOnly": "true",
                    "firstIndex": krs.pageNumber * krs.itemsPerPage - krs.itemsPerPage,
                    "lastIndex": krs.pageNumber * krs.itemsPerPage
                }, function (response) {
                    var offers = response["offers"];
                    if (!offers) {
                        offers = [];
                    }
                    callback(null, offers);
                })
            },
            function(callback) {
                krs.sendRequest("getExpected" + type.capitalize() + "Offers", {
                    "currency": currencyId
                }, function (response) {
                    var offers = response["offers"];
                    if (!offers) {
                        offers = [];
                    }
                    callback(null, offers);
                })
            }
        ],
        // invoked when both requests above has completed
        // the results array contains both offer lists
        function(err, results) {
            if (err) {
                krs.logConsole(err);
                return;
            }
            var offers = results[0].concat(results[1]);
            offers.sort(function (a, b) {
                if (type == "sell") {
                    return a.rateNQT - b.rateNQT;
                } else {
                    return b.rateNQT - a.rateNQT;
                }
            });
            processOffers(offers, type, refresh);
        });
    };

    krs.incoming.monetary_system = function () {
        search.trigger("submit", [{"refresh": true}]);
    };

    /* CURRENCY FOUNDERS MODEL */
    var foundersModal = $("#currency_founders_modal");
    foundersModal.on("show.bs.modal", function (e) {
        var $invoker = $(e.relatedTarget);

        var currencyId = $invoker.data("currency");
        var issueHeight = $invoker.data("issueheight");
        if (issueHeight > krs.lastBlockHeight) {
            $("#founders_blocks_active").html(issueHeight - krs.lastBlockHeight);
        } else {
            $("#founders_blocks_active").html("Active");
        }
        $("#founders_currency_code").html(String($invoker.data("code")).escapeHTML());

        krs.sendRequest("getCurrencyFounders", {
            "currency": currencyId
        }, function (response) {
            var rows = "";
            var decimals = $invoker.data("decimals"); // has to be numeric not string
            var minReservePerUnitNQT = new BigInteger(String($invoker.data("minreserve"))).multiply(new BigInteger("" + Math.pow(10, decimals)));
            var initialSupply = new BigInteger(String($invoker.data("initialsupply")));
            var resSupply = new BigInteger(String($invoker.data("ressupply")));
            var totalAmountReserved = BigInteger.ZERO;
            $("#founders_reserve_units").html(krs.formatQuantity(resSupply, decimals));
            $("#founders_issuer_units").html(krs.formatQuantity(initialSupply, decimals));
            if (response.founders && response.founders.length) {
                var amountPerUnitNQT = BigInteger.ZERO;
                for (var i = 0; i < response.founders.length; i++) {
                    amountPerUnitNQT = new BigInteger(response.founders[i].amountPerUnitNQT).multiply(new BigInteger("" + Math.pow(10, decimals)));
                    totalAmountReserved = totalAmountReserved.add(amountPerUnitNQT);
                }
                for (i = 0; i < response.founders.length; i++) {
                    var account = response.founders[i].accountRS;
                    amountPerUnitNQT = new BigInteger(response.founders[i].amountPerUnitNQT).multiply(new BigInteger("" + Math.pow(10, decimals)));
                    var percentage = krs.calculatePercentage(amountPerUnitNQT, minReservePerUnitNQT);
                    rows += "<tr>" +
                    "<td>" + krs.getAccountLink(response.founders[i], "account")+ "</td>" +
                    "<td>" + krs.convertToKPL(amountPerUnitNQT) + "</td>" +
                    "<td>" + krs.convertToKPL(amountPerUnitNQT.multiply(new BigInteger(krs.convertToQNTf(resSupply, decimals)))) + "</td>" +
                    "<td>" + krs.formatQuantity(resSupply.subtract(initialSupply).multiply(amountPerUnitNQT).divide(totalAmountReserved), decimals) + "</td>" +
                    "<td>" + percentage + "</td>" +
                    "</tr>";
                }
            } else {
                rows = "<tr><td colspan='5'>None</td></tr>";
            }
            rows += "<tr>" +
            "<td><b>Totals</b></td>" +
            "<td>" + krs.convertToKPL(totalAmountReserved) + "</td>" +
            "<td>" + krs.convertToKPL(totalAmountReserved.multiply(new BigInteger(krs.convertToQNTf(resSupply, decimals)))) + "</td>" +
            "<td>" + krs.formatQuantity(resSupply.subtract(initialSupply), decimals) + "</td>" +
            "<td>" + krs.calculatePercentage(totalAmountReserved, minReservePerUnitNQT) + "</td>" +
            "</tr>";
            var foundersTable = $("#currency_founders_table");
            foundersTable.find("tbody").empty().append(rows);
            krs.dataLoadFinished(foundersTable);
        });
    });

    foundersModal.on("hidden.bs.modal", function () {
        var foundersTable = $("#currency_founders_table");
        foundersTable.find("tbody").empty();
        foundersTable.parent().addClass("data-loading");
    });

    krs.getExchangeHistory = function (currencyId, refresh) {
        if (krs.currenciesTradeHistoryType == "my_exchanges") {
            krs.sendRequest("getExchanges+", {
                "currency": currencyId,
                "account": krs.accountRS,
                "includeCurrencyInfo": true,
                "firstIndex": krs.pageNumber * krs.itemsPerPage - krs.itemsPerPage,
                "lastIndex": krs.pageNumber * krs.itemsPerPage
            }, function (response) {
                var historyTable = $("#ms_exchanges_history_table");
                if (response.exchanges && response.exchanges.length) {
                    if (response.exchanges.length > krs.itemsPerPage) {
                        krs.hasMorePages = true;
                        response.exchanges.pop();
                    }
                    var rows = "";
                    var decimals = parseInt($("#currency_decimals").text(), 10);
                    var quantityDecimals = krs.getNumberOfDecimals(response.exchanges, "units", function(exchange) {
                        return krs.convertToQNTf(exchange.units, decimals);
                    });
                    var rateNQTDecimals = krs.getNumberOfDecimals(response.exchanges, "rateNQT", function(exchange) {
                        return krs.formatOrderPricePerWholeQNT(exchange.rateNQT, decimals);
                    });
                    var totalNQTDecimals = krs.getNumberOfDecimals(response.exchanges, "totalNQT", function(exchange) {
                        return krs.formatAmount(krs.calculateOrderTotalNQT(exchange.units, exchange.rateNQT));
                    });
                    for (var i = 0; i < response.exchanges.length; i++) {
                        var exchange = response.exchanges[i];
                        rows += "<tr>" +
                        "<td>" + krs.getTransactionLink(exchange.transaction, krs.formatTimestamp(exchange.timestamp)) + "</td>" +
                        "<td>" + krs.getAccountLink(exchange, "seller") + "</td>" +
                        "<td>" + krs.getAccountLink(exchange, "buyer") + "</td>" +
                        "<td class='numeric'>" + krs.formatQuantity(exchange.units, exchange.decimals, false, quantityDecimals) + "</td>" +
                        "<td class='numeric'>" + krs.formatOrderPricePerWholeQNT(exchange.rateNQT, exchange.decimals, rateNQTDecimals) + "</td>" +
                        "<td class='numeric'>" + krs.formatAmount(krs.calculateOrderTotalNQT(exchange.units, exchange.rateNQT), false, false, totalNQTDecimals) + "</td>" +
                        "</tr>";
                    }
                    historyTable.find("tbody").empty().append(rows);
                } else {
                    historyTable.find("tbody").empty();
                }
                krs.dataLoadFinished(historyTable, !refresh);
            });
        } else {
            krs.sendRequest("getExchanges+", {
                "currency": currencyId,
                "includeCurrencyInfo": true,
                "firstIndex": krs.pageNumber * krs.itemsPerPage - krs.itemsPerPage,
                "lastIndex": krs.pageNumber * krs.itemsPerPage
            }, function (response) {
                var historyTable = $("#ms_exchanges_history_table");
                if (response.exchanges && response.exchanges.length) {
                    if (response.exchanges.length > krs.itemsPerPage) {
                        krs.hasMorePages = true;
                        response.exchanges.pop();
                    }
                    var rows = "";
                    var decimals = parseInt($("#currency_decimals").text(), 10);
                    var quantityDecimals = krs.getNumberOfDecimals(response.exchanges, "units", function(exchange) {
                        return krs.formatQuantity(exchange.units, decimals);
                    });
                    var rateNQTDecimals = krs.getNumberOfDecimals(response.exchanges, "rateNQT", function(exchange) {
                        return krs.formatOrderPricePerWholeQNT(exchange.rateNQT, decimals);
                    });
                    var totalNQTDecimals = krs.getNumberOfDecimals(response.exchanges, "totalNQT", function(exchange) {
                        return krs.formatAmount(krs.calculateOrderTotalNQT(exchange.units, exchange.rateNQT));
                    });
                    for (var i = 0; i < response.exchanges.length; i++) {
                        var exchange = response.exchanges[i];
                        rows += "<tr>" +
                        "<td>" + krs.getTransactionLink(exchange.transaction, krs.formatTimestamp(exchange.timestamp)) + "</td>" +
                        "<td>" + krs.getAccountLink(exchange, "seller") + "</td>" +
                        "<td>" + krs.getAccountLink(exchange, "buyer") + "</td>" +
                        "<td class='numeric'>" + krs.formatQuantity(exchange.units, exchange.decimals, false, quantityDecimals) + "</td>" +
                        "<td class='numeric'>" + krs.formatOrderPricePerWholeQNT(exchange.rateNQT, exchange.decimals, rateNQTDecimals) + "</td>" +
                        "<td class='numeric'>" + krs.formatAmount(krs.calculateOrderTotalNQT(exchange.units, exchange.rateNQT), false, false, totalNQTDecimals) + "</td>" +
                        "</tr>";
                    }
                    historyTable.find("tbody").empty().append(rows);
                } else {
                    historyTable.find("tbody").empty();
                }
                krs.dataLoadFinished(historyTable, !refresh);
            });
        }
    };

    function processExchangeRequests(exchangeRequests, refresh) {
        var requestTable = $("#ms_exchange_requests_table");
        if (exchangeRequests && exchangeRequests.length) {
            if (exchangeRequests.length > krs.itemsPerPage) {
                krs.hasMorePages = true;
                exchangeRequests.pop();
            }
            var rows = "";
            var decimals = parseInt($("#currency_decimals").text(), 10);
            var quantityDecimals = krs.getNumberOfDecimals(exchangeRequests, "units", function(exchangeRequest) {
                return krs.formatQuantity(exchangeRequest.units, decimals);
            });
            var rateNQTDecimals = krs.getNumberOfDecimals(exchangeRequests, "rateNQT", function(exchangeRequest) {
                return krs.formatOrderPricePerWholeQNT(exchangeRequest.rateNQT, decimals);
            });
            var totalNQTDecimals = krs.getNumberOfDecimals(exchangeRequests, "totalNQT", function(exchangeRequest) {
                return krs.formatAmount(krs.calculateOrderTotalNQT(exchangeRequest.units, exchangeRequest.rateNQT));
            });
            for (i = 0; i < exchangeRequests.length; i++) {
                var exchangeRequest = exchangeRequests[i];
                var type = exchangeRequest.subtype == 5 ? "buy" : "sell";
                rows += "<tr class=confirmed>" +
                    "<td>" + krs.getTransactionLink(exchangeRequest.transaction, krs.getTransactionStatusIcon(exchangeRequest), true) + "</td>" +
                    "<td>" + krs.getBlockLink(exchangeRequest.height) + "</td>" +
                    "<td>" + type + "</td>" +
                    "<td class='numeric'>" + krs.formatQuantity(exchangeRequest.units, decimals, false, quantityDecimals) + "</td>" +
                    "<td class='numeric'>" + krs.formatOrderPricePerWholeQNT(exchangeRequest.rateNQT, decimals, rateNQTDecimals) + "</td>" +
                    "<td class='numeric'>" + krs.formatAmount(krs.calculateOrderTotalNQT(exchangeRequest.units, exchangeRequest.rateNQT), false, false, totalNQTDecimals) + "</td>" +
                    "</tr>";
            }
            requestTable.find("tbody").empty().append(rows);
        } else {
            requestTable.find("tbody").empty();
        }
        krs.dataLoadFinished(requestTable, !refresh);
    }

    krs.getExchangeRequests = function (currencyId, refresh) {
        async.parallel([
            function(callback) {
                krs.sendRequest("getAccountExchangeRequests+", {
                    "currency": currencyId,
                    "account": krs.accountRS,
                    "firstIndex": krs.pageNumber * krs.itemsPerPage - krs.itemsPerPage,
                    "lastIndex": krs.pageNumber * krs.itemsPerPage
                }, function (response) {
                    var requests = response["exchangeRequests"];
                    if (!requests) {
                        requests = [];
                    }
                    callback(null, requests);
                });
            },
            function(callback) {
                krs.sendRequest("getExpectedExchangeRequests", {
                    "currency": currencyId,
                    "account": krs.accountRS
                }, function (response) {
                    var requests = response["exchangeRequests"];
                    if (!requests) {
                        requests = [];
                    }
                    callback(null, requests);
                });
            }
        ],
        // invoked when both the requests above has completed
        // the results array contains both requests lists
        function(err, results) {
            if (err) {
                krs.logConsole(err);
                return;
            }
            var exchangeRequests = results[0].concat(results[1]);
            exchangeRequests.sort(function (a, b) {
                return b.height - a.height;
            });
            processExchangeRequests(exchangeRequests, refresh);
        });
    };

    /* Monetary System Buy/Sell boxes */
    $("#buy_currency_box .box-header, #sell_currency_box .box-header").click(function (e) {
        e.preventDefault();
        //Find the box parent
        var box = $(this).parents(".box").first();
        //Find the body and the footer
        var bf = box.find(".box-body, .box-footer");
        if (!box.hasClass("collapsed-box")) {
            box.addClass("collapsed-box");
            $(this).find(".btn i.fa").removeClass("fa-minus").addClass("fa-plus");
            bf.slideUp();
        } else {
            box.removeClass("collapsed-box");
            bf.slideDown();
            $(this).find(".btn i.fa").removeClass("fa-plus").addClass("fa-minus");
        }
    });

    /* Currency Order Model */
    $("#currency_order_modal").on("show.bs.modal", function (e) {
        var $invoker = $(e.relatedTarget);
        var exchangeType = $invoker.data("type");
        var currencyId = $invoker.data("currency");
        var currencyDecimals = parseInt($invoker.data("decimals"), 10);
        var unitsQNT = $invoker.data("units");
        var units = String($("#" + exchangeType + "_currency_units").val());
        var rateNQT = $invoker.data("rateNQT");
        var effectiveRate = $invoker.data("effectiveRate");
        var totalNQT = $invoker.data("totalNQT");
        var totalKPL = krs.formatAmount(totalNQT, false, true);
        var submitButton = $("#currency_order_modal_button");
        submitButton.html($.t(exchangeType + "_currency")).data("resetText", $.t(exchangeType + "_currency"));
        submitButton.prop('disabled', false);

        if (rateNQT == "0" || unitsQNT == "0") {
            $.growl($.t("error_unit_rate_required"), {
                "type": "danger"
            });
            return e.preventDefault();
        }

        var description;
        var tooltipTitle;
        if (exchangeType == "buy") {
            description = $.t("buy_currency_description", {
                "total": totalKPL,
                "quantity": krs.formatQuantity(unitsQNT, currencyDecimals, true),
                "currency_code": $("#currency_code").html().escapeHTML(),
                "rate": effectiveRate
            });
            tooltipTitle = $.t("buy_currency_description_help", {
                "rate": effectiveRate,
                "total_KPL": totalKPL
            });
        } else {
            description = $.t("sell_currency_description", {
                "total": totalKPL,
                "quantity": krs.formatQuantity(unitsQNT, currencyDecimals, true),
                "currency_code": $("#currency_code").html().escapeHTML(),
                "rate": effectiveRate
            });
            tooltipTitle = $.t("sell_currency_description_help", {
                "rate": effectiveRate,
                "total_KPL": totalKPL
            });
        }

        $("#currency_order_description").html(description);
        $("#currency_order_total").html(totalKPL + " KPL");

        var totalTooltip = $("#currency_order_total_tooltip");
        if (units != "1") {
            totalTooltip.show();
            totalTooltip.popover("destroy");
            totalTooltip.data("content", tooltipTitle);
            totalTooltip.popover({
                "content": tooltipTitle,
                "trigger": "hover"
            });
        } else {
            totalTooltip.hide();
        }

        $("#currency_order_type").val((exchangeType == "buy" ? "currencyBuy" : "currencySell"));
        $("#currency_order_currency").val(currencyId);
        $("#currency_order_units").val(unitsQNT);
        $("#currency_order_rate").val(rateNQT);
    });

    krs.forms.orderCurrency = function () {
        var orderType = $("#currency_order_type").val();

        return {
            "requestType": orderType,
            "successMessage": (orderType == "currencyBuy" ? $.t("success_buy_order_currency") : $.t("success_sell_order_currency")),
            "errorMessage": $.t("error_order_currency")
        };
    };

    $("#buy_currency_units_initial, #buy_currency_units_total, #buy_currency_offer_rate, #sell_currency_units_initial, #sell_currency_units_total, #sell_currency_offer_rate").keydown(function (e) {
        var decimals = parseInt($("#publish_exchange_offer_decimals").val(), 10);

        var charCode = !e.charCode ? e.which : e.charCode;
        if (krs.isControlKey(charCode) || e.ctrlKey || e.metaKey) {
            return;
        }
        var isUnitsField = /_units/i.test($(this).attr("id"));
        var maxFractionLength = (isUnitsField ? decimals : 8 - decimals);
        return krs.validateDecimals(maxFractionLength, charCode, $(this).val(), e);
    });

    var unitFields = $("#buy_currency_units, #sell_currency_units");
    unitFields.keydown(function (e) {
        var decimals = parseInt($("#currency_decimals").html(), 10);

        var charCode = !e.charCode ? e.which : e.charCode;
        if (krs.isControlKey(charCode) || e.ctrlKey || e.metaKey) {
            return;
        }
        var isUnitsField = /_units/i.test($(this).attr("id"));
        var maxFractionLength = (isUnitsField ? decimals : 8 - decimals);
        return krs.validateDecimals(maxFractionLength, charCode, $(this).val(), e);
    });

    unitFields.on("change", function() {
        var orderType = $(this).data("type").toLowerCase();
        var decimals = parseInt($("#currency_decimals").text(), 10);
        var units = krs.convertToQNT(String($("#" + orderType + "_currency_units").val()), decimals);
        krs.sendRequest("getAvailableTo" + krs.initialCaps(orderType), {
            "currency": $("#currency_id").text(),
            "units": units
        }, function (response) {
            var submitButton = $("#" + orderType + "_currency_button");
            var unitsField = $("#" + orderType + "_currency_units");
            var rateField = $("#" + orderType + "_currency_rate");
            var totalField = $("#" + orderType + "_currency_total");
            var effectiveRateField = $("#" + orderType + "_currency_effective_rate");
            if (response.errorCode) {
                unitsField.val("0");
                rateField.val("0");
                totalField.val("0");
                effectiveRateField.val("0");
                submitButton.prop('disabled', true);
                return;
            }
            var units = krs.convertToQNTf(response.units, decimals);
            unitsField.val(units);
            var rate = krs.calculateOrderPricePerWholeQNT(response.rateNQT, decimals);
            rateField.val(rate);
            var amount = krs.convertToKPL(response.amountNQT);
            totalField.val(amount);
            var effectiveRate = units == "0" ? "0" : krs.amountToPrecision(amount / units, 8 - decimals);
            effectiveRateField.val(effectiveRate);
            submitButton.data("units", response.units);
            submitButton.data("rateNQT", response.rateNQT);
            submitButton.data("effectiveRate", effectiveRate);
            submitButton.data("totalNQT", response.amountNQT);
            submitButton.prop('disabled', false);
        })
   	});

    /* CURRENCIES PAGE */
    krs.pages.currencies = function () {
        if (krs.currenciesPageType == "my_currencies") {
            krs.sendRequest("getAccountCurrencies+", {
                "account": krs.accountRS,
                "includeCurrencyInfo": true,
                "firstIndex": krs.pageNumber * krs.itemsPerPage - krs.itemsPerPage,
                "lastIndex": krs.pageNumber * krs.itemsPerPage
            }, function (response) {
                if (response.accountCurrencies && response.accountCurrencies.length) {
                    if (response.accountCurrencies.length > krs.itemsPerPage) {
                        krs.hasMorePages = true;
                        response.accountCurrencies.pop();
                    }
                    var rows = "";
                    var unitsDecimals = krs.getNumberOfDecimals(response.accountCurrencies, "unconfirmedUnits", function(accountCurrency) {
                        return krs.formatQuantity(accountCurrency.unconfirmedUnits, accountCurrency.decimals);
                    });
                    for (var i = 0; i < response.accountCurrencies.length; i++) {
                        var currency = response.accountCurrencies[i];
                        var currencyId = String(currency.currency).escapeHTML();
                        var code = String(currency.code).escapeHTML();
                        var name = String(currency.name).escapeHTML();
                        var decimals = String(currency.decimals).escapeHTML();
                        var typeIcons = krs.getTypeIcons(currency.type);
                        var isOfferEnabled = krs.isExchangeable(currency.type) && (!krs.isControllable(currency.type) || krs.account == currency.issuerAccount);
                        //noinspection HtmlUnknownAttribute,BadExpressionStatementJS
                        rows += "<tr>" +
                        "<td>" + krs.getTransactionLink(currencyId, code) + "</td>" +
                        "<td>" + currency.name + "</td>" +
                        "<td>" + typeIcons + "</td>" +
                        "<td class = 'numeric'>" + krs.formatQuantity(currency.unconfirmedUnits, currency.decimals, false, unitsDecimals) + "</td>" +
                        "<td>" +
                        "<a href='#' class='btn btn-xs btn-default' onClick='krs.goToCurrency(&quot;" + code + "&quot;)' " + (!krs.isExchangeable(currency.type) ? "disabled" : "") + ">" + $.t("exchange") + "</a> " +
                        "<a href='#' class='btn btn-xs btn-default' data-toggle='modal' data-target='#transfer_currency_modal' data-currency='" + String(currency.currency).escapeHTML() + "' data-code='" + code + "' data-decimals='" + decimals + "'>" + $.t("transfer") + "</a> " +
                        "<a href='#' class='btn btn-xs btn-default' data-toggle='modal' data-target='#publish_exchange_offer_modal' data-currency='" + String(currency.currency).escapeHTML() + "' data-code='" + code + "' data-decimals='" + decimals + "' " + (isOfferEnabled ? "" : "disabled") + " >" + $.t("offer") + "</a> " +
                        "<a href='#' class='btn btn-xs btn-default' data-toggle='modal' data-target='#claim_currency_modal' data-currency='" + currencyId + "' data-name='" + name + "' data-code='" + code + "' data-decimals='" + decimals + "' " + (currency.issuanceHeight <= krs.lastBlockHeight && krs.isClaimable(currency.type) ? "" : "disabled") + " >" + $.t("claim") + "</a> " +
                        "</td>" +
                        "</tr>";
                    }
                    var currenciesTable = $('#currencies_table');
                    currenciesTable.find('[data-i18n="type"]').show();
                    currenciesTable.find('[data-i18n="supply"]').hide();
                    currenciesTable.find('[data-i18n="max_supply"]').hide();
                    currenciesTable.find('[data-i18n="units"]').show();
                    krs.dataLoaded(rows);
                } else {
                    krs.dataLoaded();
                }
            });
        } else {
            krs.sendRequest("getAllCurrencies+", {
                "firstIndex": krs.pageNumber * krs.itemsPerPage - krs.itemsPerPage,
                "lastIndex": krs.pageNumber * krs.itemsPerPage
            }, function (response) {
                if (response.currencies && response.currencies.length) {
                    if (response.currencies.length > krs.itemsPerPage) {
                        krs.hasMorePages = true;
                        response.currencies.pop();
                    }
                    var rows = krs.getCurrencyRows(response);
                    krs.currenciesTableLayout();
                    krs.dataLoaded(rows);
                } else {
                    krs.dataLoaded();
                }
            });
        }
    };

    $("#currencies_page_type").find(".btn").click(function (e) {
        e.preventDefault();
        krs.currenciesPageType = $(this).data("type");

        var currenciesTable = $("#currencies_table");
        currenciesTable.find("tbody").empty();
        currenciesTable.parent().addClass("data-loading").removeClass("data-empty");
        krs.loadPage("currencies");
    });

    $("#ms_exchange_history_type").find(".btn").click(function (e) {
        e.preventDefault();
        krs.currenciesTradeHistoryType = $(this).data("type");

        var exchangeHistoryTable = $("#ms_exchanges_history_table");
        exchangeHistoryTable.find("tbody").empty();
        exchangeHistoryTable.parent().addClass("data-loading").removeClass("data-empty");
        krs.getExchangeHistory($("#currency_id").text(), false);
    });

    $("body").on("click", "a[data-goto-currency]", function (e) {
        e.preventDefault();

        var $visible_modal = $(".modal.in");

        if ($visible_modal.length) {
            $visible_modal.modal("hide");
        }

        krs.goToCurrency($(this).data("goto-currency"));
    });

    krs.goToCurrency = function (currency) {
        var currencySearch = $("#currency_search");
        currencySearch.find("input[name=q]").val(currency);
        currencySearch.submit();
        krs.goToPage("monetary_system");
    };

    /* Transfer Currency Model */
    var currencyCodeField = $("#transfer_currency_code");
    $("#transfer_currency_modal").on("show.bs.modal", function (e) {
        var $invoker = $(e.relatedTarget);

        var currency = $invoker.data("currency");
        var currencyCode = $invoker.data("code");
        var decimals = $invoker.data("decimals");

        $("#transfer_currency_currency").val(currency);
        $("#transfer_currency_decimals").val(decimals);
        if (currencyCode) {
            currencyCodeField.val(currencyCode);
            currencyCodeField.prop("readonly", true);
            $("#transfer_currency_units_code").html(String(currencyCode).escapeHTML());
            $("#transfer_currency_modal").find(".modal-title").html($.t("Transfer Currency"));
        } else {
            currencyCodeField.val('');
            currencyCodeField.prop("readonly", false);
            $("#transfer_currency_units_code").html('');
            $("#transfer_currency_modal").find(".modal-title").html($.t("Send Currency"));
        }
        $("#transfer_currency_available").html('');

        if (currency) {
            krs.updateAvailableCurrency(currency);
        }
    });

    currencyCodeField.blur(function () {
        if (!currencyCodeField.val() || currencyCodeField.val() == '') {
            return;
        }
        currencyCodeField.val(currencyCodeField.val().toUpperCase());
        krs.sendRequest("getCurrency", {
            "code": currencyCodeField.val()
        }, function (response) {
            var transferCurrencyModal = $("#transfer_currency_modal");
            if (response && !response.errorCode) {
                $("#transfer_currency_currency").val(response.currency);
                $("#transfer_currency_decimals").val(response.decimals);
                krs.updateAvailableCurrency(response.currency);
                $("#transfer_currency_units_code").html(String(response.code).escapeHTML());
                transferCurrencyModal.find(".error_message").hide();
            } else if (response.errorCode) {
                transferCurrencyModal.find(".error_message").html(response.errorDescription.escapeHTML());
                transferCurrencyModal.find(".error_message").show();
            }
        })
    });

    krs.updateAvailableCurrency = function (currency) {
        krs.sendRequest("getAccountCurrencies", {
            "currency": currency,
            "account": krs.accountRS,
            "includeCurrencyInfo": true
        }, function (response) {
            var availableCurrencyMessage = "None Available for Transfer";
            if (response.unconfirmedUnits && response.unconfirmedUnits != "0") {
                availableCurrencyMessage = $.t("available_units") + " " + krs.formatQuantity(response.unconfirmedUnits, response.decimals);
            }
            $("#transfer_currency_available").html(availableCurrencyMessage);
        })
    };

    /* Publish Exchange Offer Model */
    $("#publish_exchange_offer_modal").on("show.bs.modal", function (e) {
        var $invoker = $(e.relatedTarget);

        $("#publish_exchange_offer_currency").val($invoker.data("currency"));
        $("#publish_exchange_offer_decimals").val($invoker.data("decimals"));
        $(".currency_code").html(String($invoker.data("code")).escapeHTML());

        context = {
            labelText: "Expiration Height",
            labelI18n: "expiration_height",
            inputName: "expirationHeight",
            helpI18n: "expiration_height_help",
            initBlockHeight: krs.lastBlockHeight + 14 * 1440,
            changeHeightBlocks: 100
        };
        krs.initModalUIElement($(this), '.exchange_offer_expiration_height', 'block_height_modal_ui_element', context);

        krs.sendRequest("getAccountCurrencies", {
            "currency": $invoker.data("currency"),
            "account": krs.accountRS,
            "includeCurrencyInfo": true
        }, function (response) {
            var availableCurrencyMessage = " - None Available";
            if (response.unconfirmedUnits && response.unconfirmedUnits != "0") {
                availableCurrencyMessage = " - " + $.t("available_units") + " " + krs.formatQuantity(response.unconfirmedUnits, response.decimals);
            }
            $("#publish_exchange_available").html(availableCurrencyMessage);
        })

    });

    /* EXCHANGE HISTORY PAGE */
    krs.pages.exchange_history = function () {
        krs.sendRequest("getExchanges+", {
            "account": krs.accountRS,
            "includeCurrencyInfo": true,
            "firstIndex": krs.pageNumber * krs.itemsPerPage - krs.itemsPerPage,
            "lastIndex": krs.pageNumber * krs.itemsPerPage
        }, function (response) {
            if (response.exchanges && response.exchanges.length) {
                if (response.exchanges.length > krs.itemsPerPage) {
                    krs.hasMorePages = true;
                    response.exchanges.pop();
                }
                var quantityDecimals = krs.getNumberOfDecimals(response.exchanges, "units", function(exchange) {
                    return krs.formatQuantity(exchange.units, exchange.decimals);
                });
                var rateNQTDecimals = krs.getNumberOfDecimals(response.exchanges, "rateNQT", function(exchange) {
                    return krs.formatOrderPricePerWholeQNT(exchange.rateNQT, exchange.decimals);
                });
                var totalNQTDecimals = krs.getNumberOfDecimals(response.exchanges, "totalNQT", function(exchange) {
                    return krs.formatAmount(krs.calculateOrderTotalNQT(exchange.units, exchange.rateNQT));
                });
                var rows = "";
                for (var i = 0; i < response.exchanges.length; i++) {
                    var exchange = response.exchanges[i];
                    rows += "<tr>" +
                    "<td>" + krs.formatTimestamp(exchange.timestamp) + "</td>" +
                    "<td>" + krs.getTransactionLink(exchange.transaction) + "</td>" +
                    "<td>" + krs.getTransactionLink(exchange.offer) + "</td>" +
                    "<td>" + krs.getTransactionLink(exchange.currency, exchange.code) + "</td>" +
                    "<td>" + krs.getAccountLink(exchange, "seller") + "</td>" +
                    "<td>" + krs.getAccountLink(exchange, "buyer") + "</td>" +
                    "<td class='numeric'>" + krs.formatQuantity(exchange.units, exchange.decimals, false, quantityDecimals) + "</td>" +
                    "<td class='numeric'>" + krs.formatOrderPricePerWholeQNT(exchange.rateNQT, exchange.decimals, rateNQTDecimals) + "</td>" +
                    "<td class='numeric'>" + krs.formatAmount(krs.calculateOrderTotalNQT(exchange.units, exchange.rateNQT, exchange.decimals),false,false,totalNQTDecimals) + "</td>" +
                    "</tr>";
                }
                krs.dataLoaded(rows);
            } else {
                krs.dataLoaded();
            }
        });
    };

    krs.pages.currency_transfer_history = function () {
        krs.sendRequest("getCurrencyTransfers+", {
            "account": krs.accountRS,
            "includeCurrencyInfo": true,
            "firstIndex": krs.pageNumber * krs.itemsPerPage - krs.itemsPerPage,
            "lastIndex": krs.pageNumber * krs.itemsPerPage
        }, function (response) {
            if (response.transfers && response.transfers.length) {
                if (response.transfers.length > krs.itemsPerPage) {
                    krs.hasMorePages = true;
                    response.transfers.pop();
                }
                var transfers = response.transfers;
                var quantityDecimals = krs.getNumberOfDecimals(transfers, "units", function(transfer) {
                    return krs.formatQuantity(transfer.units, transfer.decimals);
                });
                var rows = "";
                for (var i = 0; i < transfers.length; i++) {
                    transfers[i].units = new BigInteger(transfers[i].units);
                    var type = (transfers[i].recipientRS == krs.accountRS ? "receive" : "send");
                    rows += "<tr>" +
                    "<td>" + krs.getTransactionLink(transfers[i].transfer, transfers[i].currency) + "</td>" +
                    "<td><a href='#' data-goto-currency='" + String(transfers[i].code).escapeHTML() + "'>" + String(transfers[i].name).escapeHTML() + "</a></td>" +
                    "<td>" + krs.formatTimestamp(transfers[i].timestamp) + "</td>" +
                    "<td style='" + (type == "receive" ? "color:green" : "color:red") + "' class='numeric'>" + krs.formatQuantity(transfers[i].units, transfers[i].decimals, false, quantityDecimals) + "</td>" +
                    "<td>" + krs.getAccountLink(transfers[i], "recipient") + "</td>" +
                    "<td>" + krs.getAccountLink(transfers[i], "sender") + "</td>" +
                    "</tr>";
                }
                krs.dataLoaded(rows);
            } else {
                krs.dataLoaded();
            }
        });
    };

    var _selectedApprovalCurrency = "";

    krs.buildApprovalRequestCurrencyNavi = function () {
        var $select = $('#approve_currency_select');
        $select.empty();

        var currencySelected = false;
        var $noneOption = $('<option value=""></option>');

        krs.sendRequest("getAccountCurrencies", {
            "account": krs.accountRS,
            "includeCurrencyInfo": true
        }, function (response) {
            if (response.accountCurrencies) {
                if (response.accountCurrencies.length > 0) {
                    $noneOption.html($.t('no_currency_selected', 'No Currency Selected'));
                    $.each(response.accountCurrencies, function (key, ac) {
                        var idString = String(ac.currency);
                        var $option = $('<option value="' + idString + '">' + String(ac.code) + '</option>');
                        if (idString == _selectedApprovalCurrency) {
                            $option.attr('selected', true);
                            currencySelected = true;
                        }
                        $option.appendTo($select);
                    });
                } else {
                    $noneOption.html($.t('account_has_no_currencies', 'Account has no currencies'));
                }
            } else {
                $noneOption.html($.t('no_connection'));
            }
            if (!_selectedApprovalCurrency || !currencySelected) {
                $noneOption.attr('selected', true);
            }
            $noneOption.prependTo($select);
        });
    };

    krs.pages.approval_requests_currency = function () {
        krs.buildApprovalRequestCurrencyNavi();

        if (_selectedApprovalCurrency != "") {
            var params = {
                "currency": _selectedApprovalCurrency,
                "withoutWhitelist": true,
                "firstIndex": krs.pageNumber * krs.itemsPerPage - krs.itemsPerPage,
                "lastIndex": krs.pageNumber * krs.itemsPerPage
            };
            krs.sendRequest("getCurrencyPhasedTransactions", params, function (response) {
                var rows = "";

                if (response.transactions && response.transactions.length > 0) {
                    if (response.transactions.length > krs.itemsPerPage) {
                        krs.hasMorePages = true;
                        response.transactions.pop();
                    }
                    var decimals = krs.getTransactionsAmountDecimals(response.transactions);
                    for (var i = 0; i < response.transactions.length; i++) {
                        var t = response.transactions[i];
                        t.confirmed = true;
                        rows += krs.getTransactionRowHTML(t, ['approve'], decimals);
                    }
                } else {
                    $('#ar_currency_no_entries').html($.t('no_current_approval_requests', 'No current approval requests'));
                }
                krs.dataLoaded(rows);
                krs.addPhasingInfoToTransactionRows(response.transactions);
            });
        } else {
            $('#ar_currency_no_entries').html($.t('please_select_currency', 'Please select a currency'));
            krs.dataLoaded();
        }
    };

    $('#approve_currency_select').on('change', function () {
        _selectedApprovalCurrency = $(this).find('option:selected').val();
        krs.loadPage("approval_requests_currency");
    });

    krs.setup.currencies = function () {
        var sidebarId = 'sidebar_monetary_system';
        var options = {
            "id": sidebarId,
            "titleHTML": '<i class="fa fa-bank"></i><span data-i18n="monetary_system">Monetary System</span>',
            "page": 'currencies',
            "desiredPosition": 40,
            "depends": { tags: [ krs.constants.API_TAGS.MS ] }
        };
        krs.addTreeviewSidebarMenuItem(options);
        options = {
            "titleHTML": '<span data-i18n="currencies">Currencies</span>',
            "type": 'PAGE',
            "page": 'currencies'
        };
        krs.appendMenuItemToTSMenuItem(sidebarId, options);
        options = {
            "titleHTML": '<span data-i18n="exchange_history">Exchange History</span>',
            "type": 'PAGE',
            "page": 'exchange_history'
        };
        krs.appendMenuItemToTSMenuItem(sidebarId, options);
        options = {
            "titleHTML": '<span data-i18n="transfer_history">Transfer History</span>',
            "type": 'PAGE',
            "page": 'currency_transfer_history'
        };
        krs.appendMenuItemToTSMenuItem(sidebarId, options);
        options = {
            "titleHTML": '<span data-i18n="approval_requests">Approval Requests</span>',
            "type": 'PAGE',
            "page": 'approval_requests_currency'
        };
        krs.appendMenuItemToTSMenuItem(sidebarId, options);
        options = {
            "titleHTML": '<span data-i18n="issue_currency">Issue Currency</span></a>',
            "type": 'MODAL',
            "modalId": 'issue_currency_modal'
        };
        krs.appendMenuItemToTSMenuItem(sidebarId, options);
    };

    /* ISSUE CURRENCY FORM */
    krs.forms.issueCurrency = function ($modal) {
        var data = krs.getFormData($modal.find("form:first"));

        data.description = $.trim(data.description);
        if (data.minReservePerUnitNQT) {
            data.minReservePerUnitNQT = krs.convertToNQT(data.minReservePerUnitNQT);
            data.minReservePerUnitNQT = krs.convertToQNTf(data.minReservePerUnitNQT, data.decimals);
        }
        if (!data.initialSupply || data.initialSupply == "") {
            data.initialSupply = "0";
        }
        if (!data.reserveSupply || data.reserveSupply == "") {
            data.reserveSupply = "0";
        }
        if (!data.issuanceHeight) {
            data.issuanceHeight = "0";
        }
        if (!data.ruleset || data.ruleset == "") {
            data.ruleset = "0";
        }
        if (!data.algorithm || data.algorithm == "") {
            data.algorithm = "0";
        }
        if (!data.decimals || data.decimals == "") {
            data.decimals = "0";
        }

        data.type = 0;
        $("[name='type']:checked").each(function () {
            data.type += parseInt($(this).val(), 10);
        });

        if (!data.description) {
            return {
                "error": $.t("error_description_required")
            };
        } else if (!data.name) {
            return {
                "error": $.t("error_name_required")
            };
        } else if (!data.code || data.code.length < 3) {
            return {
                "error": $.t("error_code_required")
            };
        } else if (!data.maxSupply || data.maxSupply < 1) {
            return {
                "error": $.t("error_type_supply")
            };
        } else if (!/^\d+$/.test(data.maxSupply) || !/^\d+$/.test(data.initialSupply) || !/^\d+$/.test(data.reserveSupply)) {
            return {
                "error": $.t("error_whole_units")
            };
        } else {
            try {
                data.maxSupply = krs.convertToQNT(data.maxSupply, data.decimals);
                data.initialSupply = krs.convertToQNT(data.initialSupply, data.decimals);
                data.reserveSupply = krs.convertToQNT(data.reserveSupply, data.decimals);
            } catch (e) {
                return {
                    "error": $.t("error_whole_units")
                };
            }
            return {
                "data": data
            };
        }
    };

    var distributionTable = $("#currency_distribution_table");
    var distributionModal = $("#currency_distribution_modal");
    distributionModal.on("show.bs.modal", function (e) {
        var $invoker = $(e.relatedTarget);

        var code = $invoker.data("code");
        var currency = null;
        krs.sendRequest("getCurrency", {
            "code": code
        }, function (response) {
            currency = response;
        }, false);
        krs.sendRequest("getCurrencyAccounts", {
            "currency": currency.currency
        }, function (response) {
            var rows = "";

            if (response.accountCurrencies) {
                response.accountCurrencies.sort(function (a, b) {
                    return new BigInteger(b.units).compareTo(new BigInteger(a.units));
                });

                for (var i = 0; i < response.accountCurrencies.length; i++) {
                    var account = response.accountCurrencies[i];
                    var percentageCurrency = krs.calculatePercentage(account.units, currency.currentSupply);
                    rows += "<tr><td>" + krs.getAccountLink(account, "account", currency.account, "Currency Issuer") + "</td><td>" + krs.formatQuantity(account.units, currency.decimals) + "</td><td>" + percentageCurrency + "%</td></tr>";
                }
            }

            distributionTable.find("tbody").empty().append(rows);
            krs.dataLoadFinished(distributionTable);
        });
    });

    distributionModal.on("hidden.bs.modal", function () {
        distributionTable.find("tbody").empty();
        distributionTable.parent().addClass("data-loading");
    });

    /* TRANSFER CURRENCY FORM */
    krs.forms.transferCurrency = function ($modal) {
        var data = krs.getFormData($modal.find("form:first"));
        var decimals = parseInt(data.decimals, 10);
        if (!data.units) {
            return {
                "error": $.t("error_not_specified", {
                    "name": krs.getTranslatedFieldName("units").toLowerCase()
                }).capitalize()
            };
        }

        if (!krs.showedFormWarning) {
            if (krs.settings["currency_transfer_warning"] && krs.settings["currency_transfer_warning"] != 0) {
                if (new Big(data.units).cmp(new Big(krs.settings["currency_transfer_warning"])) > 0) {
                    krs.showedFormWarning = true;
                    return {
                        "error": $.t("error_max_currency_transfer_warning", {
                            "qty": String(krs.settings["currency_transfer_warning"]).escapeHTML()
                        })
                    };
                }
            }
        }

        try {
            data.units = krs.convertToQNT(data.units, decimals);
        } catch (e) {
            return {
                "error": $.t("error_incorrect_units_plus", {
                    "err": e.escapeHTML()
                })
            };
        }

        delete data.decimals;

        if (!data.add_message) {
            delete data.add_message;
            delete data.message;
            delete data.encrypt_message;
            delete data.permanent_message;
        }

        return {
            "data": data
        };
    };

    $('#issue_currency_reservable').change(function () {
        var issuanceHeight = $("#issue_currency_issuance_height");
        if ($(this).is(":checked")) {
            $(".optional_reserve").show();
            issuanceHeight.val("");
            issuanceHeight.prop("disabled", false);
            $(".optional_reserve input").prop("disabled", false);
        } else {
            $(".optional_reserve").hide();
            $(".optional_reserve input").prop("disabled", true);
            issuanceHeight.val(0);
            issuanceHeight.prop("disabled", true);
        }
    });

    $('#issue_currency_claimable').change(function () {
        if ($(this).is(":checked")) {
            $("#issue_currency_initial_supply").val(0);
            $("#issue_currency_issuance_height").prop("disabled", false);
            $(".optional_reserve").show();
            $('#issue_currency_reservable').prop('checked', true);
            $("#issue_currency_min_reserve").prop("disabled", false);
            $("#issue_currency_min_reserve_supply").prop("disabled", false);
        } else {
            $("#issue_currency_initial_supply").val($("#issue_currency_max_supply").val());
        }
    });

    $(".issue_currency_reservable").on("change", function() {
   		if ($(this).is(":checked")) {
   			$(this).closest("form").find(".optional_reserve").fadeIn();
   		} else {
   			$(this).closest("form").find(".optional_reserve").hide();
   		}
   	});

    $('#issue_currency_mintable').change(function () {
        if ($(this).is(":checked")) {
            $(".optional_mint").fadeIn();
            $(".optional_mint input").prop("disabled", false);
        } else {
            $(".optional_mint").hide();
            $(".optional_mint input").prop("disabled", true);
        }
    });

    /* PUBLISH EXCHANGE OFFER MODEL */
    krs.forms.publishExchangeOffer = function ($modal) {
        var data = krs.getFormData($modal.find("form:first"));
        var decimals = parseInt(data.decimals, 10);
        data.initialBuySupply = krs.convertToQNT(data.initialBuySupply, decimals);
        data.totalBuyLimit = krs.convertToQNT(data.totalBuyLimit, decimals);
        data.buyRateNQT = krs.calculatePricePerWholeQNT(krs.convertToNQT(data.buyRateNQT), decimals);
        data.initialSellSupply = krs.convertToQNT(data.initialSellSupply, decimals);
        data.totalSellLimit = krs.convertToQNT(data.totalSellLimit, decimals);
        data.sellRateNQT = krs.calculatePricePerWholeQNT(krs.convertToNQT(data.sellRateNQT), decimals);
        return {
            "data": data
        };
    };

    /* RESERVE CURRENCY MODEL */
    $("#reserve_currency_modal").on("show.bs.modal", function (e) {
        var $invoker = $(e.relatedTarget);
        var currency = $invoker.data("currency");
        var currencyCode = $invoker.data("code");
        krs.sendRequest("getCurrency+", {
            "currency": currency
        }, function (response) {
            if (response && !response.errorDescription) {
                var currency = response.currency;
                var decimals = response.decimals;
                var minReserve = response.minReservePerUnitNQT;
                var currentReserve = response.currentReservePerUnitNQT;
                var resSupply = response.reserveSupply;
                var initialSupply = response.initialSupply;

                $("#reserve_currency_code").html(String(currencyCode).escapeHTML());
                $("#reserve_currency_currency").val(currency);
                $("#reserve_currency_decimals").val(decimals);
                $("#reserve_currency_minReserve").val(minReserve);
                var minReservePerUnitNQT = new BigInteger(minReserve).multiply(new BigInteger("" + Math.pow(10, decimals)));
                $("#reserve_currency_minReserve_text").html(krs.formatQuantity(krs.convertToKPL(minReservePerUnitNQT.multiply(new BigInteger(resSupply))), decimals));
                $("#reserve_currency_currentReserve").val(currentReserve);
                var currentReservePerUnitNQT = new BigInteger(currentReserve).multiply(new BigInteger("" + Math.pow(10, decimals)));
                $("#reserve_currency_currentReserve_text").html(krs.formatQuantity(krs.convertToKPL(currentReservePerUnitNQT.multiply(new BigInteger(resSupply))), decimals));
                $("#reserve_currency_resSupply").val(resSupply);
                $("#reserve_currency_resSupply_text").html(krs.formatQuantity(resSupply, decimals));
                $("#reserve_currency_initialSupply_text").html(krs.formatQuantity(initialSupply, decimals));
            }
        })
    });

    var reserveCurrencyAmount = $("#reserve_currency_amount");
    reserveCurrencyAmount.keydown(function (e) {
        var decimals = parseInt($("#reserve_currency_decimals").val(), 10);

        var charCode = !e.charCode ? e.which : e.charCode;
        if (krs.isControlKey(charCode) || e.ctrlKey || e.metaKey) {
            return;
        }
        return krs.validateDecimals(8 - decimals, charCode, $(this).val(), e);
    });

    reserveCurrencyAmount.blur(function () {
        var decimals = parseInt($("#reserve_currency_decimals").val());
        var resSupply = krs.convertToQNTf($("#reserve_currency_resSupply").val(), decimals);
        var amountNQT = krs.convertToNQT(this.value);
        var unitAmountNQT = new BigInteger(amountNQT).divide(new BigInteger(resSupply));
        var roundUnitAmountNQT = krs.convertToNQT(krs.amountToPrecision(krs.convertToKPL(unitAmountNQT), decimals));
        $("#reserve_currency_total").val(krs.convertToKPL(roundUnitAmountNQT));
        reserveCurrencyAmount.val(krs.convertToKPL(new BigInteger(roundUnitAmountNQT).multiply(new BigInteger(resSupply)).toString()));
    });

    krs.forms.currencyReserveIncrease = function ($modal) {
        var data = krs.getFormData($modal.find("form:first"));
        var decimals = parseInt(data.decimals, 10);
        data.amountPerUnitNQT = krs.calculatePricePerWholeQNT(krs.convertToNQT(data.amountPerUnitNQT), decimals);

        return {
            "data": data
        };
    };

    /* CLAIM CURRENCY MODEL */
    $("#claim_currency_modal").on("show.bs.modal", function (e) {
        var $invoker = $(e.relatedTarget);

        var currency = $invoker.data("currency");
        var currencyCode = $invoker.data("code");

        krs.sendRequest("getAccountCurrencies", {
            "currency": currency,
            "account": krs.accountRS,
            "includeCurrencyInfo": true
        }, function (response) {
            var availableUnits = "0";
            if (response.units) {
                availableUnits = krs.formatQuantity(response.units, response.decimals);
            }
            $("#claimAvailable").html(availableUnits);
        });

        krs.sendRequest("getCurrency", {
            "currency": currency
        }, function (response) {
            var currentReservePerUnitNQT = new BigInteger(response.currentReservePerUnitNQT).multiply(new BigInteger("" + Math.pow(10, response.decimals)));
            $("#claimRate").html(krs.formatAmount(currentReservePerUnitNQT) + " [KPL/" + currencyCode + "]");
        });

        $("#claim_currency_decimals").val($invoker.data("decimals"));
        $("#claim_currency_currency").val(currency);
        $("#claim_currency_code").html(String(currencyCode).escapeHTML());

    });

    $("#claim_currency_amount").keydown(function (e) {
        var decimals = parseInt($("#claim_currency_decimals").val(), 10);

        var charCode = !e.charCode ? e.which : e.charCode;
        if (krs.isControlKey(charCode) || e.ctrlKey || e.metaKey) {
            return;
        }
        return krs.validateDecimals(decimals, charCode, $(this).val(), e);
    });

    /* Respect decimal positions on claiming a currency */
    krs.forms.currencyReserveClaim = function ($modal) {
        var data = krs.getFormData($modal.find("form:first"));
        var decimals = parseInt(data.decimals, 10);
        data.units = krs.convertToQNT(data.units, decimals);

        return {
            "data": data
        };
    };

    return krs;
}(krs || {}, jQuery));