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
var krs = (function(krs, $, undefined) {

	krs.plugins = {};
    krs.disablePluginsDuringSession = true;
	krs.activePlugins = false;
    krs.numRunningPlugins = 0;

	krs.checkForPluginManifest = function(pluginId) {
		var manifest = undefined;
		jQuery.ajaxSetup({ async: false });
    	$.ajax({
    		url: 'plugins/' + pluginId + '/manifest.json',
            cache: false,
    		success: function(data){
    			manifest = data;
    		}
		});
    	jQuery.ajaxSetup({ async: true });
    	return manifest;
	};

	krs.checKPLuginValidity = function(pluginId, manifest) {
		var plugin = krs.plugins[pluginId];
		if (!manifest.pluginVersion) {
    		plugin['validity'] = krs.constants.PV_UNKNOWN_MANIFEST_VERSION;
    		plugin['validity_msg'] = $.t('pv_unknown_manifest_version_msg', 'Unknown plugin manifest version');
    		return false;
    	}
    	if (manifest.pluginVersion != krs.constants.PLUGIN_VERSION) {
    		plugin['validity'] = krs.constants.PV_INCOMPATIBLE_MANIFEST_VERSION;
    		plugin['validity_msg'] = $.t('pv_incompatible_manifest_version_msg', 'Incompatible plugin manifest version');
    		return false;
    	}

    	var invalidManifestFileMsg = $.t('pv_invalid_manifest_file_msg', 'Invalid plugin manifest file');
    	var mandatoryManifestVars = ["name", "myVersion", "shortDescription", "infoUrl", "startPage", "krsVersion"];
    	for (var i=0; i<mandatoryManifestVars.length; i++) {
    		var mvv = mandatoryManifestVars[i];
    		if (!manifest[mvv] || (manifest[mvv] && manifest[mvv].length == 0)) {
    			plugin['validity'] = krs.constants.PV_INVALID_MANIFEST_FILE;
    			plugin['validity_msg'] = invalidManifestFileMsg;
    			console.log("Attribute '" + mvv + "' missing for '" + pluginId + "' plugin manifest file.");
    			return false;
    		}
    	}

    	var lengthRestrictions = [
    		["name", 20],
    		["myVersion", 16],
    		["shortDescription", 200],
    		["infoUrl", 200],
    		["startPage", 50],
    		["krsVersion", 20]
    	];
    	for (i=0; i<lengthRestrictions.length; i++) {
    		if (manifest[lengthRestrictions[i][0]].length > lengthRestrictions[i][1]) {
    			plugin['validity'] = krs.constants.PV_INVALID_MANIFEST_FILE;
    			plugin['validity_msg'] = invalidManifestFileMsg;
    			console.log("'" + lengthRestrictions[i][0] + "' attribute too long in '" + pluginId + "' plugin manifest file.");
    			return false;
    		}
    	}

    	if (!(manifest["infoUrl"].substr(0, 7) == 'http://' || manifest["infoUrl"].substr(0, 8) == 'https://')) {
    		plugin['validity'] = krs.constants.PV_INVALID_MANIFEST_FILE;
    		plugin['validity_msg'] = invalidManifestFileMsg;
    		console.log("'infoUrl' attribute in '" + pluginId + "' plugin manifest file is not a valid URL.");
    		return false;
    	}

    	if (manifest["krsVersion"].split('.').length != 3 || !(/^[\d\.]+$/.test(manifest["krsVersion"]))) {
    		plugin['validity'] = krs.constants.PV_INVALID_MANIFEST_FILE;
    		plugin['validity_msg'] = invalidManifestFileMsg;
    		console.log("'krsVersion' attribute in '" + pluginId + "' plugin manifest file is not in correct format ('x.y.z', no additions).");
    		return false;
    	}

    	if (manifest["deactivated"] != undefined && typeof(manifest["deactivated"]) != "boolean") {
    		plugin['validity'] = krs.constants.PV_INVALID_MANIFEST_FILE;
    		plugin['validity_msg'] = invalidManifestFileMsg;
    		console.log("'deactivated' attribute in '" + pluginId + "' plugin manifest file must be boolean type.");
    		return false;
    	}

    	if (manifest["sidebarOptOut"] != undefined && typeof(manifest["sidebarOptOut"]) != "boolean") {
    		plugin['validity'] = krs.constants.PV_INVALID_MANIFEST_FILE;
    		plugin['validity_msg'] = invalidManifestFileMsg;
    		console.log("'sidebarOptOut' attribute in '" + pluginId + "' plugin manifest file must be boolean type.");
    		return false;
    	}

    	var pluginPath = 'plugins/' + pluginId + '/';
    	var notFound = undefined;
    	var mandatoryFiles = [
    		pluginPath + 'html/pages/' + pluginId + '.html',
    		pluginPath + 'html/modals/' + pluginId + '.html',
    		pluginPath + 'js/krs.' + pluginId + '.js',
    		pluginPath + 'css/' + pluginId + '.css'
    	];
    	jQuery.ajaxSetup({ async: false });
    	for (i=0; i<mandatoryFiles.length; i++) {
			$.ajax({
    			url: mandatoryFiles[i],
    			type: 'HEAD',
                cache: false,
    			success: function(data) {
    				//nothing to do
    			},
    			error: function(data) {
                    krs.logConsole(data.statusText + " error loading plugin file " + this.url);
    				notFound = this.url;
    			}
			});
    	}
    	jQuery.ajaxSetup({ async: true });

    	if (notFound) {
    		plugin['validity'] = krs.constants.PV_INVALID_MISSING_FILES;
    		plugin['validity_msg'] = $.t('pv_invalid_missing_files_msg', 'Missing plugin files');
    		console.log("File '" + notFound + "' of plugin '" + pluginId + "' missing.");
    		return false;
    	}

    	plugin['validity'] = krs.constants.PV_VALID;
    	plugin['validity_msg'] = $.t('pv_valid_msg', 'Plugin is valid');
    	return true;
	};

	krs.checKPLuginkrsCompatibility = function(pluginId) {
		var plugin = krs.plugins[pluginId];
		var pluginkrsVersion = plugin.manifest["krsVersion"];
		var pvList = pluginkrsVersion.split('.');
		var currentkrsVersion = krs.state.version.replace(/[a-zA-Z]/g,'');
		var cvList = currentkrsVersion.split('.');
        var versionCompare = krs.versionCompare(pluginkrsVersion, currentkrsVersion);
		if (versionCompare == 0) {
        	plugin['krs_compatibility'] = krs.constants.PNC_COMPATIBLE;
    		plugin['krs_compatibility_msg'] = $.t('pnc_compatible_msg', 'Plugin compatible with krs version');
        } else {
            if (versionCompare == 1) {
				plugin['krs_compatibility'] = krs.constants.PNC_COMPATIBILITY_CLIENT_VERSION_TOO_OLD;
                plugin['krs_compatibility_msg'] = $.t('pnc_compatibility_build_for_newer_client_msg', 'Plugin build for newer client version');
			} else {
                if (pvList[0] == cvList[0] && pvList[1] == cvList[1]) {
                    plugin['krs_compatibility'] = krs.constants.PNC_COMPATIBILITY_MINOR_RELEASE_DIFF;
                    plugin['krs_compatibility_msg'] = $.t('pnc_compatibility_minor_release_diff_msg', 'Plugin build for another minor release version');
                } else {
                    plugin['krs_compatibility'] = krs.constants.PNC_COMPATIBILITY_MAJOR_RELEASE_DIFF;
                    plugin['krs_compatibility_msg'] = $.t('pnc_compatibility_minor_release_diff_msg', 'Plugin build for another major release version');
                }
            }
		}
	};

	krs.determinePluginLaunchStatus = function(pluginId) {
		var plugin = krs.plugins[pluginId];
		if (!((300 <= plugin['validity'] && plugin['validity'] < 400) || (300 <= plugin['krs_compatibility'] && plugin['validity'] < 400))) {
			if (plugin['manifest']['deactivated']) {
				plugin['launch_status'] = krs.constants.PL_DEACTIVATED;
				plugin['launch_status_msg'] = $.t('plugin_deactivated', 'Deactivated');
			} else {
				plugin['launch_status'] = krs.constants.PL_PAUSED;
				plugin['launch_status_msg'] = $.t('plugin_paused', 'Paused');
				krs.activePlugins = true;
			}
		}
	};

	krs.initializePlugins = function() {
		krs.sendRequest("getPlugins", {}, function (response) {
			if(response.plugins && response.plugins.length >= 0) {
				for (var i=0; i<response.plugins.length; i++) {
					var manifest = krs.checkForPluginManifest(response.plugins[i]);
					if (manifest) {
						krs.plugins[response.plugins[i]] = {
							'validity': krs.constants.PV_NOT_VALID,
							'validity_msg': $.t('pv_not_valid_msg', 'Plugin invalid'),
							'krs_compatibility': krs.constants.PNC_COMPATIBILITY_UNKNOWN,
							'krs_compatibility_msg': $.t('pnc_compatible_unknown_msg', 'Plugin compatibility with krs version unknown'),
							'launch_status': krs.constants.PL_HALTED,
							'launch_status_msg': $.t('plugin_halted', 'Halted'),
							'manifest': undefined
						};
						if (krs.checKPLuginValidity(response.plugins[i], manifest)) {
							krs.plugins[response.plugins[i]]['manifest'] = manifest;
							krs.checKPLuginkrsCompatibility(response.plugins[i]);
							krs.determinePluginLaunchStatus(response.plugins[i]);
						}
					}
				}
			}
            krs.initPluginWarning();
            $('#login_password').prop("disabled", false);
		});
	};

    krs.pages.plugins = function() {
        var msg;
        if (krs.numRunningPlugins == 1) {
            msg = $.t('one_plugin_active_and_running_msg');
        } else {
            msg = $.t('plugins_active_and_running_msg', {
                'num': String(krs.numRunningPlugins)
            });
        }
        $('#plugins_page_msg').html(msg);
        var pluginsDisabledWarning = $('#plugins_disabled_warning');
        if (krs.disablePluginsDuringSession) {
            pluginsDisabledWarning.html($.t('plugins_disabled_for_session_msg'));
            pluginsDisabledWarning.show();
        } else if (krs.settings["enable_plugins"] == "0") {
            pluginsDisabledWarning.html($.t('plugins_disabled_for_account_msg'));
            pluginsDisabledWarning.show();
        } else {
            pluginsDisabledWarning.hide();
        }
        krs.dataLoaded();
    };

    krs.loadPlugin = function(pluginId) {
        var plugin = krs.plugins[pluginId];
        var manifest = krs.plugins[pluginId]['manifest'];
        var pluginPath = 'plugins/' + pluginId + '/';
        async.series([
            function(callback){
                krs.asyncLoadPageHTML(pluginPath + 'html/pages/' + pluginId + '.html');
                callback(null);
            },
            function(callback){
                krs.asyncLoadPageHTML(pluginPath + 'html/modals/' + pluginId + '.html');
                callback(null);
            },
            function(callback){
                $.getScript(pluginPath + 'js/krs.' + pluginId + '.js').done(function() {
                    if (!manifest['sidebarOptOut']) {
                        var sidebarId = 'sidebar_plugins';
                        var options = {
                            "titleHTML": manifest['name'].escapeHTML(),
                            "type": 'PAGE',
                            "page": manifest['startPage']
                        };
                        krs.appendMenuItemToTSMenuItem(sidebarId, options);
                        $(".sidebar .treeview").tree();
                    }
                    var cssURL = pluginPath + 'css/' + pluginId + '.css';
                    if (document.createStyleSheet) {
                        document.createStyleSheet(cssURL);
                    } else {
                        $('<link rel="stylesheet" type="text/css" href="' + cssURL + '" />').appendTo('head');
                    }
                    plugin['launch_status'] = krs.constants.PL_RUNNING;
                    plugin['launch_status_msg'] = $.t('plugin_running', 'Running');
                    if(manifest['startPage'] && manifest['startPage'] in krs.setup) {
                        krs.setup[manifest['startPage']]();
                    }
                    krs.numRunningPlugins += 1;
                    callback(null);
                }).fail(function() {
                    plugin['launch_status'] = krs.constants.PL_HALTED;
                    plugin['launch_status_msg'] = $.t('plugin_halted', 'Halted');
                    plugin['validity'] = krs.constants.PV_INVALID_JAVASCRIPT_FILE;
                    plugin['validity_msg'] = $.t('plugin_invalid_javascript_file', 'Invalid javascript file');
                    callback(null);
                })
            }
        ])
    };

    krs.loadPlugins = function() {
        krs.logConsole("Loading Plugins");
        var sidebarId = 'sidebar_plugins';
        if ($('#' + sidebarId).length == 0) {
            var options = {
                "id": sidebarId,
                "titleHTML": '<i class="fa fa-plug"></i> <span data-i18n="plugins">Plugins</span>',
                "page": 'plugins',
                "desiredPosition": 110,
                "depends": { apis: [ krs.constants.REQUEST_TYPES.getPlugins ] }
            };
            krs.addTreeviewSidebarMenuItem(options);
        }

        $.each(krs.plugins, function(pluginId, pluginDict) {
            krs.logConsole("Iterating over plugins");
            if ((krs.settings["enable_plugins"] == "0" || krs.disablePluginsDuringSession) && pluginDict['launch_status'] == krs.constants.PL_PAUSED) {
                pluginDict['launch_status'] = krs.constants.PL_DEACTIVATED;
                pluginDict['launch_status_msg'] = $.t('plugin_deactivated', 'Deactivated');
            }
            if (pluginDict['launch_status'] == krs.constants.PL_PAUSED) {
                krs.loadPlugin(pluginId);
            }
        });
        var growlOptions = {
            type: "warning",
            position: {
                from: "bottom",
                align: "right"
            },
            offset: 20,
            offsetRight: 20
        };
        if (!krs.disablePluginsDuringSession && !krs.settings["enable_plugins"] == "0" && krs.numRunningPlugins > 0) {
            var msg;
            if (krs.numRunningPlugins == 1) {
                msg = $.t('one_plugin_active_and_running_msg');
            } else {
                msg = $.t('plugins_active_and_running_msg', {
                    'num': String(krs.numRunningPlugins)
                });
            }
            $.growl(msg, growlOptions);
        }

        krs.loadPageHTMLTemplates();
        krs.loadModalHTMLTemplates();
        krs.logConsole("Plugins loaded");
    };

    krs.getPluginRowHTML = function(pluginId) {
        var plugin = krs.plugins[pluginId];
        var manifest = plugin['manifest'];

        var html = "";
        html += "<tr>";
        var nameHTML;
        if (manifest) {
            nameHTML = String(manifest['name']).escapeHTML();
        } else {
            nameHTML = String(pluginId).escapeHTML();
        }
        html += "<td>" + nameHTML + "</td>";
        html += "<td>" + ((manifest) ? String(manifest['myVersion']).escapeHTML() : "&nbsp;") + "</td>";

        var websiteHTML = "&nbsp;";
        if (manifest) {
            var uri = encodeURI(String(manifest['infoUrl']));
            websiteHTML = "<a href='" + uri + "' target='_blank'><span>" + $.t('website') + "</span></a>";
        }
        html += "<td>" + websiteHTML + "</td>";

        var validityPopoverHTML = "data-content='" + plugin['validity_msg'].escapeHTML() + "' data-placement='top'";
        var validityText;
        var validityHTML;
        if (100 <= plugin['validity'] && plugin['validity'] < 200) {
            validityText = $.t('valid', 'Valid');
            validityHTML = "<span class='label label-success show_popover' " + validityPopoverHTML + " style='display:inline-block;min-width:85px;'>";
            validityHTML += validityText + " <i class='fa fa-check'></i></span>";
        } else {
            validityText = $.t('invalid', 'Invalid');
            validityHTML = "<span class='label label-danger show_popover' " + validityPopoverHTML + " style='display:inline-block;min-width:85px;'>";
            validityHTML += validityText + " <i class='fa fa-times-circle'></i></span>";
        }
        html += "<td style='text-align:center;'>" + validityHTML + "</td>";

        var compatibilityHTML;
        if (manifest) {
            var compatibilityPopoverHTML = "data-content='" + plugin['krs_compatibility_msg'].escapeHTML() + "' data-placement='top'";
            var compatibilityText = manifest['krsVersion'].escapeHTML();
            if (100 <= plugin['krs_compatibility'] && plugin['krs_compatibility'] < 200) {
                compatibilityHTML = "<span class='label label-success show_popover' " + compatibilityPopoverHTML + " style='display:inline-block;min-width:70px;'>";
                compatibilityHTML += compatibilityText + "</span>";
            } else if (200 <= plugin['krs_compatibility'] && plugin['krs_compatibility'] < 300) {
                compatibilityHTML = "<span class='label label-warning show_popover' " + compatibilityPopoverHTML + " style='display:inline-block;min-width:70px;'>";
                compatibilityHTML += compatibilityText + "</span>";
            } else {
                compatibilityHTML = "<span class='label label-danger show_popover' " + compatibilityPopoverHTML + " style='display:inline-block;min-width:70px;'>";
                compatibilityHTML += compatibilityText + "</span>";
            }
        } else {
            compatibilityHTML = "&nbsp;";
        }
        html += "<td style='text-align:center;'>" + compatibilityHTML + "</td>";

        var launchStatusText = plugin['launch_status_msg'].escapeHTML();
        var launchStatusType = "default";
        if (plugin['launch_status'] == krs.constants.PL_RUNNING) {
            launchStatusType = "success";
        }
        if (plugin['launch_status'] == krs.constants.PL_PAUSED || plugin['launch_status'] == krs.constants.PL_DEACTIVATED) {
            launchStatusType = "warning";
        }
        if (plugin['launch_status'] == krs.constants.PL_HALTED) {
            launchStatusType = "danger";
        }
        html += "<td style='text-align:center;'><span class='label label-" + launchStatusType + "' style='display:inline-block;min-width:95px;'>";
        html += launchStatusText + "</span></td>";

        html += "</tr>";

        return html;
    };

    krs.pages.plugins_overview = function() {
        var rows = "";
        
        $.each(krs.plugins, function(pluginId) {
            rows += krs.getPluginRowHTML(pluginId);
        });
        krs.dataLoaded(rows);
    };


	return krs;
}(krs || {}, jQuery));