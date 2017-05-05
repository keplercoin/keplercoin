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
var krs = (function(krs, $) {
	var index = 0;
	var bundles = [
		{alias: "krsVersion", status: "release", prefix: "KPL-client-", ext: "zip"},
		{alias: "krsBetaVersion", status: "beta", prefix: "KPL-client-", ext: "zip"},
		{alias: "krsVersionWin", status: "release", prefix: "KPL-client-", ext: "exe"},
		{alias: "krsBetaVersionWin", status: "beta", prefix: "KPL-client-", ext: "exe"},
		{alias: "krsVersionMac", status: "release", prefix: "KPL-installer-", ext: "dmg"},
		{alias: "krsBetaVersionMac", status: "beta", prefix: "KPL-installer-", ext: "dmg"},
		{alias: "krsVersionLinux", status: "release", prefix: "KPL-client-", ext: "sh"},
		{alias: "krsBetaVersionLinux", status: "beta", prefix: "KPL-client-", ext: "sh"}
	];
	krs.isOutdated = false;

	krs.checkAliasVersions = function() {
		if (krs.downloadingBlockchain) {
			$("#krs_update_explanation").find("span").hide();
			$("#krs_update_explanation_blockchain_sync").show();
			return;
		}

        // Load all version aliases in parallel and call checkForNewVersion() at the end
		index = 0;
		var versionInfoCall = [];
		for (var i=0; i<bundles.length; i++) {
			versionInfoCall.push(function(callback) {
				getVersionInfo(callback);
			});
		}
        async.parallel(versionInfoCall, function(err, results) {
            if (err == null) {
                krs.logConsole("Version aliases: " + JSON.stringify(results));
            } else {
                krs.logConsole("Version aliases lookup error " + err);
            }
			checkForNewVersion();
        });
	};

	function checkForNewVersion() {
        var installVersusNormal, installVersusBeta;
        if (krs.krsVersion && krs.krsVersion.versionNr) {
			installVersusNormal = krs.versionCompare(krs.state.version, krs.krsVersion.versionNr);
		}
		if (krs.krsBetaVersion && krs.krsBetaVersion.versionNr) {
			installVersusBeta = krs.versionCompare(krs.state.version, krs.krsBetaVersion.versionNr);
		}

		$("#krs_update_explanation").find("> span").hide();
		$("#krs_update_explanation_wait").attr("style", "display: none !important");
		$(".krs_new_version_nr").html(krs.krsVersion.versionNr).show();
		$(".krs_beta_version_nr").html(krs.krsBetaVersion.versionNr).show();

		if (installVersusNormal == -1 && installVersusBeta == -1) {
			krs.isOutdated = true;
			$("#krs_update").html($.t("outdated")).show();
			$("#krs_update_explanation_new_choice").show();
		} else if (installVersusBeta == -1) {
			krs.isOutdated = false;
			$("#krs_update").html($.t("new_beta")).show();
			$("#krs_update_explanation_new_beta").show();
		} else if (installVersusNormal == -1) {
			krs.isOutdated = true;
			$("#krs_update").html($.t("outdated")).show();
			$("#krs_update_explanation_new_release").show();
		} else {
			krs.isOutdated = false;
			$("#krs_update_explanation_up_to_date").show();
		}
	}

	function verifyClientUpdate(e) {
		e.stopPropagation();
		e.preventDefault();
		var files = null;
		if (e.originalEvent.target.files && e.originalEvent.target.files.length) {
			files = e.originalEvent.target.files;
		} else if (e.originalEvent.dataTransfer.files && e.originalEvent.dataTransfer.files.length) {
			files = e.originalEvent.dataTransfer.files;
		}
		if (!files) {
			return;
		}
        var updateHashProgress = $("#krs_update_hash_progress");
        updateHashProgress.css("width", "0%");
		updateHashProgress.show();
		var worker = new Worker("js/crypto/sha256worker.js");
		worker.onmessage = function(e) {
			if (e.data.progress) {
				$("#krs_update_hash_progress").css("width", e.data.progress + "%");
			} else {
				$("#krs_update_hash_progress").hide();
				$("#krs_update_drop_zone").hide();

                var krsUpdateResult = $("#krs_update_result");
                if (e.data.sha256 == krs.downloadedVersion.hash) {
					krsUpdateResult.html($.t("success_hash_verification")).attr("class", " ");
				} else {
					krsUpdateResult.html($.t("error_hash_verification")).attr("class", "incorrect");
				}

				$("#krs_update_hash_version").html(krs.downloadedVersion.versionNr);
				$("#krs_update_hash_download").html(e.data.sha256);
				$("#krs_update_hash_official").html(krs.downloadedVersion.hash);
				$("#krs_update_hashes").show();
				krsUpdateResult.show();
				krs.downloadedVersion = {};
				$("body").off("dragover.krs, drop.krs");
			}
		};

		worker.postMessage({
			file: files[0]
		});
	}

	krs.downloadClientUpdate = function(status, ext) {
		var bundle;
		for (var i=0; i<bundles.length; i++) {
			bundle = bundles[i];
            if (bundle.status == status && bundle.ext == ext) {
				krs.downloadedVersion = krs[bundle.alias];
				break;
			}
		}
        if (!krs.downloadedVersion) {
            krs.logConsole("Cannot determine download version for alias " + bundle.alias);
            return;
        }
        var filename = bundle.prefix + krs.downloadedVersion.versionNr + "." + bundle.ext;
        var fileurl = "https://bitbucket.org/JeanLucPicard/KPL/downloads/" + filename;
        if (window.java !== undefined) {
            window.java.popupHandlerURLChange(fileurl);
        } else {
            $("#krs_update_iframe").attr("src", fileurl);
        }
        $("#krs_update_explanation").hide();
        var updateDropZone = $("#krs_update_drop_zone");
        updateDropZone.html($.t("drop_update_v2", { filename: filename }));
        updateDropZone.show();

        var body = $("body");
        body.on("dragover.krs", function(e) {
            e.preventDefault();
            e.stopPropagation();

            if (e.originalEvent && e.originalEvent.dataTransfer) {
                e.originalEvent.dataTransfer.dropEffect = "copy";
            }
        });

        body.on("drop.krs", function(e) {
            verifyClientUpdate(e);
        });

        updateDropZone.on("click", function(e) {
            e.preventDefault();
            $("#krs_update_file_select").trigger("click");
        });

        $("#krs_update_file_select").on("change", function(e) {
            verifyClientUpdate(e);
        });

		return false;
	};
	
    // Get latest version number and hash of version specified by the alias
    function getVersionInfo(callback) {
		var aliasName = bundles[index].alias;
		index ++;
        krs.sendRequest("getAlias", {
            "aliasName": aliasName
        }, function (response) {
            if (response.aliasURI) {
                var token = response.aliasURI.trim().split(" ");
                if (token.length != 2) {
                    krs.logConsole("Invalid token " + response.aliasURI + " for alias " + aliasName);
                    callback(null, null);
                    return;
                }
                krs[aliasName] = { versionNr: token[0], hash: token[1] };
                callback(null, krs[aliasName]);
            } else {
                callback(null, null);
            }
        });
    }
	return krs;
}(krs || {}, jQuery));