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
    krs.constants = {
        'DB_VERSION': 2,

        'PLUGIN_VERSION': 1,
        'MAX_SHORT_JAVA': 32767,
        'MAX_UNSIGNED_SHORT_JAVA': 65535,
        'MAX_INT_JAVA': 2147483647,
        'MIN_PRUNABLE_MESSAGE_LENGTH': 28,
        'DISABLED_API_ERROR_CODE': 16,

        //Plugin launch status numbers
        'PL_RUNNING': 1,
        'PL_PAUSED': 2,
        'PL_DEACTIVATED': 3,
        'PL_HALTED': 4,

        //Plugin validity status codes
        'PV_VALID': 100,
        'PV_NOT_VALID': 300,
        'PV_UNKNOWN_MANIFEST_VERSION': 301,
        'PV_INCOMPATIBLE_MANIFEST_VERSION': 302,
        'PV_INVALID_MANIFEST_FILE': 303,
        'PV_INVALID_MISSING_FILES': 304,
        'PV_INVALID_JAVASCRIPT_FILE': 305,

        //Plugin krs compatibility status codes
        'PNC_COMPATIBLE': 100,
        'PNC_COMPATIBILITY_MINOR_RELEASE_DIFF': 101,
        'PNC_COMPATIBILITY_WARNING': 200,
        'PNC_COMPATIBILITY_MAJOR_RELEASE_DIFF': 202,
        'PNC_NOT_COMPATIBLE': 300,
        'PNC_COMPATIBILITY_UNKNOWN': 301,
        'PNC_COMPATIBILITY_CLIENT_VERSION_TOO_OLD': 302,

        'VOTING_MODELS': {},
        'MIN_BALANCE_MODELS': {},
        "HASH_ALGORITHMS": {},
        "PHASING_HASH_ALGORITHMS": {},
        "MINTING_HASH_ALGORITHMS": {},
        "REQUEST_TYPES": {},
        "API_TAGS": {},

        'SERVER': {},
        'MAX_TAGGED_DATA_DATA_LENGTH': 0,
        'MAX_PRUNABLE_MESSAGE_LENGTH': 0,
        'GENESIS': '',
        'GENESIS_RS': '',
        'EPOCH_BEGINNING': 0,
        'FORGING': 'forging',
        'NOT_FORGING': 'not_forging',
        'UNKNOWN': 'unknown'
    };

    krs.loadAlgorithmList = function (algorithmSelect, isPhasingHash) {
        var hashAlgorithms;
        if (isPhasingHash) {
            hashAlgorithms = krs.constants.PHASING_HASH_ALGORITHMS;
        } else {
            hashAlgorithms = krs.constants.HASH_ALGORITHMS;
        }
        for (var key in hashAlgorithms) {
            if (hashAlgorithms.hasOwnProperty(key)) {
                algorithmSelect.append($("<option />").val(hashAlgorithms[key]).text(key));
            }
        }
    };

    krs.loadServerConstants = function () {
        krs.sendRequest("getConstants", {}, function (response) {
            if (response.genesisAccountId) {
                console.log('lalalallalalalalal',response);
                krs.constants.SERVER = response;
                krs.constants.VOTING_MODELS = response.votingModels;
                krs.constants.MIN_BALANCE_MODELS = response.minBalanceModels;
                krs.constants.HASH_ALGORITHMS = response.hashAlgorithms;
                krs.constants.PHASING_HASH_ALGORITHMS = response.phasingHashAlgorithms;
                krs.constants.MINTING_HASH_ALGORITHMS = response.mintingHashAlgorithms;
                krs.constants.MAX_TAGGED_DATA_DATA_LENGTH = response.maxTaggedDataDataLength;
                krs.constants.MAX_PRUNABLE_MESSAGE_LENGTH = response.maxPrunableMessageLength;
                krs.constants.GENESIS = response.genesisAccountId;
                krs.constants.GENESIS_RS = krs.convertNumericToRSAccountFormat(response.genesisAccountId);
                krs.constants.EPOCH_BEGINNING = response.epochBeginning; //从后台获取创世区块时间
                krs.constants.REQUEST_TYPES = response.requestTypes;
                krs.constants.API_TAGS = response.apiTags;
                //krs.constants.GATEWAY = response.apiTags;
                krs.constants.SHUFFLING_STAGES = response.shufflingStages;
                krs.constants.SHUFFLING_PARTICIPANTS_STATES = response.shufflingParticipantStates;
                krs.constants.DISABLED_APIS = response.disabledAPIs;
                krs.constants.DISABLED_API_TAGS = response.disabledAPITags;
                krs.loadTransactionTypeConstants(response);
            }
        }, false);
    };

    function getKeyByValue(map, value) {
        for (var key in map) {
            if (map.hasOwnProperty(key)) {
                if (value === map[key]) {
                    return key;
                }
            }
        }
        return null;
    }

    krs.getVotingModelName = function (code) {
        return getKeyByValue(krs.constants.VOTING_MODELS, code);
    };

    krs.getVotingModelCode = function (name) {
        return krs.constants.VOTING_MODELS[name];
    };

    krs.getMinBalanceModelName = function (code) {
        return getKeyByValue(krs.constants.MIN_BALANCE_MODELS, code);
    };

    krs.getMinBalanceModelCode = function (name) {
        return krs.constants.MIN_BALANCE_MODELS[name];
    };

    krs.getHashAlgorithm = function (code) {
        return getKeyByValue(krs.constants.HASH_ALGORITHMS, code);
    };

    krs.getShufflingStage = function (code) {
        return getKeyByValue(krs.constants.SHUFFLING_STAGES, code);
    };

    krs.getShufflingParticipantState = function (code) {
        return getKeyByValue(krs.constants.SHUFFLING_PARTICIPANTS_STATES, code);
    };

    krs.isRequireBlockchain = function(requestType) {
        if (!krs.constants.REQUEST_TYPES[requestType]) {
            // For requests invoked before the getConstants request returns,
            // we implicitly assume that they do not require the blockchain
            return false;
        }
        return true == krs.constants.REQUEST_TYPES[requestType].requireBlockchain;
    };

    krs.isRequirePost = function(requestType) {
        if (!krs.constants.REQUEST_TYPES[requestType]) {
            // For requests invoked before the getConstants request returns
            // we implicitly assume that they can use GET
            return false;
        }
        return true == krs.constants.REQUEST_TYPES[requestType].requirePost;
    };

    krs.isRequestTypeEnabled = function(requestType) {
        if ($.isEmptyObject(krs.constants.REQUEST_TYPES)) {
            return true;
        }
        if (requestType.indexOf("+") > 0) {
            requestType = requestType.substring(0, requestType.indexOf("+"));
        }
        return !!krs.constants.REQUEST_TYPES[requestType];
    };

    krs.isSubmitPassphrase = function (requestType) {
        return requestType == "startForging" ||
            requestType == "stopForging" ||
            requestType == "startShuffler" ||
            requestType == "getForging" ||
            requestType == "markHost";
    };

    krs.getFileUploadConfig = function (requestType, data) {
        var config = {};
        if (requestType == "uploadTaggedData") {
            config.selector = "#upload_file";
            config.requestParam = "file";
            config.errorDescription = "error_file_too_big";
            config.maxSize = krs.constants.MAX_TAGGED_DATA_DATA_LENGTH;
            return config;
        } else if (requestType == "dgsListing") {
            config.selector = "#dgs_listing_image";
            config.requestParam = "messageFile";
            config.errorDescription = "error_image_too_big";
            config.maxSize = krs.constants.MAX_PRUNABLE_MESSAGE_LENGTH;
            return config;
        } else if (requestType == "sendMessage") {
            config.selector = "#upload_file_message";
            if (data.encrypt_message) {
                config.requestParam = "encryptedMessageFile";    
            } else {
                config.requestParam = "messageFile";
            }
            config.errorDescription = "error_message_too_big";
            config.maxSize = krs.constants.MAX_PRUNABLE_MESSAGE_LENGTH;
            return config;
        }
        return null;
    };

    krs.isApiEnabled = function(depends) {
        if (!depends) {
            return true;
        }
        var tags = depends.tags;
        if (tags) {
            for (var i=0; i < tags.length; i++) {
                if (!tags[i].enabled) {
                    return false;
                }
            }
        }
        var apis = depends.apis;
        if (apis) {
            for (i=0; i < apis.length; i++) {
                if (apis[i] && !apis[i].enabled) {
                    return false;
                }
            }
        }
        return true;
    };

    return krs;
}(krs || {}, jQuery));