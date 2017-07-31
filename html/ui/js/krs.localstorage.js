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
var krs = (function (krs) {

    function isIndexedDBSupported() {
        return krs.databaseSupport;
    }

    krs.storageSelect = function (table, query, callback) {
        if (isIndexedDBSupported()) {
            krs.database.select(table, query, callback);
            return;
        }
        var items = krs.getAccountJSONItem(table);
        if (!items) {
            if (callback) {
                callback("No items to select", []);
            }
            return;
        }
        var response = [];
        for (var i=0; i<items.length; i++) {
            if (!query || query.length == 0) {
                response.push(items[i]);
                continue;
            }
            for (var j=0; j<query.length; j++) {
                Object.keys(query[j]).forEach(function(key) {
                    if (items[i][key] == query[j][key]) {
                        response.push(items[i]);
                    }
                })
            }
        }
        if (callback) {
            callback(null, response);
        }
    };

    krs.storageInsert = function(table, key, data, callback, isAutoIncrement) {
        if (isIndexedDBSupported()) {
            return krs.database.insert(table, data, callback);
        }
        var items = krs.getAccountJSONItem(table);
        if (!items) {
            items = [];
        }
        for (var i=0; i<items.length; i++) {
            for (var j=0; j<data.length; j++) {
                if (items[i][key] == data[j][key]) {
                    if (callback) {
                        callback("Key already exists: " + items[i][key], []);
                    }
                    return;
                }
            }
        }

        if ($.isArray(data)) {
            for (i = 0; i < data.length; i++) {
                insertItem(data[i]);
            }
        } else {
            insertItem(data);
        }
        krs.setAccountJSONItem(table, items);
        if (callback) {
            callback(null, items);
        }

        function insertItem(item) {
            if (!isAutoIncrement) {
                items.push(item);
                return;
            }
            if (item.id) {
                if (callback) {
                    callback("Cannot use auto increment id since data already contains id value", []);
                }
                return;
            }
            if (items.length == 0) {
                item.id = 1;
            } else {
                item.id = items[items.length - 1].id + 1;
            }
            items.push(item);
        }
    };

    krs.storageUpdate = function (table, data, query, callback) {
        if (isIndexedDBSupported()) {
            return krs.database.update(table, data, query, callback);
        }
        var items = krs.getAccountJSONItem(table);
        if (!items) {
            if (callback) {
                callback("No items to update", []);
            }
            return;
        }
        if (!query) {
            if (callback) {
                callback("No update query", []);
            }
            return;
        }
        for (var i=0; i<items.length; i++) {
            for (var j=0; j<query.length; j++) {
                Object.keys(query[j]).forEach(function(key) {
                    if (items[i][key] == query[j][key]) {
                        Object.keys(data).forEach(function(dataKey) {
                            items[i][dataKey] = data[dataKey];
                        })
                    }
                });
            }
        }
        krs.setAccountJSONItem(table, items);
        if (callback) {
            callback(null, items);
        }
    };

    krs.storageDelete = function (table, query, callback) {
        if (isIndexedDBSupported()) {
            return krs.database.delete(table, query, callback);
        }
        var items = krs.getAccountJSONItem(table);
        if (!items) {
            if (callback) {
                callback(null, []);
            }
            return;
        }
        for (var i=0; i<items.length; i++) {
            for (var j=0; j<query.length; j++) {
                Object.keys(query[j]).forEach(function(key) {
                    if (items[i][key] == query[j][key]) {
                        items.splice(i, 1);
                    }
                })
            }
        }
        krs.setAccountJSONItem(table, items);
        if (callback) {
            callback(null, items);
        }
    };

    krs.localStorageDrop = function(table) {
        krs.removeAccountItem(table);
    };

    krs.getStrItem = function (key) {
        return localStorage.getItem(key);
    };

    krs.setStrItem = function (key, data) {
        localStorage.setItem(key, data);
    };

    krs.getJSONItem = function (key) {
        return JSON.parse(localStorage.getItem(key));
    };

    krs.setJSONItem = function (key, data) {
        var jsonData = JSON.stringify(data);
        localStorage.setItem(key, jsonData);
    };

    krs.removeItem = function (key) {
        localStorage.removeItem(key);
    };

    krs.getAccountJSONItem = function (key) {
        return krs.getJSONItem(getAccountKey(key));
    };

    krs.setAccountJSONItem = function (key, data) {
        krs.setJSONItem(getAccountKey(key), data)
    };

    krs.removeAccountItem = function (key) {
        krs.removeItem(getAccountKey(key));
    };

    function getAccountKey(key) {
        if (krs.account === "") {
            return key;
        }
        return key + "." + krs.account;
    }

    return krs;
}(krs || {}, jQuery));